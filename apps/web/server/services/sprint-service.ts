import type { PreviewSprintInput } from '@foundry/api-contracts';
import { buildSprintContract, type StreamBus } from '@foundry/agent-runtime';
import { limits } from '@foundry/config/limits';
import {
  getProjectById,
  getSprintById,
  insertSprint,
  listSprintProgressEvents,
  updateSprintStatus,
  withWorkspaceScope,
  type PoolSql,
  type SprintProgressEvent,
} from '@foundry/db';
import type { Project, Sprint, SprintId, UserId, WorkspaceMembership } from '@foundry/domain';
import { SprintIdSchema } from '@foundry/domain';
import { AppError } from '@foundry/observability';
import { PolicyService } from '@foundry/policy';
import { createHash, randomUUID } from 'node:crypto';
import superjson from 'superjson';

import { withIdempotency, type CoordinationStore } from '../coordination';
import type { JobQueue } from '../queue/job-queue';
import { ensurePackRevision, loadPackSnapshot } from './pack-snapshot';

export function hashContract(contract: Sprint['contract']): string {
  return createHash('sha256').update(JSON.stringify(contract)).digest('hex');
}

export class SprintService {
  constructor(
    private readonly sql: PoolSql,
    private readonly coordination: CoordinationStore,
    private readonly policyService: PolicyService,
    private readonly jobQueue: JobQueue,
    private readonly streamBus: StreamBus,
  ) {}

  async preview(
    actor: { userId: UserId; membership: WorkspaceMembership; project: Project },
    input: PreviewSprintInput,
  ): Promise<{ sprint: Sprint; contractHash: string }> {
    if (!this.policyService.can(actor.membership, 'sprint.run')) {
      throw new AppError({
        code: 'policy_forbidden',
        explanation: 'Your role cannot preview sprints.',
        nextAction: 'Ask a workspace admin to change your role.',
      });
    }
    const key = `idem:${actor.userId}:sprint.preview:${input.idempotencyKey}`;
    return withIdempotency(
      this.coordination,
      key,
      limits.idempotencyKeyTtlSeconds,
      (raw) => superjson.parse(raw) as { sprint: Sprint; contractHash: string },
      (value) => superjson.stringify(value),
      async () => {
        return withWorkspaceScope(this.sql, [actor.project.workspaceId], async (tx) => {
          const pack = await ensurePackRevision(tx, actor.project, actor.userId);
          const project = await getProjectById(tx, actor.project.id);
          if (project === null) {
            throw new AppError({
              code: 'not_found',
              explanation: 'Project not found.',
              nextAction: 'Reload and retry.',
            });
          }
          const snapshot = await loadPackSnapshot(tx, {
            ...project,
            currentPackRevisionId: pack.id,
          });
          const sprintId = SprintIdSchema.parse(randomUUID());
          const created = await insertSprint(tx, {
            id: sprintId,
            projectId: project.id,
            status: 'draft',
            contract: buildSprintContract({
              sprintId,
              packRevisionId: pack.id,
              phase: project.currentPhase,
              objective: input.objectiveHint ?? 'Diagnose the problem and collect Gate A evidence.',
              snapshot,
            }),
          });
          return { sprint: created, contractHash: hashContract(created.contract) };
        });
      },
    );
  }

  async approvePlan(
    actor: { userId: UserId; membership: WorkspaceMembership },
    sprintId: SprintId,
    expectedContractHash: string,
    correlationId: string,
  ): Promise<Sprint> {
    if (!this.policyService.can(actor.membership, 'sprint.run')) {
      throw new AppError({
        code: 'policy_forbidden',
        explanation: 'Your role cannot approve a sprint plan.',
        nextAction: 'Ask a workspace admin to change your role.',
      });
    }
    const key = `idem:${actor.userId}:sprint.approvePlan:${sprintId}:${expectedContractHash}`;
    return withIdempotency(
      this.coordination,
      key,
      limits.idempotencyKeyTtlSeconds,
      (raw) => superjson.parse(raw) as Sprint,
      (value) => superjson.stringify(value),
      async () => {
        const sprint = await withWorkspaceScope(
          this.sql,
          [actor.membership.workspaceId],
          async (tx) => getSprintById(tx, sprintId),
        );
        if (sprint === null) {
          throw new AppError({
            code: 'not_found',
            explanation: 'Sprint not found.',
            nextAction: 'Preview a sprint first.',
          });
        }
        if (hashContract(sprint.contract) !== expectedContractHash) {
          throw new AppError({
            code: 'stale_revision',
            explanation: 'The sprint contract changed since you reviewed it.',
            nextAction: 'Preview the sprint again and approve the new plan.',
          });
        }
        const contracted = await withWorkspaceScope(
          this.sql,
          [actor.membership.workspaceId],
          async (tx) => updateSprintStatus(tx, sprint.id, 'contracted'),
        );
        await this.jobQueue.enqueueSprint({
          sprintId: contracted.id,
          projectId: contracted.projectId,
          workspaceId: actor.membership.workspaceId,
          packRevisionId: contracted.contract.packRevisionId,
          correlationId,
          attempt: 0,
        });
        await this.streamBus.publish(contracted.projectId, {
          type: 'sprint_progress',
          sprintId: contracted.id,
          progress: { stage: 'queued' },
        });
        return contracted;
      },
    );
  }

  async getContract(
    membership: WorkspaceMembership,
    sprintId: SprintId,
  ): Promise<{ sprint: Sprint; contractHash: string }> {
    if (!this.policyService.can(membership, 'sprint.read')) {
      throw new AppError({
        code: 'policy_forbidden',
        explanation: 'Your role cannot read sprints.',
        nextAction: 'Ask a workspace admin to change your role.',
      });
    }
    const sprint = await withWorkspaceScope(this.sql, [membership.workspaceId], async (tx) =>
      getSprintById(tx, sprintId),
    );
    if (sprint === null) {
      throw new AppError({
        code: 'not_found',
        explanation: 'Sprint not found.',
        nextAction: 'Pick a sprint you have access to.',
      });
    }
    return { sprint, contractHash: hashContract(sprint.contract) };
  }

  async getActivity(
    membership: WorkspaceMembership,
    sprintId: SprintId,
    cursor = 0,
  ): Promise<SprintProgressEvent[]> {
    if (!this.policyService.can(membership, 'sprint.read')) {
      throw new AppError({
        code: 'policy_forbidden',
        explanation: 'Your role cannot read sprint activity.',
        nextAction: 'Ask a workspace admin to change your role.',
      });
    }
    return withWorkspaceScope(this.sql, [membership.workspaceId], async (tx) => {
      const sprint = await getSprintById(tx, sprintId);
      if (sprint === null) {
        throw new AppError({
          code: 'not_found',
          explanation: 'Sprint not found.',
          nextAction: 'Pick a sprint you have access to.',
        });
      }
      return listSprintProgressEvents(tx, sprintId, cursor);
    });
  }
}
