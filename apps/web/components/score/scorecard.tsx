'use client';

import { ScoreDimensions, type PlanScore } from '@foundry/domain';
import { useQuery } from '@tanstack/react-query';

import { scoreDimensionHeading, scoreDimensionSupporting } from '../../lib/format';
import { useTRPC } from '../../lib/trpc/client';
import { EmptyState } from '../ui/empty-state';

import { ScoreDimensionChip } from './score-dimension-chip';

function Sparkline({ values }: { values: number[] }) {
  if (values.length === 0) {
    return <p className="muted">No score history yet.</p>;
  }
  const width = 220;
  const height = 48;
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 100);
  const span = max - min || 1;
  const points = values
    .map((value, index) => {
      const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
      const y = height - ((value - min) / span) * height;
      return `${String(x)},${String(y)}`;
    })
    .join(' ');
  return (
    <svg width={width} height={height} role="img" aria-label="Score trend across revisions">
      <polyline fill="none" stroke="currentColor" strokeWidth="2" points={points} />
    </svg>
  );
}

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
        <Sparkline values={(history.data ?? []).map((item) => item.overall).reverse()} />
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
