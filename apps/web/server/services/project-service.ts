import type { CreateProjectInput, OverviewSummary } from '@foundry/api-contracts';
import { toAiJobSummary } from '@foundry/api-contracts';
import { limits } from '@foundry/config/limits';
import {
  countStaleArtifactVersions,
  getCurrentMoneyRules,
  getEvidenceItemById,
  getLatestPlanScoreByPackRevisionId,
  getProjectById,
  insertProject,
  listApprovalRequestsByProjectId,
  listAssumptionsByProjectId,
  listConversationMessagesPage,
  listFounderTasksByProjectId,
  listInterviewsByProjectId,
  listPackRevisionsByProjectId,
  listProjectsByWorkspaceId,
  listSprintsByProjectId,
  updateEvidenceItemProjectId,
  withWorkspaceScope,
  type PoolSql,
} from '@foundry/db';
import {
  deriveJourneyPhase,
  type JourneyPhase,
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
import superjson from 'superjson';

import { withIdempotency, type CoordinationStore } from '../coordination';
import type { InitialDraftService } from './initial-draft-service';
import { ensurePackRevision, loadPackSnapshot } from './pack-snapshot';
import type { PlanSectionAggregatorService } from './plan-section-aggregator';
import { hashContract } from './sprint-service';

export type ProjectRuntimeDeps = {
  initialDraftService?: InitialDraftService;
  planSectionAggregator?: PlanSectionAggregatorService;
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
        const createdProject = await withWorkspaceScope(
          this.sql,
          [input.workspaceId],
          async (tx) => {
            const created = await insertProject(tx, {
              workspaceId: input.workspaceId,
              name: input.name,
              ...(input.geography === undefined ? {} : { geography: input.geography }),
              ...(input.objective === undefined ? {} : { founderObjective: input.objective }),
            });
            await ensurePackRevision(tx, created, actor.userId);
            for (const evidenceId of input.attachmentIds ?? []) {
              const existing = await getEvidenceItemById(tx, evidenceId);
              if (existing === null) {
                continue;
              }
              const owner = await getProjectById(tx, existing.projectId);
              if (owner === null || owner.workspaceId !== created.workspaceId) {
                continue;
              }
              await updateEvidenceItemProjectId(tx, evidenceId, created.id);
            }
            const reloaded = await getProjectById(tx, created.id);
            if (reloaded === null) {
              throw new Error('project disappeared after create');
            }
            return reloaded;
          },
        );
        try {
          await this.runtime.initialDraftService?.generate({
            userId: actor.userId,
            membership: actor.membership,
            project: createdProject,
            ...(input.founderPitch === undefined ? {} : { founderPitch: input.founderPitch }),
          });
        } catch {
          return createdProject;
        }
        const refreshed = await withWorkspaceScope(this.sql, [input.workspaceId], async (tx) =>
          getProjectById(tx, createdProject.id),
        );
        return refreshed ?? createdProject;
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
    derivedPhase: JourneyPhase;
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
    overview: OverviewSummary;
  }> {
    if (!this.policyService.can(actor.membership, 'project.list')) {
      throw new AppError({
        code: 'policy_forbidden',
        explanation: 'Your role cannot read the founder desk.',
        nextAction: 'Ask a workspace admin to change your role.',
      });
    }
    const sectionCardsPromise =
      this.runtime.planSectionAggregator?.listAll(actor) ?? Promise.resolve([]);
    return withWorkspaceScope(this.sql, [actor.project.workspaceId], async (tx) => {
      const [
        interviews,
        moneyRules,
        staleArtifactCount,
        pendingApprovals,
        sprints,
        packRevisions,
        founderTasks,
        recentMessages,
        assumptions,
        planScore,
      ] = await Promise.all([
        listInterviewsByProjectId(tx, actor.project.id),
        getCurrentMoneyRules(tx, actor.project.id),
        countStaleArtifactVersions(tx, actor.project.id),
        listApprovalRequestsByProjectId(tx, actor.project.id, 'pending'),
        listSprintsByProjectId(tx, actor.project.id),
        listPackRevisionsByProjectId(tx, actor.project.id),
        listFounderTasksByProjectId(tx, actor.project.id),
        listConversationMessagesPage(tx, actor.project.id, { limit: 20 }),
        listAssumptionsByProjectId(tx, actor.project.id),
        actor.project.currentPackRevisionId === null
          ? Promise.resolve(null)
          : getLatestPlanScoreByPackRevisionId(tx, actor.project.currentPackRevisionId),
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
      const jobSummaries = sprints.map((sprint) => toAiJobSummary({ sprint }));
      const proposedResearchJob =
        jobSummaries.find(
          (job) =>
            job.jobKind === 'research' && (job.status === 'proposed' || job.status === 'queued'),
        ) ?? null;
      const overview: OverviewSummary = {
        overallScore: planScore?.overall ?? null,
        dimensions: planScore?.dimensions ?? null,
        topAssumptions: assumptions
          .filter((item) => item.status === 'untested')
          .slice(0, 3)
          .map((item) => item.statement),
        proposedResearchJob,
        runningAiWork: jobSummaries.filter(
          (job) => job.status === 'running' || job.status === 'queued',
        ),
        waitingFounderTasks: founderTasks.filter(
          (item) => item.status === 'proposed' || item.status === 'active',
        ).length,
        revisionPendingReview: pendingPackRevisionId !== null,
        latestCofounderMessage: recentMessages.find((item) => item.actor === 'co_founder') ?? null,
      };
      const sectionCards = await sectionCardsPromise;
      const derivedPhase = deriveJourneyPhase({
        sections: sectionCards.map((card) => ({ key: card.key, status: card.status })),
        score: planScore?.dimensions ?? null,
        gateA: { passed: gateA.passed },
        wtpEventCount: snapshot?.wtpEvents.length ?? 0,
      });
      return {
        project: actor.project,
        packRevisionId: actor.project.currentPackRevisionId,
        phase: actor.project.currentPhase,
        derivedPhase,
        interviewCount: interviews.length,
        staleArtifactCount,
        moneyRulesSet,
        nextAction,
        gateA,
        beachhead,
        dmu,
        currentSprint,
        pendingPackRevisionId,
        overview,
      };
    });
  }
}
