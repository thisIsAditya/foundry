'use client';

import { ScoreDimensionSchema, ScoreDimensions } from '@foundry/domain';
import { Gauge, gaugeBandPresentation, scoreBandOf } from '@foundry/ui';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { useTRPC } from '../../lib/trpc/client';
import { ScoreDimensionChip } from '../score/score-dimension-chip';
import { ScoreSparkline } from '../score/score-sparkline';
import { EmptyState } from '../ui/empty-state';

export function PlanScoreHeadline({ projectId }: { projectId: string }) {
  const trpc = useTRPC();
  const [dimension, setDimension] = useState<string | null>(null);
  const current = useQuery(trpc.score.getCurrent.queryOptions({ projectId }));
  const history = useQuery(trpc.score.getHistory.queryOptions({ projectId, limit: 12 }));
  const sections = useQuery(trpc.pack.listBusinessModelSections.queryOptions({ projectId }));
  const parsed = ScoreDimensionSchema.safeParse(dimension);
  const explanation = useQuery({
    ...trpc.score.explain.queryOptions({
      projectId,
      dimension: parsed.success ? parsed.data : 'customer_clarity',
    }),
    enabled: parsed.success,
  });

  if (current.isLoading) {
    return <p className="muted">Loading the score…</p>;
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

  const overall = score.overall;
  const band = gaugeBandPresentation(scoreBandOf(overall));
  const cards = sections.data ?? [];
  const known = cards.reduce((sum, card) => sum + card.knownFacts.length, 0);
  const assumed = cards.reduce((sum, card) => sum + card.assumptions.length, 0);
  const missing = cards.filter(
    (card) => card.knownFacts.length === 0 && card.assumptions.length === 0,
  ).length;

  return (
    <div className="stack">
      <div className="flex flex-col items-start gap-3">
        <Gauge value={overall} size="lg" label="Plan score" />
        <p className="font-display text-sm">{band.label}</p>
      </div>
      {sections.isLoading ? <p className="muted">Loading coverage…</p> : null}
      {sections.isError ? <p className="alert">{sections.error.message}</p> : null}
      <p className="hint">
        {String(known)} known · {String(assumed)} assumed · {String(missing)} missing
      </p>
      <div className="flex flex-wrap gap-2">
        {ScoreDimensions.map((item) => {
          const entry = score.dimensions[item];
          if (entry === undefined) {
            return null;
          }
          return (
            <ScoreDimensionChip
              key={item}
              dimension={item}
              raw={entry.raw}
              basis={entry.basis}
              onSelect={setDimension}
            />
          );
        })}
      </div>
      {parsed.success ? (
        <div className="panel stack">
          {explanation.isLoading ? <p className="muted">Explaining this dimension…</p> : null}
          {explanation.isError ? <p className="alert">{explanation.error.message}</p> : null}
          {(explanation.data ?? []).length === 0 && explanation.isSuccess ? (
            <p className="hint">No explanation for this dimension yet.</p>
          ) : null}
          {(explanation.data ?? []).map((reason) => (
            <p key={reason.message} className="text-sm">
              {reason.message}
            </p>
          ))}
        </div>
      ) : null}
      <div>
        <p className="hint">Trend across revisions</p>
        <ScoreSparkline values={(history.data ?? []).map((item) => item.overall).reverse()} />
      </div>
    </div>
  );
}
