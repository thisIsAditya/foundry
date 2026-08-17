import type { AnswerClarificationInput, CreateProjectInput } from '@foundry/api-contracts';
import {
  diagnoseClarification,
  resolveWorkspaceModel,
  type ProviderSecrets,
  type SecretBox,
  type StreamBus,
} from '@foundry/agent-runtime';
import { limits } from '@foundry/config/limits';
import {
  countStaleArtifactVersions,
  getCurrentMoneyRules,
  getProjectById,
  insertProject,
  listApprovalRequestsByProjectId,
  listInterviewsByProjectId,
  listPackRevisionsByProjectId,
  listProjectsByWorkspaceId,
  listProviderConnectionsByWorkspaceId,
  listSprintsByProjectId,
  updatePackRevisionProposedChanges,
  withWorkspaceScope,
  type PoolSql,
} from '@foundry/db';
import {
  type PackRevisionId,
  type Project,
  type SprintId,
  type SprintStatus,
  type UserId,
  type WorkspaceId,
  type WorkspaceMembership,
} from '@foundry/domain';
import { AppError } from '@foundry/observability';
import { evaluateGateA, PolicyService } from '@foundry/policy';
import type { LanguageModel } from 'ai';
import { randomUUID } from 'node:crypto';
import superjson from 'superjson';
import { z } from 'zod';

import { withIdempotency, type CoordinationStore } from '../coordination';
import { ensurePackRevision, loadPackSnapshot, readClarifications } from './pack-snapshot';
import { hashContract } from './sprint-service';

const AnswerResultSchema = z.object({
  runId: z.string().min(1),
  text: z.string(),
});

export type ProjectRuntimeDeps = {
  streamBus: StreamBus;
  secretBox: SecretBox;
  secrets: ProviderSecrets;
  languageModel?: LanguageModel;
};

export class ProjectService {
  constructor(
    private readonly sql: PoolSql,
    private readonly coordination: CoordinationStore,
    private readonly policyService: PolicyService,
    private readonly runtime: ProjectRuntimeDeps,
  ) {}

  async create(
    actor: { userId: UserId; membership: WorkspaceMembership },
    input: CreateProjectInput,
  ): Promise<Project> {
    if (!this.policyService.can(actor.membership, 'project.create')) {
      throw new AppError({
        code: 'policy_forbidden',
        explanation: 'Your role cannot create projects in this workspace.',
        nextAction: 'Ask a workspace admin to change your role.',
      });
    }

    const key = `idem:${actor.userId}:project.create:${input.idempotencyKey}`;
    return withIdempotency(
      this.coordination,
      key,
      limits.idempotencyKeyTtlSeconds,
      (raw) => superjson.parse(raw) as Project,
      (value) => superjson.stringify(value),
      async () => {
        return withWorkspaceScope(this.sql, [input.workspaceId], async (tx) => {
          const created = await insertProject(tx, {
            workspaceId: input.workspaceId,
            name: input.name,
            ...(input.geography === undefined ? {} : { geography: input.geography }),
            ...(input.objective === undefined ? {} : { founderObjective: input.objective }),
          });
          await ensurePackRevision(tx, created, actor.userId);
          const reloaded = await getProjectById(tx, created.id);
          if (reloaded === null) {
            throw new Error('project disappeared after create');
          }
          return reloaded;
        });
      },
    );
  }

  async list(membership: WorkspaceMembership, workspaceId: WorkspaceId): Promise<Project[]> {
    if (!this.policyService.can(membership, 'project.list')) {
      throw new AppError({
        code: 'policy_forbidden',
        explanation: 'Your role cannot list projects in this workspace.',
        nextAction: 'Ask a workspace admin to change your role.',
      });
    }
    return withWorkspaceScope(this.sql, [workspaceId], async (tx) =>
      listProjectsByWorkspaceId(tx, workspaceId),
    );
  }

  async getDeskSummary(actor: { membership: WorkspaceMembership; project: Project }): Promise<{
    project: Project;
    packRevisionId: Project['currentPackRevisionId'];
    phase: Project['currentPhase'];
    interviewCount: number;
    staleArtifactCount: number;
    moneyRulesSet: boolean;
    nextAction: string;
    gateA: {
      qualifyingInterviews: number;
      requiredInterviews: number;
      passed: boolean;
      checks: { id: string; passed: boolean; detail: string }[];
    };
    beachhead: { id: string; segmentDefinition: string } | null;
    dmu: { id: string; buyer: string | null } | null;
    currentSprint: { id: SprintId; status: SprintStatus; contractHash: string } | null;
    pendingPackRevisionId: PackRevisionId | null;
  }> {
    if (!this.policyService.can(actor.membership, 'project.list')) {
      throw new AppError({
        code: 'policy_forbidden',
        explanation: 'Your role cannot read the founder desk.',
        nextAction: 'Ask a workspace admin to change your role.',
      });
    }
    return withWorkspaceScope(this.sql, [actor.project.workspaceId], async (tx) => {
      const [interviews, moneyRules, staleArtifactCount, pendingApprovals, sprints, packRevisions] =
        await Promise.all([
          listInterviewsByProjectId(tx, actor.project.id),
          getCurrentMoneyRules(tx, actor.project.id),
          countStaleArtifactVersions(tx, actor.project.id),
          listApprovalRequestsByProjectId(tx, actor.project.id, 'pending'),
          listSprintsByProjectId(tx, actor.project.id),
          listPackRevisionsByProjectId(tx, actor.project.id),
        ]);
      const moneyRulesSet = moneyRules !== null;
      const latestSprint = sprints[0] ?? null;
      const currentSprint =
        latestSprint === null
          ? null
          : {
              id: latestSprint.id,
              status: latestSprint.status,
              contractHash: hashContract(latestSprint.contract),
            };
      const pendingRevision = packRevisions
        .filter(
          (revision) =>
            revision.status === 'draft' &&
            revision.parentRevisionId === actor.project.currentPackRevisionId,
        )
        .sort((a, b) => b.revisionNumber - a.revisionNumber)[0];
      const pendingPackRevisionId = pendingRevision?.id ?? null;
      const snapshot =
        actor.project.currentPackRevisionId === null
          ? null
          : await loadPackSnapshot(tx, actor.project);
      const gateAEvaluation =
        snapshot === null
          ? null
          : evaluateGateA({
              interviews: snapshot.interviews,
              quotes: snapshot.quotes,
              beachheads: snapshot.beachheads,
              dmus: snapshot.dmus,
            });
      const gateA = {
        qualifyingInterviews: gateAEvaluation?.countedInterviewIds.length ?? 0,
        requiredInterviews: limits.gateA.minNonFriendInterviews,
        passed: gateAEvaluation?.result === 'passed',
        checks: gateAEvaluation?.checks ?? [],
      };
      const latestBeachhead = snapshot?.beachheads[snapshot.beachheads.length - 1] ?? null;
      const beachhead =
        latestBeachhead === null
          ? null
          : { id: latestBeachhead.id, segmentDefinition: latestBeachhead.segmentDefinition };
      const linkedDmu =
        latestBeachhead === null
          ? null
          : (snapshot?.dmus.find((item) => item.beachheadId === latestBeachhead.id) ?? null);
      const dmu = linkedDmu === null ? null : { id: linkedDmu.id, buyer: linkedDmu.buyer };
      let nextAction = 'Review the pack and continue the current phase.';
      if (pendingApprovals.length > 0) {
        nextAction = 'Review pending approvals.';
      } else if (actor.project.currentPhase === 'product') {
        nextAction = 'Scope the MVBP with a payment path and kill lines.';
      } else if (actor.project.currentPhase === 'build_and_launch') {
        nextAction = 'Complete the launch checklist and keep side effects approval-gated.';
      } else if (actor.project.currentPhase === 'operate') {
        nextAction = 'Record plan-versus-actual metrics and evaluate Gate C.';
      } else if (!moneyRulesSet) {
        nextAction = 'Set canonical MoneyRules.';
      } else if (!gateA.passed) {
        nextAction = 'Capture interview evidence.';
      } else if (staleArtifactCount > 0) {
        nextAction = 'Regenerate stale artifacts.';
      }
      return {
        project: actor.project,
        packRevisionId: actor.project.currentPackRevisionId,
        phase: actor.project.currentPhase,
        interviewCount: interviews.length,
        staleArtifactCount,
        moneyRulesSet,
        nextAction,
        gateA,
        beachhead,
        dmu,
        currentSprint,
        pendingPackRevisionId,
      };
    });
  }

  async answerClarification(
    actor: { userId: UserId; membership: WorkspaceMembership; project: Project },
    input: AnswerClarificationInput,
    correlationId: string,
  ): Promise<{ runId: string; text: string }> {
    if (!this.policyService.can(actor.membership, 'project.answer')) {
      throw new AppError({
        code: 'policy_forbidden',
        explanation: 'Your role cannot answer clarifications on this project.',
        nextAction: 'Ask a workspace admin to change your role.',
      });
    }

    const key = `idem:${actor.userId}:project.answerClarification:${input.idempotencyKey}`;
    return withIdempotency(
      this.coordination,
      key,
      limits.idempotencyKeyTtlSeconds,
      (raw) => AnswerResultSchema.parse(superjson.parse(raw)),
      (value) => superjson.stringify(value),
      async () => {
        const runId = randomUUID();
        const snapshot = await withWorkspaceScope(
          this.sql,
          [actor.project.workspaceId],
          async (tx) => {
            const pack = await ensurePackRevision(tx, actor.project, actor.userId);
            const clarifications = [
              ...readClarifications(pack.proposedChanges),
              {
                questionId: input.questionId,
                answer: input.answer,
                answeredAt: new Date().toISOString(),
              },
            ];
            await updatePackRevisionProposedChanges(tx, pack.id, { clarifications });
            const project = await getProjectById(tx, actor.project.id);
            if (project === null) {
              throw new AppError({
                code: 'not_found',
                explanation: 'Project not found.',
                nextAction: 'Reload the desk and retry.',
                correlationId,
              });
            }
            return loadPackSnapshot(tx, project);
          },
          actor.userId,
        );

        const resolved = await this.resolveModel(actor.project.workspaceId);
        // Local models (e.g. Ollama) load and generate far slower than a hosted API,
        // so give them a much longer budget before the abort signal fires.
        const timeoutMs =
          resolved.providerFamily === 'ollama'
            ? limits.interactive.diagnoseTimeoutMsLocal
            : limits.interactive.diagnoseTimeoutMs;
        const diagnosed = await diagnoseClarification({
          runId,
          questionId: input.questionId,
          answer: input.answer,
          snapshot,
          model: resolved.model,
          timeoutMs,
          publish: async (event) => {
            await this.runtime.streamBus.publish(actor.project.id, event);
          },
        });
        return { runId, text: diagnosed.text };
      },
    );
  }

  private async resolveModel(
    workspaceId: WorkspaceId,
  ): Promise<{ model: LanguageModel; providerFamily: string | null }> {
    if (this.runtime.languageModel !== undefined) {
      return { model: this.runtime.languageModel, providerFamily: null };
    }
    const connections = await withWorkspaceScope(this.sql, [workspaceId], async (tx) =>
      listProviderConnectionsByWorkspaceId(tx, workspaceId),
    );
    const resolved = await resolveWorkspaceModel({
      connections,
      secrets: this.runtime.secrets,
      secretBox: this.runtime.secretBox,
    });
    return { model: resolved.model, providerFamily: resolved.connection.providerFamily };
  }
}
