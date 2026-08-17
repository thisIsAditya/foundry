import type { JobBoardView, UpdateJobSettingsInput } from '@foundry/api-contracts';
import { toAiJobSummary, type AiJobSummary } from '@foundry/api-contracts';
import { limits } from '@foundry/config/limits';
import {
  getSprintById,
  listResearchFindingsByJobId,
  listSprintsByProjectId,
  updateSprintContract,
  withWorkspaceScope,
  type PoolSql,
} from '@foundry/db';
import {
  toProductJobStatus,
  type Project,
  type Sprint,
  type UserId,
  type WorkspaceMembership,
} from '@foundry/domain';
import { AppError } from '@foundry/observability';
import { PolicyService } from '@foundry/policy';
import { TOOL_RISK_CLASSES } from '@foundry/tools';
import superjson from 'superjson';

import { withIdempotency, type CoordinationStore } from '../coordination';
import { hashContract, type SprintService } from './sprint-service';

export class JobService {
  constructor(
    private readonly sql: PoolSql,
    private readonly coordination: CoordinationStore,
    private readonly policyService: PolicyService,
    private readonly sprintService: SprintService,
  ) {}

  async list(
    actor: { membership: WorkspaceMembership; project: Project },
    view: JobBoardView,
  ): Promise<AiJobSummary[]> {
    if (!this.policyService.can(actor.membership, 'sprint.read')) {
      throw new AppError({
        code: 'policy_forbidden',
        explanation: 'Your role cannot list jobs.',
        nextAction: 'Ask a workspace admin to change your role.',
      });
    }
    const sprints = await withWorkspaceScope(this.sql, [actor.project.workspaceId], async (tx) =>
      listSprintsByProjectId(tx, actor.project.id),
    );
    return sprints
      .filter((sprint) => matchesView(sprint, view))
      .map((sprint) => toAiJobSummary({ sprint }));
  }

  async get(
    actor: { membership: WorkspaceMembership; project: Project },
    jobId: Sprint['id'],
  ): Promise<AiJobSummary> {
    const sprint = await this.requireSprint(actor, jobId);
    const citationCount = await withWorkspaceScope(
      this.sql,
      [actor.project.workspaceId],
      async (tx) => {
        const findings = await listResearchFindingsByJobId(tx, sprint.id);
        return findings.reduce((sum, item) => sum + item.citationIds.length, 0);
      },
    );
    return toAiJobSummary({ sprint, citationCount });
  }

  async updateSettings(
    actor: { userId: UserId; membership: WorkspaceMembership; project: Project },
    input: UpdateJobSettingsInput,
  ): Promise<Sprint> {
    const key = `idem:${actor.userId}:job.updateSettings:${input.idempotencyKey}`;
    return withIdempotency(
      this.coordination,
      key,
      limits.idempotencyKeyTtlSeconds,
      (raw) => superjson.parse(raw) as Sprint,
      (value) => superjson.stringify(value),
      async () => {
        const sprint = await this.requireSprint(actor, input.jobId);
        if (hashContract(sprint.contract) !== input.expectedVersion) {
          throw new AppError({
            code: 'stale_revision',
            explanation: 'The job contract changed since you opened settings.',
            nextAction: 'Reload the job and save again.',
          });
        }
        const nextAllowlist =
          input.patch.toolAllowlist === undefined
            ? sprint.contract.toolAllowlist
            : Object.keys(
                this.policyService.filterTools(
                  Object.fromEntries(input.patch.toolAllowlist.map((name) => [name, true])),
                  TOOL_RISK_CLASSES,
                  {
                    allowlist: input.patch.toolAllowlist,
                    maxRiskClass: sprint.contract.riskPolicy,
                  },
                ),
              );
        const next = {
          ...sprint.contract,
          toolAllowlist: nextAllowlist,
          ...(input.patch.maxWorkers === undefined ? {} : { maxWorkers: input.patch.maxWorkers }),
          ...(input.patch.maxStalls === undefined ? {} : { maxStalls: input.patch.maxStalls }),
          ...(input.patch.roleLabel === undefined ? {} : { roleLabel: input.patch.roleLabel }),
          ...(input.patch.whyNow === undefined ? {} : { whyNow: input.patch.whyNow }),
        };
        return withWorkspaceScope(this.sql, [actor.project.workspaceId], async (tx) =>
          updateSprintContract(tx, sprint.id, next, sprint.status),
        );
      },
    );
  }

  async retry(
    actor: { userId: UserId; membership: WorkspaceMembership; project: Project },
    jobId: Sprint['id'],
    idempotencyKey: string,
  ): Promise<Sprint> {
    await this.requireSprint(actor, jobId);
    return this.sprintService.control(
      { userId: actor.userId, membership: actor.membership },
      jobId,
      'running',
      idempotencyKey,
    );
  }

  private async requireSprint(
    actor: { membership: WorkspaceMembership; project: Project },
    jobId: Sprint['id'],
  ): Promise<Sprint> {
    if (!this.policyService.can(actor.membership, 'sprint.read')) {
      throw new AppError({
        code: 'policy_forbidden',
        explanation: 'Your role cannot read jobs.',
        nextAction: 'Ask a workspace admin to change your role.',
      });
    }
    const sprint = await withWorkspaceScope(this.sql, [actor.project.workspaceId], async (tx) =>
      getSprintById(tx, jobId),
    );
    if (sprint === null || sprint.projectId !== actor.project.id) {
      throw new AppError({
        code: 'not_found',
        explanation: 'Job not found.',
        nextAction: 'Pick a job on this project.',
      });
    }
    return sprint;
  }
}

function matchesView(sprint: Sprint, view: JobBoardView): boolean {
  const product = toProductJobStatus(sprint.status);
  switch (view) {
    case 'kanban':
    case 'timeline':
    case 'cost':
      return true;
    case 'mine':
      return sprint.owner === 'founder' || product === 'needs_founder' || product === 'proposed';
    case 'completed':
      return product === 'complete' || product === 'canceled';
    case 'blocked':
      return product === 'blocked' || product === 'failed';
    case 'needs_me':
      return product === 'needs_founder' || product === 'proposed' || product === 'needs_approval';
    case 'running':
      return product === 'running' || product === 'queued';
    case 'waiting_for_research':
      return sprint.jobKind === 'research' && product !== 'complete' && product !== 'canceled';
    case 'needs_review':
      return product === 'needs_approval' || product === 'proposed';
  }
}
