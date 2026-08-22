import { describe, expect, it } from 'vitest';

import { readinessKindForItem, readinessSignal } from './signals.js';

describe('readiness explanations', () => {
  it('never treats empty or unverified content as supported', () => {
    expect(readinessKindForItem({ status: 'empty', provenance: 'unverified' })).toBe('empty');
    expect(readinessKindForItem({ status: 'needs_evidence', provenance: 'unverified' })).toBe(
      'missing_evidence',
    );
    expect(readinessKindForItem({ status: 'accepted', provenance: 'founder_approved' })).toBe(
      'supported',
    );
    expect(readinessKindForItem({ status: 'accepted', provenance: 'contradicted' })).toBe(
      'contradictory',
    );
  });

  it('explains a blocked condition without calling it validation', () => {
    const signal = readinessSignal({
      section: 'evidence_and_learning',
      label: 'Evidence and learning',
      status: 'blocked',
      provenance: 'unverified',
      smallestAction: 'Capture an observation.',
    });
    expect(signal.kind).toBe('blocked');
    expect(signal.explanation.toLowerCase()).not.toContain('validated');
    expect(signal.explanation).toContain('not a lock');
  });
});
