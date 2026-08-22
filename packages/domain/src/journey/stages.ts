import { z } from 'zod';

import type { RecordSectionKey } from '../record/sections.js';
import { canTransition, nextStates } from '../status/transition.js';
import type { JourneyPhase } from '../status/journey-status.js';

export const JourneyStages = [
  'idea',
  'problem',
  'customer',
  'evidence',
  'opportunity',
  'offer',
  'validation_next_step',
] as const;
export const JourneyStageSchema = z.enum(JourneyStages);
export type JourneyStage = z.infer<typeof JourneyStageSchema>;

const STAGE_RECORD_SECTIONS: Readonly<Record<JourneyStage, RecordSectionKey>> = {
  idea: 'idea_founder_context',
  problem: 'problem',
  customer: 'beachhead_customer',
  evidence: 'evidence_and_learning',
  opportunity: 'opportunity_and_differentiation',
  offer: 'offer_pricing_model',
  validation_next_step: 'next_validation_experiment',
};

export function recordSectionForJourneyStage(stage: JourneyStage): RecordSectionKey {
  return STAGE_RECORD_SECTIONS[stage];
}

export const JourneyStageStatuses = [
  'not_started',
  'draft',
  'in_progress',
  'awaiting_founder',
  'ready_for_review',
  'complete',
  'deferred',
  'blocked',
  'revisited',
] as const;
export const JourneyStageStatusSchema = z.enum(JourneyStageStatuses);
export type JourneyStageStatus = z.infer<typeof JourneyStageStatusSchema>;

export const JourneyStepStatuses = [
  'proposed',
  'ready',
  'in_progress',
  'awaiting_founder',
  'submitted',
  'reviewed',
  'complete',
  'deferred',
  'skipped_with_reason',
  'blocked',
  'canceled',
  'superseded',
] as const;
export const JourneyStepStatusSchema = z.enum(JourneyStepStatuses);
export type JourneyStepStatus = z.infer<typeof JourneyStepStatusSchema>;

export const JourneyMoveModes = ['advance', 'revisit', 'skip_with_reason'] as const;
export const JourneyMoveModeSchema = z.enum(JourneyMoveModes);
export type JourneyMoveMode = z.infer<typeof JourneyMoveModeSchema>;

export const JOURNEY_STAGE_DEFINITIONS: Readonly<
  Record<
    JourneyStage,
    {
      label: string;
      founderQuestion: string;
      primaryOutcome: string;
      recommendedObjective: string;
    }
  >
> = {
  idea: {
    label: 'Idea',
    founderQuestion: 'What do I want to explore?',
    primaryOutcome: 'Idea, intent, constraints, and starting context',
    recommendedObjective: 'Capture the idea in the founder’s own words.',
  },
  problem: {
    label: 'Problem',
    founderQuestion: 'Whose problem is this and why does it matter?',
    primaryOutcome: 'Problem hypothesis and initial customer',
    recommendedObjective: 'State a specific recurring problem before describing a solution.',
  },
  customer: {
    label: 'Customer',
    founderQuestion: 'Which first customer should we focus on?',
    primaryOutcome: 'Beachhead, persona, and buying context',
    recommendedObjective: 'Choose the first person or group to understand.',
  },
  evidence: {
    label: 'Evidence',
    founderQuestion: 'What supports or weakens this belief?',
    primaryOutcome: 'Evidence ledger, assumptions, and learning',
    recommendedObjective: 'Separate observations from beliefs and record the riskiest assumption.',
  },
  opportunity: {
    label: 'Opportunity',
    founderQuestion: 'Is this an attractive opportunity?',
    primaryOutcome: 'Alternatives, market framing, risks, and wedge',
    recommendedObjective: 'Map current alternatives and the differentiation that would matter.',
  },
  offer: {
    label: 'Offer',
    founderQuestion: 'What value will we offer and how could it work?',
    primaryOutcome: 'Value proposition, offer, business model, and economics',
    recommendedObjective: 'Shape a candidate offer, pricing hypothesis, and constraints.',
  },
  validation_next_step: {
    label: 'Validation next step',
    founderQuestion: 'What would most efficiently test this model?',
    primaryOutcome: 'One founder-controlled experiment with success criteria',
    recommendedObjective: 'Commit to, defer, or revise one validation experiment.',
  },
};

const STAGE_STATUS_TRANSITIONS: Readonly<
  Record<JourneyStageStatus, readonly JourneyStageStatus[]>
> = {
  not_started: ['draft', 'in_progress', 'deferred', 'blocked'],
  draft: ['in_progress', 'awaiting_founder', 'ready_for_review', 'deferred', 'blocked'],
  in_progress: [
    'awaiting_founder',
    'ready_for_review',
    'complete',
    'deferred',
    'blocked',
    'revisited',
  ],
  awaiting_founder: ['in_progress', 'ready_for_review', 'complete', 'deferred', 'blocked'],
  ready_for_review: ['complete', 'in_progress', 'deferred', 'blocked', 'revisited'],
  complete: ['revisited', 'in_progress'],
  deferred: ['in_progress', 'draft', 'not_started'],
  blocked: ['in_progress', 'draft', 'deferred'],
  revisited: ['in_progress', 'ready_for_review', 'complete', 'deferred'],
};

const STEP_STATUS_TRANSITIONS: Readonly<Record<JourneyStepStatus, readonly JourneyStepStatus[]>> = {
  proposed: ['ready', 'canceled', 'superseded', 'deferred'],
  ready: ['in_progress', 'deferred', 'skipped_with_reason', 'canceled', 'superseded'],
  in_progress: [
    'awaiting_founder',
    'submitted',
    'deferred',
    'skipped_with_reason',
    'blocked',
    'canceled',
  ],
  awaiting_founder: ['in_progress', 'submitted', 'deferred', 'skipped_with_reason', 'canceled'],
  submitted: ['reviewed', 'in_progress'],
  reviewed: ['complete', 'in_progress'],
  complete: [],
  deferred: ['ready', 'in_progress', 'skipped_with_reason', 'canceled'],
  skipped_with_reason: [],
  blocked: ['in_progress', 'deferred', 'canceled'],
  canceled: [],
  superseded: [],
};

export function journeyStageIndex(stage: JourneyStage): number {
  return JourneyStages.indexOf(stage);
}

export function recommendedNextStage(stage: JourneyStage): JourneyStage | null {
  return JourneyStages[journeyStageIndex(stage) + 1] ?? null;
}

export function canMoveToStage(
  from: JourneyStage,
  to: JourneyStage,
  mode: JourneyMoveMode,
  reason?: string,
): boolean {
  if (from === to) {
    return mode === 'revisit';
  }
  if (mode === 'advance') {
    return recommendedNextStage(from) === to;
  }
  if (mode === 'revisit') {
    return journeyStageIndex(to) <= journeyStageIndex(from);
  }
  return (reason ?? '').trim().length > 0;
}

export function canTransitionJourneyStageStatus(
  from: JourneyStageStatus,
  to: JourneyStageStatus,
): boolean {
  return canTransition(STAGE_STATUS_TRANSITIONS, from, to);
}

export function nextJourneyStageStatuses(from: JourneyStageStatus): readonly JourneyStageStatus[] {
  return nextStates(STAGE_STATUS_TRANSITIONS, from);
}

export function canTransitionJourneyStepStatus(
  from: JourneyStepStatus,
  to: JourneyStepStatus,
): boolean {
  return canTransition(STEP_STATUS_TRANSITIONS, from, to);
}

export function nextJourneyStepStatuses(from: JourneyStepStatus): readonly JourneyStepStatus[] {
  return nextStates(STEP_STATUS_TRANSITIONS, from);
}

const LEGACY_PHASE_TO_STAGE: Readonly<Record<JourneyPhase, JourneyStage>> = {
  diagnose: 'idea',
  problem: 'problem',
  evidence: 'evidence',
  market_and_competition: 'opportunity',
  model_and_pricing: 'offer',
  willingness_to_pay: 'validation_next_step',
  product: 'validation_next_step',
  build_and_launch: 'validation_next_step',
  operate: 'validation_next_step',
};

const STAGE_TO_LEGACY_PHASE: Readonly<Record<JourneyStage, JourneyPhase>> = {
  idea: 'diagnose',
  problem: 'problem',
  customer: 'problem',
  evidence: 'evidence',
  opportunity: 'market_and_competition',
  offer: 'model_and_pricing',
  validation_next_step: 'product',
};

export function journeyStageFromLegacyPhase(phase: JourneyPhase): JourneyStage {
  return LEGACY_PHASE_TO_STAGE[phase];
}

export function legacyPhaseFromJourneyStage(stage: JourneyStage): JourneyPhase {
  return STAGE_TO_LEGACY_PHASE[stage];
}

export function legacyPhaseIsDeferredExtension(phase: JourneyPhase): boolean {
  return phase === 'build_and_launch' || phase === 'operate';
}
