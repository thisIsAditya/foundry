import { JOURNEY_STAGE_DEFINITIONS, type JourneyStage, type JourneyStepStatus } from './stages.js';

export type RecommendedStepDraft = {
  stage: JourneyStage;
  objective: string;
  whyNow: string;
  expectedEffort: string;
  expectedMinutes: number;
  cofounderWillDo: string;
  expectedOutcome: string;
  status: JourneyStepStatus;
  recommended: boolean;
};

export type FirstStepContext = {
  ideaText: string;
  geography?: string | null;
  objective?: string | null;
  constraints?: string | null;
  urgency?: string | null;
  customerHint?: string | null;
};

function hasText(value: string | null | undefined): boolean {
  return (value ?? '').trim().length > 0;
}

export function firstRecommendedStep(context: FirstStepContext): RecommendedStepDraft {
  const ideaKnown = hasText(context.ideaText);

  if (!ideaKnown) {
    return {
      stage: 'idea',
      objective: JOURNEY_STAGE_DEFINITIONS.idea.recommendedObjective,
      whyNow:
        'The journey starts from the founder’s words. Empty sections are acceptable; invented facts are not.',
      expectedEffort: 'About 5 minutes',
      expectedMinutes: 5,
      cofounderWillDo: 'Reflect the idea back and name only what is still unknown.',
      expectedOutcome: 'An Idea-stage record with honest empty sections and one next step.',
      status: 'ready',
      recommended: true,
    };
  }

  return recommendedStepForStage('problem');
}

export function recommendedStepForStage(stage: JourneyStage): RecommendedStepDraft {
  const definition = JOURNEY_STAGE_DEFINITIONS[stage];
  const details: Record<
    JourneyStage,
    Pick<RecommendedStepDraft, 'whyNow' | 'cofounderWillDo' | 'expectedOutcome'>
  > = {
    idea: {
      whyNow: 'Start with the founder’s words. Do not fill gaps with generated claims.',
      cofounderWillDo: 'Reflect the idea back and name only what is still unknown.',
      expectedOutcome: 'An Idea-stage record with honest empty sections and one next step.',
    },
    problem: {
      whyNow:
        'The idea is already recorded. Before shaping a solution, state the recurring problem in the founder’s words.',
      cofounderWillDo:
        'Turn the idea into candidate problem statements without inventing a customer.',
      expectedOutcome: 'A problem hypothesis marked as founder input or unverified, not as proof.',
    },
    customer: {
      whyNow: 'A named customer lets us judge evidence, alternatives, and the first experiment.',
      cofounderWillDo: 'Compare plausible beachheads and explain the trade-offs.',
      expectedOutcome: 'A beachhead candidate with explicit uncertainty.',
    },
    evidence: {
      whyNow:
        'Test the riskiest belief with an observation, interview, or source before treating it as proof.',
      cofounderWillDo: 'Separate source-backed findings from assumptions and interpretation.',
      expectedOutcome: 'Traceable evidence and explicit uncertainty.',
    },
    opportunity: {
      whyNow: 'Compare alternatives and the wedge that would make this problem worth solving.',
      cofounderWillDo: 'Frame alternatives and differentiation without inventing market evidence.',
      expectedOutcome: 'A bounded opportunity framing with open risks.',
    },
    offer: {
      whyNow:
        'Turn the selected problem and customer into a testable offer and economics hypothesis.',
      cofounderWillDo: 'Prepare a draft for review; no offer is accepted automatically.',
      expectedOutcome: 'A founder-controlled value, pricing, and constraint hypothesis.',
    },
    validation_next_step: {
      whyNow: 'Choose one controlled test that can reduce the most important uncertainty.',
      cofounderWillDo: 'Help frame a test and success criteria without claiming validation.',
      expectedOutcome: 'One founder-controlled experiment with explicit success criteria.',
    },
  };
  return {
    stage,
    objective: definition.recommendedObjective,
    ...details[stage],
    expectedEffort: stage === 'idea' ? 'About 5 minutes' : 'About 15 minutes',
    expectedMinutes: stage === 'idea' ? 5 : 15,
    status: 'ready',
    recommended: true,
  };
}

export function alternativeSteps(current: JourneyStage): RecommendedStepDraft[] {
  const alternatives: JourneyStage[] =
    current === 'idea'
      ? ['problem', 'evidence']
      : current === 'problem'
        ? ['customer', 'evidence']
        : current === 'validation_next_step'
          ? ['offer', 'evidence']
          : ['evidence', 'idea'];
  return alternatives.map((stage) => ({
    stage,
    objective: JOURNEY_STAGE_DEFINITIONS[stage].recommendedObjective,
    whyNow: `Useful if the current ${JOURNEY_STAGE_DEFINITIONS[current].label} work is the wrong next move.`,
    expectedEffort: 'Varies',
    expectedMinutes: 15,
    cofounderWillDo:
      'Stay inside the selected stage and keep accepted record state unchanged until you confirm.',
    expectedOutcome: JOURNEY_STAGE_DEFINITIONS[stage].primaryOutcome,
    status: 'proposed',
    recommended: false,
  }));
}
