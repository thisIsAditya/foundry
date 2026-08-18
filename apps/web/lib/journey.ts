import { JourneyPhases, type JourneyPhase } from '@foundry/domain';

export type JourneyStep = {
  phase: JourneyPhase;
  title: string;
  description: string;
  /**
   * Guard that must hold before `deriveJourneyPhase` will leave this state.
   * `null` means the state is absorbing (operate).
   */
  exitWhen: string | null;
};

export type JourneyNodeStatus = 'cleared' | 'current' | 'ahead';

/**
 * Founder-facing labels for the backend's JourneyPhase enum. Order matches
 * JourneyPhases and `deriveJourneyPhase`: the machine always sits on the
 * first state whose exit guard is still false. Earlier states can reopen
 * if their facts go stale.
 */
export const JOURNEY_STEPS: readonly JourneyStep[] = [
  {
    phase: 'diagnose',
    title: 'Get oriented',
    description: 'Tell us about the idea so we can figure out what to tackle first.',
    exitWhen: 'The idea is on the page — something is written or scored.',
  },
  {
    phase: 'problem',
    title: 'Define the problem',
    description: 'Pin down the specific problem and who feels it most.',
    exitWhen: 'The problem and the customer who has it are both named.',
  },
  {
    phase: 'evidence',
    title: 'Talk to real people',
    description: 'Interview real prospects to prove the problem is real, not assumed.',
    exitWhen: 'Gate A: enough independent interviews, not friends and family.',
  },
  {
    phase: 'market_and_competition',
    title: 'Study the market',
    description: 'Size the market and see who else is solving this.',
    exitWhen: 'Market size and competitors are settled enough to price against.',
  },
  {
    phase: 'model_and_pricing',
    title: 'Set your pricing model',
    description: 'Decide how the business makes money and what it costs to deliver.',
    exitWhen: 'How you make money, and what it costs to deliver, are written down.',
  },
  {
    phase: 'willingness_to_pay',
    title: 'Prove people will pay',
    description: 'Get a real money signal, not a "sounds nice" from friends.',
    exitWhen: 'A real money signal exists — not a compliment from someone you know.',
  },
  {
    phase: 'product',
    title: 'Scope your first product',
    description: 'Define the smallest version worth building and where it stops.',
    exitWhen: 'The smallest product, and the lines that kill it, are set.',
  },
  {
    phase: 'build_and_launch',
    title: 'Build & launch',
    description: 'Ship the first version and get it in front of customers.',
    exitWhen: 'The launch plan is accepted.',
  },
  {
    phase: 'operate',
    title: 'Run & grow',
    description: 'Track real numbers and decide what to double down on.',
    exitWhen: null,
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

export function nextJourneyPhase(phase: JourneyPhase): JourneyPhase | null {
  return JOURNEY_STEPS[journeyStepIndex(phase) + 1]?.phase ?? null;
}

export function journeyNodeStatus(current: JourneyPhase, phase: JourneyPhase): JourneyNodeStatus {
  const here = journeyStepIndex(current);
  const there = journeyStepIndex(phase);
  if (there < here) {
    return 'cleared';
  }
  if (there === here) {
    return 'current';
  }
  return 'ahead';
}

export const journeyPhaseCount = JourneyPhases.length;
