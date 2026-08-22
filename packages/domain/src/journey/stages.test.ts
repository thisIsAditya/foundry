import { describe, expect, it } from 'vitest';

import {
  canMoveToStage,
  canTransitionJourneyStageStatus,
  canTransitionJourneyStepStatus,
  journeyStageFromLegacyPhase,
  legacyPhaseFromJourneyStage,
  nextJourneyStageStatuses,
  nextJourneyStepStatuses,
  recommendedNextStage,
} from './stages.js';
import { firstRecommendedStep } from './recommended-step.js';

describe('journey stage movement', () => {
  it('allows only the sequential next stage on advance', () => {
    expect(canMoveToStage('idea', 'problem', 'advance')).toBe(true);
    expect(canMoveToStage('idea', 'evidence', 'advance')).toBe(false);
    expect(recommendedNextStage('offer')).toBe('validation_next_step');
    expect(recommendedNextStage('validation_next_step')).toBeNull();
  });

  it('allows revisit to the current or earlier stage', () => {
    expect(canMoveToStage('offer', 'problem', 'revisit')).toBe(true);
    expect(canMoveToStage('offer', 'offer', 'revisit')).toBe(true);
    expect(canMoveToStage('problem', 'offer', 'revisit')).toBe(false);
  });

  it('requires a reason to skip ahead', () => {
    expect(canMoveToStage('idea', 'evidence', 'skip_with_reason')).toBe(false);
    expect(
      canMoveToStage('idea', 'evidence', 'skip_with_reason', 'Already interviewed customers'),
    ).toBe(true);
  });
});

describe('journey status transitions', () => {
  it('allows the documented stage-status path and rejects silent completion from not_started', () => {
    expect(canTransitionJourneyStageStatus('not_started', 'in_progress')).toBe(true);
    expect(canTransitionJourneyStageStatus('in_progress', 'complete')).toBe(true);
    expect(canTransitionJourneyStageStatus('complete', 'revisited')).toBe(true);
    expect(canTransitionJourneyStageStatus('not_started', 'complete')).toBe(false);
    expect(nextJourneyStageStatuses('complete')).toEqual(['revisited', 'in_progress']);
  });

  it('requires submit before a step can complete', () => {
    expect(canTransitionJourneyStepStatus('ready', 'in_progress')).toBe(true);
    expect(canTransitionJourneyStepStatus('in_progress', 'submitted')).toBe(true);
    expect(canTransitionJourneyStepStatus('submitted', 'reviewed')).toBe(true);
    expect(canTransitionJourneyStepStatus('reviewed', 'complete')).toBe(true);
    expect(canTransitionJourneyStepStatus('ready', 'complete')).toBe(false);
    expect(nextJourneyStepStatuses('complete')).toEqual([]);
  });
});

describe('legacy phase projection', () => {
  it('maps diagnose to idea and never treats launch as a core current stage', () => {
    expect(journeyStageFromLegacyPhase('diagnose')).toBe('idea');
    expect(journeyStageFromLegacyPhase('build_and_launch')).toBe('validation_next_step');
    expect(legacyPhaseFromJourneyStage('idea')).toBe('diagnose');
    expect(legacyPhaseFromJourneyStage('customer')).toBe('problem');
  });
});

describe('first recommended step', () => {
  it('asks for the idea when nothing has been written', () => {
    const step = firstRecommendedStep({ ideaText: '' });
    expect(step.stage).toBe('idea');
    expect(step.recommended).toBe(true);
  });

  it('does not jump to research when only an idea exists', () => {
    const step = firstRecommendedStep({
      ideaText: 'Cafe owners lose two hours closing the books.',
    });
    expect(step.stage).toBe('idea');
    expect(step.objective.toLowerCase()).not.toContain('research');
  });

  it('moves to the problem when geography or an objective would change the path', () => {
    const step = firstRecommendedStep({
      ideaText: 'Cafe owners lose two hours closing the books.',
      geography: 'IN',
      objective: 'bootstrap',
    });
    expect(step.stage).toBe('problem');
  });
});
