'use client';

import { DecideApprovalInputSchema } from '@foundry/api-contracts';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useRef } from 'react';

import { approvalActionLabel, approvalStatusLabel } from '../../lib/format';
import { useTRPC } from '../../lib/trpc/client';

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
  const items = (list.data ?? []).filter((item) => item.status === 'pending');

  if (!list.isLoading && items.length === 0) {
    return null;
  }

  return (
    <div className="stack-tight">
      <div>
        <h2 className="card-title">Real-world actions waiting on you</h2>
        <p className="hint">
          Sending an email, spending on ads, publishing a page — nothing goes out until you say so.
        </p>
      </div>
      {list.isLoading ? <p className="muted">Loading…</p> : null}
      {items.length === 0 ? null : (
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
                  disabled={approve.isPending}
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
                  disabled={reject.isPending}
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
      )}
    </div>
  );
}
