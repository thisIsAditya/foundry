import { describe, expect, it } from 'vitest';

import {
  canTransitionRecordItemStatus,
  dependentRecordSections,
  provenanceFromLegacyDraft,
  recordItemStatusAllowsProvenance,
  recordSectionFromLegacyPack,
} from './sections.js';

describe('record item status', () => {
  it('forbids silent acceptance from empty and allows stale after accept', () => {
    expect(canTransitionRecordItemStatus('empty', 'accepted')).toBe(false);
    expect(canTransitionRecordItemStatus('empty', 'draft')).toBe(true);
    expect(canTransitionRecordItemStatus('draft', 'accepted')).toBe(true);
    expect(canTransitionRecordItemStatus('accepted', 'stale')).toBe(true);
  });

  it('rejects accepted AI proposals and founder approval on empty items', () => {
    expect(recordItemStatusAllowsProvenance('accepted', 'ai_proposal')).toBe(false);
    expect(recordItemStatusAllowsProvenance('accepted', 'founder_approved')).toBe(true);
    expect(recordItemStatusAllowsProvenance('empty', 'founder_approved')).toBe(false);
    expect(recordItemStatusAllowsProvenance('empty', 'unverified')).toBe(true);
  });
});

describe('staleness dependents', () => {
  it('marks offer and experiment as affected by a customer change', () => {
    expect(dependentRecordSections('beachhead_customer')).toContain('offer_pricing_model');
    expect(dependentRecordSections('beachhead_customer')).toContain('next_validation_experiment');
    expect(dependentRecordSections('decisions_and_changes')).toEqual([]);
  });
});

describe('legacy pack mapping', () => {
  it('parks legal and launch as deferred extensions and keeps GTM out of the core record', () => {
    expect(recordSectionFromLegacyPack('problem')).toBe('problem');
    expect(recordSectionFromLegacyPack('legal_compliance')).toBe('deferred_extension');
    expect(recordSectionFromLegacyPack('gtm_first_100')).toBe('deferred_extension');
    expect(provenanceFromLegacyDraft('assumption')).toEqual({
      status: 'needs_evidence',
      provenance: 'unverified',
    });
    expect(provenanceFromLegacyDraft('founder_input')).toEqual({
      status: 'draft',
      provenance: 'founder_input',
    });
  });
});
