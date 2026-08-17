import type { AnswerClarificationInput, CreateProjectInput } from '@foundry/api-contracts';
import {
  buildModel,
  diagnoseClarification,
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
  listInterviewsByProjectId,
  listProjectsByWorkspaceId,
  listProviderConnectionsByWorkspaceId,
  updatePackRevisionProposedChanges,
  withWorkspaceScope,
  type PoolSql,
} from '@foundry/db';
import {
  type Project,
  type UserId,
  type WorkspaceId,
  type WorkspaceMembership,
} from '@foundry/domain';
import { AppError } from '@foundry/observability';
import { PolicyService } from '@foundry/policy';
import type { LanguageModel } from 'ai';
import { randomUUID } from 'node:crypto';
import superjson from 'superjson';
import { z } from 'zod';

import { withIdempotency, type CoordinationStore } from '../coordination';
import { ensurePackRevision, loadPackSnapshot, readClarifications } from './pack-snapshot';

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
  }> {
    if (!this.policyService.can(actor.membership, 'project.list')) {
      throw new AppError({
        code: 'policy_forbidden',
        explanation: 'Your role cannot read the founder desk.',
        nextAction: 'Ask a workspace admin to change your role.',
      });
    }
    return withWorkspaceScope(this.sql, [actor.project.workspaceId], async (tx) => {
      const [interviews, moneyRules, staleArtifactCount] = await Promise.all([
        listInterviewsByProjectId(tx, actor.project.id),
        getCurrentMoneyRules(tx, actor.project.id),
        countStaleArtifactVersions(tx, actor.project.id),
      ]);
      const moneyRulesSet = moneyRules !== null;
      let nextAction = 'Review the pack and continue the current phase.';
      if (!moneyRulesSet) {
        nextAction = 'Set canonical MoneyRules.';
      } else if (interviews.length === 0) {
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

        const model = await this.resolveModel(actor.project.workspaceId);
        const diagnosed = await diagnoseClarification({
          runId,
          questionId: input.questionId,
          answer: input.answer,
          snapshot,
          model,
          publish: async (event) => {
            await this.runtime.streamBus.publish(actor.project.id, event);
          },
        });
        return { runId, text: diagnosed.text };
      },
    );
  }

  private async resolveModel(workspaceId: WorkspaceId): Promise<LanguageModel> {
    if (this.runtime.languageModel !== undefined) {
      return this.runtime.languageModel;
    }
    const connections = await withWorkspaceScope(this.sql, [workspaceId], async (tx) =>
      listProviderConnectionsByWorkspaceId(tx, workspaceId),
    );
    const connection = connections.find((item) => item.healthStatus === 'ok') ?? connections[0];
    if (connection === undefined) {
      throw new AppError({
        code: 'provider_unavailable',
        explanation: 'No model provider is connected for this workspace.',
        nextAction: 'Connect Anthropic (or another provider) in workspace settings.',
      });
    }
    const allowed = connection.allowedModels;
    const modelId =
      Array.isArray(allowed) && typeof allowed[0] === 'string'
        ? allowed[0]
        : limits.provider.defaultAnthropicModel;
    const built = await buildModel(
      connection,
      modelId,
      this.runtime.secrets,
      this.runtime.secretBox,
    );
    return built.model;
  }
}
