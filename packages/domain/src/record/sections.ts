import { z } from 'zod';

import { canTransition, nextStates } from '../status/transition.js';
import type { BusinessModelSectionKey } from '../status/business-model-section.js';

export const RecordSectionKeys = [
  'idea_founder_context',
  'problem',
  'beachhead_customer',
  'current_alternatives',
  'evidence_and_learning',
  'assumptions_and_questions',
  'opportunity_and_differentiation',
  'value_proposition',
  'offer_pricing_model',
  'economics_and_constraints',
  'decisions_and_changes',
  'next_validation_experiment',
] as const;
export const RecordSectionKeySchema = z.enum(RecordSectionKeys);
export type RecordSectionKey = z.infer<typeof RecordSectionKeySchema>;

export const RecordItemStatuses = [
  'empty',
  'draft',
  'needs_evidence',
  'review',
  'accepted',
  'stale',
  'deferred',
  'blocked',
] as const;
export const RecordItemStatusSchema = z.enum(RecordItemStatuses);
export type RecordItemStatus = z.infer<typeof RecordItemStatusSchema>;

export const RecordProvenances = [
  'founder_input',
  'cited_evidence',
  'derived',
  'ai_proposal',
  'founder_approved',
  'unverified',
  'contradicted',
] as const;
export const RecordProvenanceSchema = z.enum(RecordProvenances);
export type RecordProvenance = z.infer<typeof RecordProvenanceSchema>;

export const RecordRelationTypes = [
  'supports',
  'contradicts',
  'derived_from',
  'affected_by',
] as const;
export const RecordRelationTypeSchema = z.enum(RecordRelationTypes);
export type RecordRelationType = z.infer<typeof RecordRelationTypeSchema>;

export const RecordSupportTargetKinds = [
  'record',
  'evidence',
  'interview',
  'quote',
  'decision',
  'proposal',
  'source',
] as const;
export const RecordSupportTargetKindSchema = z.enum(RecordSupportTargetKinds);
export type RecordSupportTargetKind = z.infer<typeof RecordSupportTargetKindSchema>;

export const RECORD_SECTION_DEFINITIONS: Readonly<
  Record<RecordSectionKey, { label: string; defaultItemKey: string; smallestAction: string }>
> = {
  idea_founder_context: {
    label: 'Idea and founder context',
    defaultItemKey: 'idea',
    smallestAction: 'Write the idea and any constraint that changes the first step.',
  },
  problem: {
    label: 'Problem',
    defaultItemKey: 'problem',
    smallestAction: 'State the recurring problem in the founder’s words.',
  },
  beachhead_customer: {
    label: 'Beachhead customer',
    defaultItemKey: 'beachhead',
    smallestAction: 'Name the first customer without inventing a persona.',
  },
  current_alternatives: {
    label: 'Current alternatives',
    defaultItemKey: 'alternatives',
    smallestAction: 'List how the customer solves this today, including doing nothing.',
  },
  evidence_and_learning: {
    label: 'Evidence and learning',
    defaultItemKey: 'evidence',
    smallestAction: 'Capture an observation or interview linked to a claim.',
  },
  assumptions_and_questions: {
    label: 'Assumptions and open questions',
    defaultItemKey: 'assumptions',
    smallestAction: 'Record the riskiest unsupported belief.',
  },
  opportunity_and_differentiation: {
    label: 'Opportunity and differentiation',
    defaultItemKey: 'opportunity',
    smallestAction: 'Describe why this wedge could matter for the chosen customer.',
  },
  value_proposition: {
    label: 'Value proposition',
    defaultItemKey: 'value_proposition',
    smallestAction: 'Write the promise for the beachhead in one sentence.',
  },
  offer_pricing_model: {
    label: 'Offer, pricing, and business model',
    defaultItemKey: 'offer',
    smallestAction: 'State who pays, for what, and a pricing hypothesis.',
  },
  economics_and_constraints: {
    label: 'Economics and constraints',
    defaultItemKey: 'economics',
    smallestAction: 'Record the constraints that would make the model unworkable.',
  },
  decisions_and_changes: {
    label: 'Decisions and changes',
    defaultItemKey: 'decisions',
    smallestAction: 'Record an explicit decision with a rationale.',
  },
  next_validation_experiment: {
    label: 'Next validation experiment',
    defaultItemKey: 'experiment',
    smallestAction: 'Choose one test with success criteria the founder controls.',
  },
};

const ITEM_STATUS_TRANSITIONS: Readonly<Record<RecordItemStatus, readonly RecordItemStatus[]>> = {
  empty: ['draft', 'needs_evidence', 'deferred', 'blocked'],
  draft: ['needs_evidence', 'review', 'accepted', 'deferred', 'blocked', 'stale', 'empty'],
  needs_evidence: ['draft', 'review', 'deferred', 'blocked', 'stale'],
  review: ['accepted', 'draft', 'needs_evidence', 'deferred', 'blocked'],
  accepted: ['stale', 'deferred', 'review'],
  stale: ['draft', 'review', 'accepted', 'needs_evidence', 'deferred'],
  deferred: ['draft', 'empty', 'needs_evidence'],
  blocked: ['draft', 'empty', 'deferred', 'needs_evidence'],
};

export function canTransitionRecordItemStatus(
  from: RecordItemStatus,
  to: RecordItemStatus,
): boolean {
  return canTransition(ITEM_STATUS_TRANSITIONS, from, to);
}

export function nextRecordItemStatuses(from: RecordItemStatus): readonly RecordItemStatus[] {
  return nextStates(ITEM_STATUS_TRANSITIONS, from);
}

export function recordItemStatusAllowsProvenance(
  status: RecordItemStatus,
  provenance: RecordProvenance,
): boolean {
  if (status === 'accepted' && (provenance === 'ai_proposal' || provenance === 'contradicted')) {
    return false;
  }
  if (provenance === 'founder_approved' && status !== 'accepted' && status !== 'stale') {
    return false;
  }
  if (status === 'empty' && provenance !== 'unverified' && provenance !== 'founder_input') {
    return false;
  }
  return true;
}

export const STALE_DEPENDENTS: Readonly<Record<RecordSectionKey, readonly RecordSectionKey[]>> = {
  idea_founder_context: [
    'problem',
    'beachhead_customer',
    'opportunity_and_differentiation',
    'offer_pricing_model',
  ],
  problem: [
    'beachhead_customer',
    'evidence_and_learning',
    'assumptions_and_questions',
    'opportunity_and_differentiation',
    'value_proposition',
    'offer_pricing_model',
  ],
  beachhead_customer: [
    'current_alternatives',
    'evidence_and_learning',
    'opportunity_and_differentiation',
    'value_proposition',
    'offer_pricing_model',
    'economics_and_constraints',
    'next_validation_experiment',
  ],
  current_alternatives: ['opportunity_and_differentiation', 'value_proposition'],
  evidence_and_learning: [
    'assumptions_and_questions',
    'opportunity_and_differentiation',
    'offer_pricing_model',
  ],
  assumptions_and_questions: ['next_validation_experiment', 'opportunity_and_differentiation'],
  opportunity_and_differentiation: [
    'value_proposition',
    'offer_pricing_model',
    'next_validation_experiment',
  ],
  value_proposition: ['offer_pricing_model', 'economics_and_constraints'],
  offer_pricing_model: [
    'economics_and_constraints',
    'next_validation_experiment',
    'decisions_and_changes',
  ],
  economics_and_constraints: ['next_validation_experiment'],
  decisions_and_changes: [],
  next_validation_experiment: [],
};

export function dependentRecordSections(section: RecordSectionKey): readonly RecordSectionKey[] {
  return STALE_DEPENDENTS[section];
}

export const LEGACY_PACK_TO_RECORD_SECTION: Readonly<
  Partial<Record<BusinessModelSectionKey, RecordSectionKey | 'deferred_extension'>>
> = {
  context: 'idea_founder_context',
  problem: 'problem',
  beachhead: 'beachhead_customer',
  persona_dmu: 'beachhead_customer',
  alternatives_competitors: 'current_alternatives',
  evidence_ledger: 'evidence_and_learning',
  assumptions_experiments: 'assumptions_and_questions',
  market_model: 'opportunity_and_differentiation',
  business_model_money_rules: 'offer_pricing_model',
  pricing_unit_economics: 'economics_and_constraints',
  willingness_to_pay: 'next_validation_experiment',
  mvbp_kill_lines: 'next_validation_experiment',
  gates_decisions_artifacts: 'decisions_and_changes',
  gtm_first_100: 'deferred_extension',
  team_cost_runway: 'deferred_extension',
  legal_compliance: 'deferred_extension',
  launch_operate: 'deferred_extension',
};

export function recordSectionFromLegacyPack(
  key: BusinessModelSectionKey,
): RecordSectionKey | 'deferred_extension' {
  return LEGACY_PACK_TO_RECORD_SECTION[key] ?? 'deferred_extension';
}

export function provenanceFromLegacyDraft(
  kind: 'founder_input' | 'assumption' | 'open_question' | 'not_applicable',
): { status: RecordItemStatus; provenance: RecordProvenance } {
  if (kind === 'founder_input') {
    return { status: 'draft', provenance: 'founder_input' };
  }
  if (kind === 'assumption') {
    return { status: 'needs_evidence', provenance: 'unverified' };
  }
  return { status: 'empty', provenance: 'unverified' };
}
