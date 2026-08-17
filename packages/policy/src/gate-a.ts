import { limits } from '@foundry/config/limits';
import type { Beachhead, Dmu, Interview, Quote } from '@foundry/domain';
import { z } from 'zod';

const ConsentSchema = z
  .object({
    simulated: z.boolean().optional(),
    hypotheticalPitch: z.boolean().optional(),
  })
  .passthrough();

export type GateAInput = {
  interviews: readonly Interview[];
  quotes: readonly Quote[];
  beachheads: readonly Beachhead[];
  dmus: readonly Dmu[];
};

export type GateACheck = {
  id: string;
  passed: boolean;
  detail: string;
};

export type GateAEvaluation = {
  result: 'passed' | 'failed';
  ruleVersion: number;
  checks: GateACheck[];
  countedInterviewIds: string[];
};

function isQualifyingInterview(interview: Interview): boolean {
  const consent = ConsentSchema.safeParse(interview.consent);
  const flags = consent.success ? consent.data : {};
  // plan/02 §6 and plan/10 Phase 1: friend/simulated/pitch interviews never satisfy Gate A.
  if (interview.participantType !== 'non_friend') {
    return false;
  }
  if (flags.simulated === true || flags.hypotheticalPitch === true) {
    return false;
  }
  return true;
}

export function evaluateGateA(input: GateAInput): GateAEvaluation {
  const counted = input.interviews.filter(isQualifyingInterview);
  const countedIds = new Set(counted.map((item) => item.id));
  const linkedQuotes = input.quotes.filter(
    (quote) => quote.interviewId !== null && countedIds.has(quote.interviewId),
  );
  const interviewsWithQuotes = new Set(
    linkedQuotes
      .map((quote) => quote.interviewId)
      .filter((id): id is NonNullable<typeof id> => id !== null),
  );
  const hasBeachhead = input.beachheads.some((item) => item.segmentDefinition.trim().length > 0);
  const hasDmu = input.dmus.length > 0 || input.beachheads.some((item) => item.dmuId !== null);

  const checks: GateACheck[] = [
    {
      id: 'non_friend_interviews',
      passed: counted.length >= limits.gateA.minNonFriendInterviews,
      detail: `${counted.length} qualifying non-friend interviews (need ${limits.gateA.minNonFriendInterviews})`,
    },
    {
      id: 'quotes_linked',
      passed: linkedQuotes.length >= limits.gateA.minLinkedQuotes,
      detail: `${linkedQuotes.length} quotes linked to qualifying interviews (need ${limits.gateA.minLinkedQuotes})`,
    },
    {
      id: 'repeatable_pain',
      passed: interviewsWithQuotes.size >= limits.gateA.minDistinctInterviewsWithQuotes,
      detail: `${interviewsWithQuotes.size} qualifying interviews with quotes (need ${limits.gateA.minDistinctInterviewsWithQuotes})`,
    },
    {
      id: 'beachhead',
      passed: hasBeachhead,
      detail: hasBeachhead ? 'Beachhead segment is defined' : 'Beachhead segment is missing',
    },
    {
      id: 'decision_maker',
      passed: hasDmu,
      detail: hasDmu
        ? 'Decision-maker hypothesis is present'
        : 'Decision-maker hypothesis is missing',
    },
  ];

  return {
    result: checks.every((check) => check.passed) ? 'passed' : 'failed',
    ruleVersion: limits.gateA.ruleVersion,
    checks,
    countedInterviewIds: counted.map((item) => item.id),
  };
}
