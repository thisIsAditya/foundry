import { limits } from '@foundry/config/limits';
import type { WtpEvent } from '@foundry/domain';

const CREDIBLE_INSTRUMENTS = new Set(['paid_pilot', 'invoice', 'deposit', 'loi', 'concierge']);

export type GateBInput = {
  events: readonly WtpEvent[];
};

export type GateBCheck = {
  id: string;
  passed: boolean;
  detail: string;
};

export type GateBEvaluation = {
  result: 'passed' | 'failed';
  ruleVersion: number;
  checks: GateBCheck[];
  countedEventIds: string[];
};

function isCredible(event: WtpEvent): boolean {
  // plan/02 §6 Gate B: waitlist, comment, or simulated customer does not count.
  if (!CREDIBLE_INSTRUMENTS.has(event.instrument)) {
    return false;
  }
  // plan/09: friend-only payments do not pass Gate B; known contacts are not independent.
  return event.participantClass === 'independent_prospect';
}

export function evaluateGateB(input: GateBInput): GateBEvaluation {
  const counted = input.events.filter(isCredible);
  const interestOnly = input.events.filter(
    (event) => event.instrument === 'waitlist' || event.instrument === 'comment',
  );
  const friendOnly =
    input.events.length > 0 &&
    input.events.every((event) => event.participantClass === 'friend') &&
    counted.length === 0;

  const checks: GateBCheck[] = [
    {
      id: 'independent_money_signal',
      passed: counted.length >= limits.gateB.minIndependentMoneySignals,
      detail: `${counted.length} independent-prospect money signals (need ${limits.gateB.minIndependentMoneySignals})`,
    },
    {
      id: 'not_interest_only',
      passed: interestOnly.length === 0 || counted.length > 0,
      detail:
        counted.length > 0
          ? 'At least one credible instrument is present'
          : interestOnly.length > 0
            ? 'Waitlist or comment signals do not satisfy Gate B'
            : 'No interest-only signals',
    },
    {
      id: 'not_friend_only',
      passed: !friendOnly,
      detail: friendOnly
        ? 'Friend-only payments do not pass Gate B'
        : 'Signals are not friend-only',
    },
  ];

  return {
    result: checks.every((check) => check.passed) ? 'passed' : 'failed',
    ruleVersion: limits.gateB.ruleVersion,
    checks,
    countedEventIds: counted.map((event) => event.id),
  };
}
