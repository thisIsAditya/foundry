import { JourneyPhases, type JourneyPhase } from '@foundry/domain';

export type JourneyStep = {
  phase: JourneyPhase;
  title: string;
  description: string;
};

/**
 * Founder-facing labels for the backend's JourneyPhase enum. Order matches
 * JourneyPhases, so index comparisons double as progress calculations.
 */
export const JOURNEY_STEPS: readonly JourneyStep[] = [
  {
    phase: 'diagnose',
    title: 'Get oriented',
    description: 'Tell us about the idea so we can figure out what to tackle first.',
  },
  {
    phase: 'problem',
    title: 'Define the problem',
    description: 'Pin down the specific problem and who feels it most.',
  },
  {
    phase: 'evidence',
    title: 'Talk to real people',
    description: 'Interview real prospects to prove the problem is real, not assumed.',
  },
  {
    phase: 'market_and_competition',
    title: 'Study the market',
    description: 'Size the market and see who else is solving this.',
  },
  {
    phase: 'model_and_pricing',
    title: 'Set your pricing model',
    description: 'Decide how the business makes money and what it costs to deliver.',
  },
  {
    phase: 'willingness_to_pay',
    title: 'Prove people will pay',
    description: 'Get a real money signal, not a "sounds nice" from friends.',
  },
  {
    phase: 'product',
    title: 'Scope your first product',
    description: 'Define the smallest version worth building and where it stops.',
  },
  {
    phase: 'build_and_launch',
    title: 'Build & launch',
    description: 'Ship the first version and get it in front of customers.',
  },
  {
    phase: 'operate',
    title: 'Run & grow',
    description: 'Track real numbers and decide what to double down on.',
  },
] as const;

const stepIndexByPhase = new Map<JourneyPhase, number>(
  JOURNEY_STEPS.map((step, index) => [step.phase, index]),
);

export function journeyStepIndex(phase: JourneyPhase): number {
  return stepIndexByPhase.get(phase) ?? 0;
}

export function journeyStep(phase: JourneyPhase): JourneyStep {
  return JOURNEY_STEPS[journeyStepIndex(phase)] ?? JOURNEY_STEPS[0]!;
}

export const journeyPhaseCount = JourneyPhases.length;
