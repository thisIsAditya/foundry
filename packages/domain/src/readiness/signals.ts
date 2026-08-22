import type { RecordItemStatus, RecordProvenance, RecordSectionKey } from '../record/sections.js';

export const ReadinessKinds = [
  'supported',
  'missing_evidence',
  'contradictory',
  'blocked',
  'stale',
  'empty',
] as const;
export type ReadinessKind = (typeof ReadinessKinds)[number];

export type ReadinessSignal = {
  id: string;
  kind: ReadinessKind;
  section: RecordSectionKey;
  title: string;
  explanation: string;
  smallestAction: string;
};

export function readinessKindForItem(input: {
  status: RecordItemStatus;
  provenance: RecordProvenance;
}): ReadinessKind {
  if (input.status === 'blocked') {
    return 'blocked';
  }
  if (input.status === 'stale') {
    return 'stale';
  }
  if (input.status === 'empty') {
    return 'empty';
  }
  if (input.provenance === 'contradicted') {
    return 'contradictory';
  }
  if (
    input.status === 'needs_evidence' ||
    input.provenance === 'unverified' ||
    input.provenance === 'ai_proposal'
  ) {
    return 'missing_evidence';
  }
  if (input.status === 'accepted') {
    return 'supported';
  }
  return 'missing_evidence';
}

export function readinessSignal(input: {
  section: RecordSectionKey;
  label: string;
  status: RecordItemStatus;
  provenance: RecordProvenance;
  smallestAction: string;
}): ReadinessSignal {
  const kind = readinessKindForItem(input);
  const explanation = explanationFor(kind, input.label);
  return {
    id: `${input.section}:${kind}`,
    kind,
    section: input.section,
    title: input.label,
    explanation,
    smallestAction: input.smallestAction,
  };
}

function explanationFor(kind: ReadinessKind, label: string): string {
  switch (kind) {
    case 'supported':
      return `${label} has accepted content with stated provenance. This is not real-world validation.`;
    case 'missing_evidence':
      return `${label} still depends on founder input or unverified claims.`;
    case 'contradictory':
      return `${label} has a contradicted claim. Keep the old evidence and resolve the conflict explicitly.`;
    case 'blocked':
      return `${label} is blocked. Documentation can continue; the block is a readiness signal, not a lock.`;
    case 'stale':
      return `${label} may no longer follow from an upstream change. Review it before treating it as current.`;
    case 'empty':
      return `${label} is empty on purpose. Absence is not a completed section.`;
  }
}
