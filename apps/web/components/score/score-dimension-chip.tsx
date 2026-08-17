'use client';

import { scoreDimensionHeading, scoreDimensionSupporting } from '../../lib/format';

export function ScoreDimensionChip({
  dimension,
  raw,
  basis,
}: {
  dimension: string;
  raw: number;
  basis: 'known' | 'insufficient_data';
}) {
  const label = scoreDimensionHeading(dimension);
  return (
    <span
      className={basis === 'known' ? 'badge badge-info' : 'badge'}
      title={`${scoreDimensionSupporting(dimension)} · ${basis === 'known' ? 'based on evidence' : 'not enough data yet'}`}
    >
      <span aria-hidden="true">{basis === 'known' ? '●' : '○'}</span>
      {label} {raw.toFixed(1)}/5
    </span>
  );
}
