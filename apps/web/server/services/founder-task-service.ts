import type { StreamBus } from '@foundry/agent-runtime';
import { limits } from '@foundry/config/limits';
import {
  getFounderTaskById,
  insertConversationMessage,
  insertFounderTask,
  listEvidenceItemsByProjectId,
  listFounderTasksByProjectId,
  listInterviewsByProjectId,
  listWtpEventsByProjectId,
  updateFounderTaskCompletion,
  updateFounderTaskPreparation,
  updateFounderTaskStatus,
  withWorkspaceScope,
  type PoolSql,
} from '@foundry/db';
import type {
  ConversationReference,
  FounderTask,
  FounderTaskId,
  FounderTaskStatus,
  Project,
  UserId,
  WorkspaceMembership,
} from '@foundry/domain';
import { AppError } from '@foundry/observability';
import { PolicyService } from '@foundry/policy';
import superjson from 'superjson';

import { randomUUID } from 'node:crypto';

import { withIdempotency, type CoordinationStore } from '../coordination';
import type { JobQueue } from '../queue/job-queue';

export class FounderTaskService {
  constructor(
    private readonly sql: PoolSql,
    private readonly coordination: CoordinationStore,
    private readonly policyService: PolicyService,
    private readonly streamBus: StreamBus,
    private readonly jobQueue?: JobQueue,
  ) {}

  async create(
    actor: { userId: UserId; membership: WorkspaceMembership; project: Project },
    input: { title: string; explanation: string },
  ): Promise<FounderTask> {
    if (!this.policyService.can(actor.membership, 'project.answer')) {
      throw new AppError({
        code: 'policy_forbidden',
        explanation: 'Your role cannot create founder tasks.',
        nextAction: 'Ask a workspace admin to change your role.',
      });
    }
    return withWorkspaceScope(this.sql, [actor.project.workspaceId], async (tx) => {
      const created = await insertFounderTask(tx, {
        projectId: actor.project.id,
        title: input.title,
        explanation: input.explanation,
        status: 'proposed',
      });
      await this.streamBus.publish(actor.project.id, {
        type: 'founder_task_created',
        founderTaskId: created.id,
        title: created.title,
      });
      if (this.jobQueue !== undefined) {
        await this.jobQueue.enqueueNotification({
          kind: 'founder_task_due',
          projectId: actor.project.id,
          workspaceId: actor.project.workspaceId,
          correlationId: randomUUID(),
        });
      }
      return created;
    });
  }

  async list(
    actor: { membership: WorkspaceMembership; project: Project },
    status?: FounderTaskStatus,
  ): Promise<FounderTask[]> {
    if (!this.policyService.can(actor.membership, 'project.list')) {
      throw new AppError({
        code: 'policy_forbidden',
        explanation: 'Your role cannot list founder tasks.',
        nextAction: 'Ask a workspace admin to change your role.',
      });
    }
    return withWorkspaceScope(this.sql, [actor.project.workspaceId], async (tx) => {
      const tasks = await listFounderTasksByProjectId(tx, actor.project.id);
      return status === undefined ? tasks : tasks.filter((item) => item.status === status);
    });
  }

  async get(
    actor: { membership: WorkspaceMembership; project: Project },
    founderTaskId: FounderTaskId,
  ): Promise<FounderTask> {
    return this.requireTask(actor, founderTaskId);
  }

  async requestHelp(
    actor: { userId: UserId; membership: WorkspaceMembership; project: Project },
    founderTaskId: FounderTaskId,
    idempotencyKey: string,
  ): Promise<FounderTask> {
    const key = `idem:${actor.userId}:founderTask.requestHelp:${idempotencyKey}`;
    return withIdempotency(
      this.coordination,
      key,
      limits.idempotencyKeyTtlSeconds,
      (raw) => superjson.parse(raw) as FounderTask,
      (value) => superjson.stringify(value),
      async () => {
        const task = await this.requireTask(actor, founderTaskId);
        return withWorkspaceScope(this.sql, [actor.project.workspaceId], async (tx) => {
          const help = await insertConversationMessage(tx, {
            projectId: actor.project.id,
            actor: 'co_founder',
            text: `Help for "${task.title}": ${task.explanation}. Capture evidence you can attach — an interview, a willingness-to-pay signal, or an evidence item.`,
            blocks: [{ kind: 'draft_action', text: task.explanation, founderTaskId: task.id }],
            references: [{ kind: 'founder_task', id: task.id }],
          });
          return updateFounderTaskPreparation(tx, task.id, {
            ...task.preparation,
            helpMessageId: help.id,
            script: help.text,
          });
        });
      },
    );
  }

  async complete(
    actor: { userId: UserId; membership: WorkspaceMembership; project: Project },
    founderTaskId: FounderTaskId,
    evidenceRef: ConversationReference,
    idempotencyKey: string,
  ): Promise<FounderTask> {
    const key = `idem:${actor.userId}:founderTask.complete:${idempotencyKey}`;
    return withIdempotency(
      this.coordination,
      key,
      limits.idempotencyKeyTtlSeconds,
      (raw) => superjson.parse(raw) as FounderTask,
      (value) => superjson.stringify(value),
      async () => {
        await this.requireTask(actor, founderTaskId);
        if (evidenceRef.kind !== 'evidence') {
          throw new AppError({
            code: 'missing_evidence',
            explanation: 'A founder task cannot be completed without a real evidence reference.',
            nextAction: 'Attach an interview, willingness-to-pay event, or evidence item.',
          });
        }
        const exists = await withWorkspaceScope(
          this.sql,
          [actor.project.workspaceId],
          async (tx) => {
            const [interviews, wtp, items] = await Promise.all([
              listInterviewsByProjectId(tx, actor.project.id),
              listWtpEventsByProjectId(tx, actor.project.id),
              listEvidenceItemsByProjectId(tx, actor.project.id),
            ]);
            return (
              interviews.some((item) => item.id === evidenceRef.id) ||
              wtp.some((item) => item.id === evidenceRef.id) ||
              items.some((item) => item.id === evidenceRef.id)
            );
          },
        );
        if (!exists) {
          throw new AppError({
            code: 'missing_evidence',
            explanation: 'That evidence reference does not exist on this project.',
            nextAction: 'Capture the interview or signal first, then complete the task.',
          });
        }
        return withWorkspaceScope(this.sql, [actor.project.workspaceId], async (tx) =>
          updateFounderTaskCompletion(tx, founderTaskId, evidenceRef),
        );
      },
    );
  }

  async deferOrSkip(
    actor: { userId: UserId; membership: WorkspaceMembership; project: Project },
    founderTaskId: FounderTaskId,
    status: 'deferred' | 'skipped',
    reason: string,
    idempotencyKey: string,
  ): Promise<FounderTask> {
    const key = `idem:${actor.userId}:founderTask.${status}:${idempotencyKey}`;
    return withIdempotency(
      this.coordination,
      key,
      limits.idempotencyKeyTtlSeconds,
      (raw) => superjson.parse(raw) as FounderTask,
      (value) => superjson.stringify(value),
      async () => {
        await this.requireTask(actor, founderTaskId);
        return withWorkspaceScope(this.sql, [actor.project.workspaceId], async (tx) =>
          updateFounderTaskStatus(tx, founderTaskId, status, reason),
        );
      },
    );
  }

  private async requireTask(
    actor: { membership: WorkspaceMembership; project: Project },
    founderTaskId: FounderTaskId,
  ): Promise<FounderTask> {
    if (!this.policyService.can(actor.membership, 'project.list')) {
      throw new AppError({
        code: 'policy_forbidden',
        explanation: 'Your role cannot read founder tasks.',
        nextAction: 'Ask a workspace admin to change your role.',
      });
    }
    const task = await withWorkspaceScope(this.sql, [actor.project.workspaceId], async (tx) =>
      getFounderTaskById(tx, founderTaskId),
    );
    if (task === null || task.projectId !== actor.project.id) {
      throw new AppError({
        code: 'not_found',
        explanation: 'Founder task not found.',
        nextAction: 'Pick a task on this project.',
      });
    }
    return task;
  }
}
