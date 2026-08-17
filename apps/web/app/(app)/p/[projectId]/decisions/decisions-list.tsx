'use client';

import { useQuery } from '@tanstack/react-query';

import { EmptyState } from '../../../../../components/ui/empty-state';
import { formatUnknown } from '../../../../../lib/format';
import { useTRPC } from '../../../../../lib/trpc/client';

export function DecisionsList({ projectId }: { projectId: string }) {
  const trpc = useTRPC();
  const list = useQuery(trpc.decision.list.queryOptions({ projectId }));
  const items = list.data ?? [];

  return (
    <div className="stack">
      <header>
        <h1 className="page-title">Decisions</h1>
        <p className="lede">
          A running log of the calls you and the AI made along the way — including gate outcomes —
          so you can see why the plan changed.
        </p>
      </header>
      {list.isLoading ? <p className="muted">Loading…</p> : null}
      {!list.isLoading && items.length === 0 ? (
        <EmptyState
          title="No decisions recorded yet"
          description="As you and the AI make calls — like passing a gate or choosing a direction — they'll be logged here."
        />
      ) : null}
      {items.length > 0 ? (
        <ul className="list">
          {items.map((item) => (
            <li key={item.id} className="py-3">
              <p className="text-sm">{item.rationale ?? 'No reason was recorded for this one.'}</p>
              <p className="muted mt-1">{formatUnknown(item.chosen)}</p>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
