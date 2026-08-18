import type {
  BusinessModelSectionKey,
  BusinessModelSectionStatus,
} from './business-model-section.js';
import type { JourneyPhase } from './journey-status.js';
import type { DimensionScore, ScoreDimension } from './score-dimension.js';

export type BusinessModelSectionSummary = {
  key: BusinessModelSectionKey;
  status: BusinessModelSectionStatus;
};

export type DeriveJourneyPhaseInput = {
  sections: readonly BusinessModelSectionSummary[];
  score: Readonly<Record<ScoreDimension, DimensionScore>> | null;
  gateA: { passed: boolean };
  wtpEventCount: number;
};

const unresolved: ReadonlySet<BusinessModelSectionStatus> = new Set([
  'draft',
  'assumption_heavy',
  'researching',
  'needs_founder',
  'stale',
  'blocked',
]);

function statusOf(
  sections: readonly BusinessModelSectionSummary[],
  key: BusinessModelSectionKey,
): BusinessModelSectionStatus {
  return sections.find((section) => section.key === key)?.status ?? 'draft';
}

function isDraft(status: BusinessModelSectionStatus): boolean {
  return status === 'draft';
}

function isOpen(status: BusinessModelSectionStatus): boolean {
  return unresolved.has(status);
}

export function deriveJourneyPhase(input: DeriveJourneyPhaseInput): JourneyPhase {
  const context = statusOf(input.sections, 'context');
  const problem = statusOf(input.sections, 'problem');
  const beachhead = statusOf(input.sections, 'beachhead');
  const market = statusOf(input.sections, 'market_model');
  const alternatives = statusOf(input.sections, 'alternatives_competitors');
  const money = statusOf(input.sections, 'business_model_money_rules');
  const pricing = statusOf(input.sections, 'pricing_unit_economics');
  const wtp = statusOf(input.sections, 'willingness_to_pay');
  const mvbp = statusOf(input.sections, 'mvbp_kill_lines');
  const launch = statusOf(input.sections, 'launch_operate');

  // 09 §2: diagnose is "get oriented" — nothing has been written or scored yet.
  if (
    input.sections.length === 0 ||
    (input.score === null && isDraft(context) && isDraft(problem) && isDraft(beachhead))
  ) {
    return 'diagnose';
  }
  if (isDraft(problem) || isDraft(beachhead)) {
    return 'problem';
  }
  if (!input.gateA.passed) {
    return 'evidence';
  }
  if (isOpen(market) || isOpen(alternatives)) {
    return 'market_and_competition';
  }
  if (isOpen(money) || isOpen(pricing)) {
    return 'model_and_pricing';
  }
  if (input.wtpEventCount === 0 || isOpen(wtp)) {
    return 'willingness_to_pay';
  }
  if (isOpen(mvbp)) {
    return 'product';
  }
  if (launch !== 'accepted') {
    return 'build_and_launch';
  }
  return 'operate';
}
