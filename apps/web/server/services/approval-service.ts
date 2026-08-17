import type { DecideApprovalInput, RequestApprovalInput } from '@foundry/api-contracts';
import { limits } from '@foundry/config/limits';
import {
  getApprovalRequestById,
  insertApprovalRequest,
  listApprovalRequestsByProjectId,
  updateApprovalRequestDecision,
  withWorkspaceScope,
  type PoolSql,
} from '@foundry/db';
import {
  canTransitionApprovalStatus,
  type ApprovalRequest,
  type ApprovalStatus,
  type Project,
  type UserId,
  type WorkspaceMembership,
} from '@foundry/domain';
import { AppError } from '@foundry/observability';
import { PolicyService } from '@foundry/policy';
import { createHash } from 'node:crypto';
import superjson from 'superjson';

import { withIdempotency, type CoordinationStore } from '../coordination';
import type { JobQueue } from '../queue/job-queue';

export function hashApprovalPayload(payload: unknown): string {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

export class ApprovalService {
  constructor(
    private readonly sql: PoolSql,
    private readonly coordination: CoordinationStore,
    private readonly policyService: PolicyService,
    private readonly jobQueue: JobQueue,
  ) {}

  async list(
    actor: { membership: WorkspaceMembership; project: Project },
    status?: ApprovalStatus,
  ): Promise<ApprovalRequest[]> {
    if (!this.policyService.can(actor.membership, 'approval.read')) {
      throw new AppError({
        code: 'policy_forbidden',
        explanation: 'Your role cannot list approvals.',
        nextAction: 'Ask a workspace admin to change your role.',
      });
    }
    return withWorkspaceScope(this.sql, [actor.project.workspaceId], async (tx) =>
      listApprovalRequestsByProjectId(tx, actor.project.id, status),
    );
  }

  async getPayload(
    actor: { membership: WorkspaceMembership; project: Project },
    approvalId: ApprovalRequest['id'],
  ): Promise<ApprovalRequest> {
    if (!this.policyService.can(actor.membership, 'approval.read')) {
      throw new AppError({
        code: 'policy_forbidden',
        explanation: 'Your role cannot read approvals.',
        nextAction: 'Ask a workspace admin to change your role.',
      });
    }
    const row = await withWorkspaceScope(this.sql, [actor.project.workspaceId], async (tx) =>
      getApprovalRequestById(tx, approvalId),
    );
    if (row === null || row.projectId !== actor.project.id) {
      throw new AppError({
        code: 'not_found',
        explanation: 'Approval not found.',
        nextAction: 'Refresh the approvals queue.',
      });
    }
    return row;
  }

  async request(
    actor: { userId: UserId; membership: WorkspaceMembership; project: Project },
    input: RequestApprovalInput,
  ): Promise<ApprovalRequest> {
    if (!this.policyService.can(actor.membership, 'approval.decide')) {
      throw new AppError({
        code: 'policy_forbidden',
        explanation: 'Your role cannot request side effects.',
        nextAction: 'Ask a workspace admin to change your role.',
      });
    }
    if (input.actionType === 'filing.submit') {
      throw new AppError({
        code: 'policy_forbidden',
        explanation: 'The platform never files with the government.',
        nextAction: 'Send the draft checklist to a CA or CS.',
      });
    }
    const key = `idem:${actor.userId}:approval.request:${input.idempotencyKey}`;
    return withIdempotency(
      this.coordination,
      key,
      limits.idempotencyKeyTtlSeconds,
      (raw) => superjson.parse(raw) as ApprovalRequest,
      (value) => superjson.stringify(value),
      async () =>
        withWorkspaceScope(this.sql, [actor.project.workspaceId], async (tx) => {
          const payloadHash = hashApprovalPayload(input.payload);
          const expiresAt = new Date(Date.now() + limits.approval.ttlSeconds * 1000);
          return insertApprovalRequest(tx, {
            projectId: actor.project.id,
            actionType: input.actionType,
            payload: input.payload,
            payloadHash,
            requestedBy: actor.userId,
            expiresAt,
          });
        }),
    );
  }

  async decide(
    actor: { userId: UserId; membership: WorkspaceMembership; project: Project },
    input: DecideApprovalInput,
    decision: 'approved' | 'rejected',
    correlationId: string,
  ): Promise<ApprovalRequest> {
    if (!this.policyService.can(actor.membership, 'approval.decide')) {
      throw new AppError({
        code: 'policy_forbidden',
        explanation: 'Your role cannot decide approvals.',
        nextAction: 'Ask a workspace admin to change your role.',
      });
    }
    const key = `idem:${actor.userId}:approval.${decision}:${input.idempotencyKey}`;
    return withIdempotency(
      this.coordination,
      key,
      limits.idempotencyKeyTtlSeconds,
      (raw) => superjson.parse(raw) as ApprovalRequest,
      (value) => superjson.stringify(value),
      async () => {
        const updated = await withWorkspaceScope(
          this.sql,
          [actor.project.workspaceId],
          async (tx) => {
            const existing = await getApprovalRequestById(tx, input.approvalId);
            if (existing === null || existing.projectId !== actor.project.id) {
              throw new AppError({
                code: 'not_found',
                explanation: 'Approval not found.',
                nextAction: 'Refresh the approvals queue.',
              });
            }
            if (existing.payloadHash !== input.expectedPayloadHash) {
              throw new AppError({
                code: 'stale_revision',
                explanation:
                  'The approval payload changed. Mutating a payload requires a new request.',
                nextAction: 'Open the current payload and decide again.',
              });
            }
            if (existing.expiresAt.getTime() < Date.now() && existing.status === 'pending') {
              throw new AppError({
                code: 'stale_revision',
                explanation: 'This approval expired.',
                nextAction: 'Request the action again.',
              });
            }
            if (!canTransitionApprovalStatus(existing.status, decision)) {
              throw new AppError({
                code: 'invalid_input',
                explanation: `Cannot ${decision} an approval in status ${existing.status}.`,
                nextAction: 'Refresh the approvals queue.',
              });
            }
            return updateApprovalRequestDecision(tx, existing.id, decision, actor.userId);
          },
        );
        if (decision === 'approved') {
          await this.jobQueue.enqueueNotification({
            kind: 'execute_approval',
            projectId: actor.project.id,
            workspaceId: actor.project.workspaceId,
            approvalId: updated.id,
            correlationId,
          });
        }
        return updated;
      },
    );
  }
}
