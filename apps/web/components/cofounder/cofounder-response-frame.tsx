'use client';

import type { CofounderInteractionType } from '@foundry/domain';
import type { ReactNode } from 'react';

const INTERACTION_COPY: Record<CofounderInteractionType, { eyebrow: string; next: string }> = {
  ask: { eyebrow: 'Ask', next: 'Answer with founder-only context, or pick a suggestion.' },
  inform: { eyebrow: 'Current state', next: 'Continue, or open the linked record.' },
  recommend: {
    eyebrow: 'Recommendation',
    next: 'Accept this direction only through a proposal, or ask why.',
  },
  generate: {
    eyebrow: 'Draft',
    next: 'Review, copy, revise, or convert to a proposal if this is material.',
  },
  review: { eyebrow: 'Review', next: 'Inspect the linked record, evidence, or step.' },
  change: {
    eyebrow: 'Proposed change',
    next: 'Accept selected changes, modify, or keep the current record.',
  },
};

export function CofounderResponseFrame({
  type,
  children,
}: {
  type: CofounderInteractionType;
  children: ReactNode;
}) {
  const copy = INTERACTION_COPY[type];
  return (
    <section className="panel stack-tight" aria-label={`Co-founder ${copy.eyebrow}`}>
      <p className="callout-eyebrow">{copy.eyebrow}</p>
      {children}
      <p className="hint">{copy.next}</p>
    </section>
  );
}
