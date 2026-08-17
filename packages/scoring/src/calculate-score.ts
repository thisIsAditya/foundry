import {
  ScoreDimensionWeights,
  ScoreDimensions,
  type Alternative,
  type Assumption,
  type Beachhead,
  type Citation,
  type Competitor,
  type DimensionScore,
  type Dmu,
  type EvidenceItem,
  type GateResult,
  type Interview,
  type MarketModel,
  type MetricDefinition,
  type MetricObservation,
  type MoneyRules,
  type PackRevisionId,
  type Persona,
  type PlanScore,
  type Problem,
  type Quote,
  type ScoreDimension,
  type ScoreImprovementAction,
  type ScoreReason,
  type UnitEconomicsModel,
  type Wedge,
  type WtpEvent,
} from '@foundry/domain';

export const SCORE_RULE_VERSION = '2026-08-1';

export type ScoringInputs = {
  packRevisionId: PackRevisionId;
  problems: Problem[];
  beachheads: Beachhead[];
  personas: Persona[];
  dmus: Dmu[];
  alternatives: Alternative[];
  competitors: Competitor[];
  marketModels: MarketModel[];
  wedges: Wedge[];
  interviews: Interview[];
  quotes: Quote[];
  evidenceItems: EvidenceItem[];
  citations: Citation[];
  assumptions: Assumption[];
  moneyRules: MoneyRules[];
  unitEconomicsModels: UnitEconomicsModel[];
  wtpEvents: WtpEvent[];
  metricDefinitions: MetricDefinition[];
  metricObservations: MetricObservation[];
  killLineCount: number;
  legalItemCount: number;
  moneyReconciliationWarningCount: number;
  mvbpScopePassed: boolean;
  gateA: GateResult;
  gateB: GateResult;
  gateC: GateResult;
};

type DimensionResult = {
  score: DimensionScore;
  reasons: ScoreReason[];
  action: ScoreImprovementAction;
};

function clampRaw(value: number): number {
  return Math.max(0, Math.min(5, value));
}

function dimension(
  key: ScoreDimension,
  known: boolean,
  rawInput: number,
  reasons: string[],
  action: string,
): DimensionResult {
  const weight = ScoreDimensionWeights[key];
  const raw = known ? clampRaw(rawInput) : 0;
  const contribution = known ? (raw / 5) * weight : 0;
  return {
    score: {
      raw,
      weight,
      contribution,
      basis: known ? 'known' : 'insufficient_data',
    },
    reasons: reasons.slice(0, 3).map((message) => ({ dimension: key, message })),
    action: {
      dimension: key,
      action,
      expectedImpact: weight * (5 - raw),
    },
  };
}

function customerClarity(inputs: ScoringInputs): DimensionResult {
  const known =
    inputs.problems.length > 0 || inputs.beachheads.length > 0 || inputs.dmus.length > 0;
  const specificProblem = inputs.problems.some((item) => item.statement.trim().length >= 24);
  const specificBeachhead = inputs.beachheads.some(
    (item) => item.segmentDefinition.trim().length >= 16,
  );
  const hasDmu = inputs.dmus.length > 0 || inputs.beachheads.some((item) => item.dmuId !== null);
  const hasPersona = inputs.personas.length > 0;
  let raw = 1;
  if (specificProblem) raw += 1.2;
  if (specificBeachhead) raw += 1.2;
  if (hasPersona) raw += 0.8;
  if (hasDmu) raw += 0.8;
  const reasons: string[] = [];
  if (!specificProblem) reasons.push('Problem statement is missing or too generic.');
  if (!specificBeachhead) reasons.push('Beachhead is not a specific first customer segment.');
  if (!hasDmu) reasons.push('Decision-maker hypothesis is missing.');
  if (reasons.length === 0) reasons.push('Customer, beachhead, and decision-maker are named.');
  return dimension(
    'customer_clarity',
    known,
    raw,
    reasons,
    'Name a specific first customer, the problem they pay to solve, and who decides.',
  );
}

function evidenceStrength(inputs: ScoringInputs): DimensionResult {
  const known = inputs.interviews.length > 0 || inputs.evidenceItems.length > 0;
  const independent = inputs.interviews.filter((item) => item.participantType === 'non_friend');
  const ratio = inputs.interviews.length === 0 ? 0 : independent.length / inputs.interviews.length;
  let raw =
    independent.length * 0.8 + inputs.evidenceItems.length * 0.4 + inputs.citations.length * 0.2;
  if (ratio >= 0.5) raw += 0.8;
  if (inputs.gateA === 'passed') raw += 1.5;
  if (
    inputs.interviews.some((item) => item.participantType === 'friend') &&
    independent.length < 3
  ) {
    raw -= 0.8;
  }
  const reasons: string[] = [];
  if (independent.length < 3) {
    reasons.push(
      `${independent.length} of ${inputs.interviews.length} interviews are with non-friends, which is below independent validation.`,
    );
  }
  if (inputs.citations.length === 0) reasons.push('No citations are attached to evidence items.');
  if (inputs.gateA === 'passed') reasons.push('Gate A passed from stored interview evidence.');
  if (reasons.length === 0) reasons.push('Evidence includes independent interviews and citations.');
  return dimension(
    'evidence_strength',
    known,
    raw,
    reasons,
    'Add non-friend interviews with linked quotes and cite the sources.',
  );
}

function marketSupport(inputs: ScoringInputs): DimensionResult {
  const known =
    inputs.alternatives.length > 0 ||
    inputs.competitors.length > 0 ||
    inputs.marketModels.length > 0 ||
    inputs.wedges.length > 0;
  const computedMarkets = inputs.marketModels.filter((item) => item.computedResult !== null);
  const raw =
    Math.min(2, inputs.alternatives.length * 0.6) +
    Math.min(1.5, inputs.competitors.length * 0.5) +
    Math.min(1.5, computedMarkets.length) +
    Math.min(1, inputs.wedges.length * 0.8);
  const reasons: string[] = [];
  if (inputs.competitors.length === 0) reasons.push('No competitors are recorded.');
  if (computedMarkets.length === 0) {
    reasons.push('Market model has no computed, cited result.');
  }
  if (inputs.wedges.length === 0) reasons.push('Differentiation wedge is missing.');
  if (reasons.length === 0)
    reasons.push('Alternatives, competitors, and a computed market model are present.');
  return dimension(
    'market_support',
    known,
    raw,
    reasons,
    'Name alternatives and competitors, then compute market size from cited inputs.',
  );
}

function businessEconomics(inputs: ScoringInputs): DimensionResult {
  const current = inputs.moneyRules.filter((item) => item.isCurrent);
  const known = current.length > 0;
  const completeUnitEcon = inputs.unitEconomicsModels.filter(
    (item) => item.margin !== null && item.cac !== null && item.ltv !== null,
  );
  let raw = current.length > 0 ? 2.5 : 0;
  if (completeUnitEcon.length > 0) raw += 1.5;
  if (inputs.moneyReconciliationWarningCount === 0 && current.length > 0) raw += 1;
  else raw -= Math.min(1, inputs.moneyReconciliationWarningCount * 0.5);
  const reasons: string[] = [];
  if (current.length === 0) reasons.push('Canonical MoneyRules are not set.');
  if (completeUnitEcon.length === 0) reasons.push('Unit economics are incomplete.');
  if (inputs.moneyReconciliationWarningCount > 0) {
    reasons.push('Market or unit-economics figures do not match current MoneyRules.');
  }
  if (reasons.length === 0) reasons.push('MoneyRules and unit economics reconcile.');
  return dimension(
    'business_economics',
    known,
    raw,
    reasons,
    'Set current MoneyRules and complete unit economics against that price.',
  );
}

function willingnessToPay(inputs: ScoringInputs): DimensionResult {
  const known = inputs.wtpEvents.length > 0;
  const independent = inputs.wtpEvents.filter(
    (item) => item.participantClass === 'independent_prospect',
  );
  const credible = independent.filter((item) =>
    ['paid_pilot', 'invoice', 'deposit', 'loi', 'concierge'].includes(item.instrument),
  );
  let raw = credible.length * 2 + independent.length * 0.5;
  if (inputs.gateB === 'passed') raw += 1.5;
  const reasons: string[] = [];
  if (credible.length === 0) {
    reasons.push(
      'No independent paid-pilot, invoice, deposit, LOI, or concierge signal is recorded.',
    );
  }
  if (inputs.gateB === 'passed')
    reasons.push('Gate B passed from stored willingness-to-pay events.');
  if (reasons.length === 0) reasons.push('Independent willingness-to-pay signals are present.');
  return dimension(
    'willingness_to_pay',
    known,
    raw,
    reasons,
    'Record a paid signal from an independent prospect, not a friend or waitlist.',
  );
}

function executionReadiness(inputs: ScoringInputs): DimensionResult {
  const known =
    inputs.mvbpScopePassed ||
    inputs.metricDefinitions.length > 0 ||
    inputs.metricObservations.length > 0;
  let raw = inputs.mvbpScopePassed ? 2.5 : 1;
  if (inputs.metricDefinitions.length >= 3) raw += 1;
  if (inputs.metricObservations.length > 0) raw += 0.8;
  if (inputs.gateC === 'passed') raw += 1.2;
  const reasons: string[] = [];
  if (!inputs.mvbpScopePassed)
    reasons.push('MVBP is missing a hypothesis, payment path, or is too broad.');
  if (inputs.metricDefinitions.length === 0) reasons.push('No operating metrics are defined.');
  if (inputs.gateC === 'passed')
    reasons.push('Gate C passed from stored plan-versus-actual metrics.');
  if (reasons.length === 0) reasons.push('MVBP scope and operating metrics are in place.');
  return dimension(
    'execution_readiness',
    known,
    raw,
    reasons,
    'Scope one MVBP capability with a payment path and define kill-line metrics.',
  );
}

function riskControl(inputs: ScoringInputs): DimensionResult {
  const known =
    inputs.assumptions.length > 0 || inputs.killLineCount > 0 || inputs.legalItemCount > 0;
  const tested = inputs.assumptions.filter((item) =>
    ['testing', 'supported', 'held', 'contradicted', 'killed'].includes(item.status),
  );
  const ratio = inputs.assumptions.length === 0 ? 0 : tested.length / inputs.assumptions.length;
  const raw =
    ratio * 2.5 +
    Math.min(1.5, inputs.killLineCount * 0.8) +
    Math.min(1, inputs.legalItemCount * 0.3);
  const reasons: string[] = [];
  if (inputs.assumptions.length === 0) reasons.push('Open assumptions are not listed.');
  else
    reasons.push(`${tested.length} of ${inputs.assumptions.length} assumptions have been tested.`);
  if (inputs.killLineCount === 0) reasons.push('No kill lines are defined.');
  return dimension(
    'risk_control',
    known,
    raw,
    reasons,
    'List assumptions, mark which are untested, and write kill lines.',
  );
}

export type CalculatedScore = Omit<PlanScore, 'id' | 'calculatedAt'>;

export function calculateScore(
  inputs: ScoringInputs,
  ruleVersion: string = SCORE_RULE_VERSION,
): CalculatedScore {
  const results: Record<ScoreDimension, DimensionResult> = {
    customer_clarity: customerClarity(inputs),
    evidence_strength: evidenceStrength(inputs),
    market_support: marketSupport(inputs),
    business_economics: businessEconomics(inputs),
    willingness_to_pay: willingnessToPay(inputs),
    execution_readiness: executionReadiness(inputs),
    risk_control: riskControl(inputs),
  };
  const dimensions = Object.fromEntries(
    ScoreDimensions.map((key) => [key, results[key].score]),
  ) as PlanScore['dimensions'];
  const reasons = ScoreDimensions.flatMap((key) => results[key].reasons);
  const topActions = [...ScoreDimensions]
    .map((key) => results[key].action)
    .sort((a, b) => {
      const impactDiff = (b.expectedImpact ?? 0) - (a.expectedImpact ?? 0);
      if (impactDiff !== 0) {
        return impactDiff;
      }
      return ScoreDimensions.indexOf(a.dimension) - ScoreDimensions.indexOf(b.dimension);
    })
    .slice(0, 3);
  const overall = Number(
    ScoreDimensions.reduce((sum, key) => sum + results[key].score.contribution, 0).toFixed(2),
  );
  return {
    packRevisionId: inputs.packRevisionId,
    overall,
    dimensions,
    ruleVersion,
    reasons,
    topActions,
  };
}
