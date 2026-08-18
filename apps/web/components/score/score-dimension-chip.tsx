'use client';

import { scoreDimensionHeading, scoreDimensionSupporting } from '../../lib/format';

export function ScoreDimensionChip({
  dimension,
  raw,
  basis,
  onSelect,
}: {
  dimension: string;
  raw: number;
  basis: 'known' | 'insufficient_data';
  onSelect?: (dimension: string) => void;
}) {
  const label = scoreDimensionHeading(dimension);
  const title = `${scoreDimensionSupporting(dimension)} · ${basis === 'known' ? 'based on evidence' : 'not enough data yet'}`;
  const body = (
    <>
      <span aria-hidden="true">{basis === 'known' ? '●' : '○'}</span>
      {label} {raw.toFixed(1)}/5
    </>
  );
  if (onSelect === undefined) {
    return (
      <span className={basis === 'known' ? 'badge badge-info' : 'badge'} title={title}>
        {body}
      </span>
    );
  }
  return (
    <button
      type="button"
      className={basis === 'known' ? 'badge badge-info' : 'badge'}
      title={title}
      onClick={() => onSelect(dimension)}
    >
      {body}
    </button>
  );
}
