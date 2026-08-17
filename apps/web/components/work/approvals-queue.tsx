'use client';

import { DecideApprovalInputSchema } from '@foundry/api-contracts';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useRef } from 'react';

import { approvalActionLabel, approvalStatusLabel } from '../../lib/format';
import { useTRPC } from '../../lib/trpc/client';
import { EmptyState } from '../ui/empty-state';

function statusBadgeClass(status: string): string {
  switch (status) {
    case 'pending':
      return 'badge badge-warning';
    case 'approved':
    case 'executed':
      return 'badge badge-success';
    case 'rejected':
    case 'execution_failed':
    case 'expired':
      return 'badge';
    default:
      return 'badge';
  }
}

export function ApprovalsQueue({ projectId }: { projectId: string }) {
  const trpc = useTRPC();
  const idempotencyKey = useRef(crypto.randomUUID());
  const list = useQuery(trpc.approval.list.queryOptions({ projectId }));
  const approve = useMutation(trpc.approval.approve.mutationOptions());
  const reject = useMutation(trpc.approval.reject.mutationOptions());
  const items = list.data ?? [];
  const pendingCount = items.filter((item) => item.status === 'pending').length;

  return (
    <div className="stack">
      <header>
        <h1 className="page-title">Approvals</h1>
        <p className="lede">
          Anything that reaches the outside world — sending an email, spending on ads, publishing a
          page — waits here first. Nothing happens until you say so.
        </p>
      </header>
      {list.isLoading ? <p className="muted">Loading…</p> : null}
      {!list.isLoading && items.length === 0 ? (
        <EmptyState
          title="Nothing waiting on you"
          description="When your AI co-founder wants to take a real-world action, it'll show up here for your sign-off."
        />
      ) : null}
      {items.length > 0 ? (
        <>
          {pendingCount > 0 ? (
            <p className="muted">
              {pendingCount} request{pendingCount === 1 ? '' : 's'} waiting on your decision.
            </p>
          ) : null}
          <ul className="list">
            {items.map((item) => (
              <li key={item.id} className="list-row">
                <div>
                  <p className="text-sm font-medium">{approvalActionLabel(item.actionType)}</p>
                  <p className="mt-1">
                    <span className={statusBadgeClass(item.status)}>
                      {approvalStatusLabel(item.status)}
                    </span>
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    className="btn"
                    type="button"
                    disabled={item.status !== 'pending' || approve.isPending}
                    onClick={() => {
                      const input = DecideApprovalInputSchema.parse({
                        projectId,
                        approvalId: item.id,
                        expectedPayloadHash: item.payloadHash,
                        idempotencyKey: idempotencyKey.current,
                      });
                      void approve.mutateAsync(input).then(() => {
                        idempotencyKey.current = crypto.randomUUID();
                        void list.refetch();
                      });
                    }}
                  >
                    Approve
                  </button>
                  <button
                    className="btn-secondary"
                    type="button"
                    disabled={item.status !== 'pending' || reject.isPending}
                    onClick={() => {
                      const input = DecideApprovalInputSchema.parse({
                        projectId,
                        approvalId: item.id,
                        expectedPayloadHash: item.payloadHash,
                        idempotencyKey: idempotencyKey.current,
                      });
                      void reject.mutateAsync(input).then(() => {
                        idempotencyKey.current = crypto.randomUUID();
                        void list.refetch();
                      });
                    }}
                  >
                    Reject
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}
