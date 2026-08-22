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
  const contextKnown =
    hasText(context.geography) ||
    (hasText(context.objective) && context.objective !== 'undecided') ||
    hasText(context.constraints) ||
    hasText(context.urgency);

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

  if (!contextKnown) {
    return {
      stage: 'idea',
      objective: 'Record the goal, geography, constraints, or urgency that would change the path.',
      whyNow:
        'These details are optional except when they change the first recommended investigation.',
      expectedEffort: 'About 5 minutes',
      expectedMinutes: 5,
      cofounderWillDo: 'Explain how each choice changes the recommended next step.',
      expectedOutcome: 'Founder context on the record, still labelled as founder input.',
      status: 'ready',
      recommended: true,
    };
  }

  if (!hasText(context.customerHint)) {
    return {
      stage: 'problem',
      objective: JOURNEY_STAGE_DEFINITIONS.problem.recommendedObjective,
      whyNow:
        'A solution, market, or research sprint would invent facts. The next useful work is a testable problem statement.',
      expectedEffort: 'About 15 minutes',
      expectedMinutes: 15,
      cofounderWillDo:
        'Turn the idea into candidate problem statements without inventing a customer.',
      expectedOutcome: 'A problem hypothesis marked as founder input or unverified, not as proof.',
      status: 'ready',
      recommended: true,
    };
  }

  return {
    stage: 'customer',
    objective: JOURNEY_STAGE_DEFINITIONS.customer.recommendedObjective,
    whyNow: 'A named customer lets us judge evidence, alternatives, and the first experiment.',
    expectedEffort: 'About 15 minutes',
    expectedMinutes: 15,
    cofounderWillDo: 'Compare plausible beachheads and explain the trade-offs.',
    expectedOutcome: 'A beachhead candidate with explicit uncertainty.',
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
