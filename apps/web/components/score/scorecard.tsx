'use client';

import { ScoreDimensions, type PlanScore } from '@foundry/domain';
import { useQuery } from '@tanstack/react-query';

import { scoreDimensionHeading, scoreDimensionSupporting } from '../../lib/format';
import { useTRPC } from '../../lib/trpc/client';
import { EmptyState } from '../ui/empty-state';

import { ScoreDimensionChip } from './score-dimension-chip';
import { ScoreSparkline } from './score-sparkline';

export function Scorecard({ projectId }: { projectId: string }) {
  const trpc = useTRPC();
  const current = useQuery(trpc.score.getCurrent.queryOptions({ projectId }));
  const history = useQuery(trpc.score.getHistory.queryOptions({ projectId, limit: 12 }));

  if (current.isLoading) {
    return <p className="muted">Loading the scorecard…</p>;
  }
  if (current.isError) {
    return <p className="alert">{current.error.message}</p>;
  }
  const score = current.data;
  if (score === null || score === undefined) {
    return (
      <EmptyState
        title="Score pending"
        description="The first draft is still assumption-heavy. Missing data counts as unknown, not as a pass."
      />
    );
  }

  return (
    <div className="stack">
      <div>
        <p className="hint">Overall score</p>
        <p className="page-title">{Math.round(score.overall)} / 100</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {ScoreDimensions.map((dimension) => {
          const item = score.dimensions[dimension];
          if (item === undefined) {
            return null;
          }
          return (
            <ScoreDimensionChip
              key={dimension}
              dimension={dimension}
              raw={item.raw}
              basis={item.basis}
            />
          );
        })}
      </div>
      <div>
        <p className="hint">Trend across revisions</p>
        <ScoreSparkline values={(history.data ?? []).map((item) => item.overall).reverse()} />
      </div>
      <ScoreReasons score={score} />
    </div>
  );
}

function ScoreReasons({ score }: { score: PlanScore }) {
  const strongest = [...score.reasons].slice(0, 1)[0];
  const weakest = ScoreDimensions.map((dimension) => ({
    dimension,
    item: score.dimensions[dimension],
  }))
    .filter((entry) => entry.item !== undefined)
    .sort((a, b) => (a.item?.raw ?? 0) - (b.item?.raw ?? 0))[0];

  return (
    <div className="stack" style={{ gap: '0.75rem' }}>
      {strongest === undefined ? null : (
        <div>
          <p className="hint">Highest-impact finding</p>
          <p className="text-sm">{strongest.message}</p>
        </div>
      )}
      {weakest === undefined ? null : (
        <div>
          <p className="hint">Weakest dimension</p>
          <p className="text-sm">
            {scoreDimensionHeading(weakest.dimension)} (
            {scoreDimensionSupporting(weakest.dimension)})
          </p>
        </div>
      )}
      <div>
        <p className="hint">Top actions that would raise the score</p>
        {score.topActions.length === 0 ? (
          <p className="muted">No actions yet.</p>
        ) : (
          <ol className="stack" style={{ gap: '0.35rem' }}>
            {score.topActions.slice(0, 3).map((action) => (
              <li key={`${action.dimension}-${action.action}`} className="text-sm">
                {action.action}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
