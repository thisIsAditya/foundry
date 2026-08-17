import { describe, expect, it } from 'vitest';

import {
  AlternativeIdSchema,
  AssumptionIdSchema,
  BeachheadIdSchema,
  CitationIdSchema,
  CompetitorIdSchema,
  ContentBlockIdSchema,
  DmuIdSchema,
  EvidenceItemIdSchema,
  InterviewIdSchema,
  MarketModelIdSchema,
  MetricDefinitionIdSchema,
  MetricObservationIdSchema,
  MoneyRulesIdSchema,
  PackRevisionIdSchema,
  PersonaIdSchema,
  ProblemIdSchema,
  ProjectIdSchema,
  ScoreDimensionWeights,
  ScoreDimensions,
  SourceSnapshotIdSchema,
  UnitEconomicsModelIdSchema,
  WedgeIdSchema,
  WtpEventIdSchema,
  type ScoreDimension,
} from '@foundry/domain';

import { calculateScore, type ScoringInputs } from './calculate-score.js';

const packRevisionId = PackRevisionIdSchema.parse('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
const projectId = ProjectIdSchema.parse('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
const at = new Date('2026-04-01T00:00:00.000Z');

function emptyInputs(): ScoringInputs {
  return {
    packRevisionId,
    problems: [],
    beachheads: [],
    personas: [],
    dmus: [],
    alternatives: [],
    competitors: [],
    marketModels: [],
    wedges: [],
    interviews: [],
    quotes: [],
    evidenceItems: [],
    citations: [],
    assumptions: [],
    moneyRules: [],
    unitEconomicsModels: [],
    wtpEvents: [],
    metricDefinitions: [],
    metricObservations: [],
    killLineCount: 0,
    legalItemCount: 0,
    moneyReconciliationWarningCount: 0,
    mvbpScopePassed: false,
    gateA: 'failed',
    gateB: 'failed',
    gateC: 'failed',
  };
}

function knownGoodInputs(): ScoringInputs {
  const problemId = ProblemIdSchema.parse('11111111-1111-4111-8111-111111111111');
  const beachheadId = BeachheadIdSchema.parse('22222222-2222-4222-8222-222222222222');
  const interviewId = InterviewIdSchema.parse('33333333-3333-4333-8333-333333333333');
  const citationId = CitationIdSchema.parse('44444444-4444-4444-8444-444444444444');
  const snapshotId = SourceSnapshotIdSchema.parse('55555555-5555-4555-8555-555555555555');
  const moneyRulesId = MoneyRulesIdSchema.parse('66666666-6666-4666-8666-666666666666');
  return {
    ...emptyInputs(),
    problems: [
      {
        id: problemId,
        packRevisionId,
        statement: 'Restaurant owners lose two hours closing the books every night',
        createdAt: at,
      },
    ],
    beachheads: [
      {
        id: beachheadId,
        packRevisionId,
        segmentDefinition: 'Pune independent restaurant owners with 2-5 sites',
        personaId: null,
        dmuId: null,
        createdAt: at,
      },
    ],
    personas: [
      {
        id: PersonaIdSchema.parse('77777777-7777-4777-8777-777777777777'),
        packRevisionId,
        beachheadId,
        profile: 'Owner-operator who closes the books after service',
        evidenceItemIds: [],
        createdAt: at,
      },
    ],
    dmus: [
      {
        id: DmuIdSchema.parse('88888888-8888-4888-8888-888888888888'),
        packRevisionId,
        beachheadId,
        user: 'Manager',
        champion: null,
        buyer: 'Owner',
        approver: null,
        veto: null,
        procurement: null,
        createdAt: at,
      },
    ],
    alternatives: [
      {
        id: AlternativeIdSchema.parse('99999999-9999-4999-8999-999999999991'),
        projectId,
        packRevisionId,
        problemId,
        description: 'Manual spreadsheet close',
        createdAt: at,
      },
      {
        id: AlternativeIdSchema.parse('99999999-9999-4999-8999-999999999992'),
        projectId,
        packRevisionId,
        problemId,
        description: 'Accountant after the fact',
        createdAt: at,
      },
    ],
    competitors: [
      {
        id: CompetitorIdSchema.parse('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'),
        projectId,
        name: 'Legacy POS vendor',
        sourceIds: [],
        createdAt: at,
      },
      {
        id: CompetitorIdSchema.parse('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'),
        projectId,
        name: 'Generic bookkeeping SaaS',
        sourceIds: [],
        createdAt: at,
      },
    ],
    marketModels: [
      {
        id: MarketModelIdSchema.parse('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1'),
        packRevisionId,
        formulaSpec: { kind: 'bottom_up', periodsPerYear: 12 },
        inputs: {
          totalAccounts: '1000',
          servedAccounts: '200',
          beachheadAccounts: '20',
          unitsPerAccountPerPeriod: '1',
          captureRate: '0.25',
          currency: 'INR',
        },
        computedResult: {
          tam: '100000',
          sam: '20000',
          som: '5000',
          volumeTam: '1000',
          volumeSam: '200',
          volumeSom: '50',
          price: '99',
          currency: 'INR',
          formula: 'accounts * price * capture',
          warnings: [],
        },
        createdAt: at,
      },
    ],
    wedges: [
      {
        id: WedgeIdSchema.parse('cccccccc-cccc-4ccc-8ccc-ccccccccccc1'),
        packRevisionId,
        statement: 'Close-the-books workflow beats generic ledgers',
        alternativeIds: [],
        evidenceItemIds: [],
        assumptionIds: [],
        createdAt: at,
      },
    ],
    interviews: [
      {
        id: interviewId,
        projectId,
        participantType: 'non_friend',
        consent: { given: true },
        conductedAt: at,
        createdAt: at,
      },
      {
        id: InterviewIdSchema.parse('33333333-3333-4333-8333-333333333334'),
        projectId,
        participantType: 'non_friend',
        consent: { given: true },
        conductedAt: at,
        createdAt: at,
      },
      {
        id: InterviewIdSchema.parse('33333333-3333-4333-8333-333333333335'),
        projectId,
        participantType: 'non_friend',
        consent: { given: true },
        conductedAt: at,
        createdAt: at,
      },
    ],
    evidenceItems: [
      {
        id: EvidenceItemIdSchema.parse('dddddddd-dddd-4ddd-8ddd-ddddddddddd1'),
        projectId,
        summary: 'Owners lose two hours closing',
        provenance: {
          kind: 'externally_verified',
          sourceIds: [],
          sourceSnapshotIds: [snapshotId],
          citationIds: [citationId],
          verifiedAt: at,
        },
        citationIds: [citationId],
        createdAt: at,
      },
      {
        id: EvidenceItemIdSchema.parse('dddddddd-dddd-4ddd-8ddd-ddddddddddd2'),
        projectId,
        summary: 'Independent operators pay for close help',
        provenance: {
          kind: 'externally_verified',
          sourceIds: [],
          sourceSnapshotIds: [snapshotId],
          citationIds: [citationId],
          verifiedAt: at,
        },
        citationIds: [citationId],
        createdAt: at,
      },
    ],
    citations: [
      {
        id: citationId,
        sourceSnapshotId: snapshotId,
        contentBlockId: ContentBlockIdSchema.parse('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1'),
        locator: { sourceSnapshotId: snapshotId, paragraph: 0 },
        createdAt: at,
      },
      {
        id: CitationIdSchema.parse('44444444-4444-4444-8444-444444444445'),
        sourceSnapshotId: snapshotId,
        contentBlockId: null,
        locator: { sourceSnapshotId: snapshotId, paragraph: 1 },
        createdAt: at,
      },
    ],
    assumptions: [
      {
        id: AssumptionIdSchema.parse('ffffffff-ffff-4fff-8fff-fffffffffff1'),
        projectId,
        statement: 'Owners will pay monthly',
        status: 'testing',
        createdAt: at,
        updatedAt: at,
      },
      {
        id: AssumptionIdSchema.parse('ffffffff-ffff-4fff-8fff-fffffffffff2'),
        projectId,
        statement: 'CA review is required before filing',
        status: 'untested',
        createdAt: at,
        updatedAt: at,
      },
    ],
    moneyRules: [
      {
        id: moneyRulesId,
        projectId,
        packRevisionId,
        currency: 'INR',
        unitOfSale: 'seat-month',
        price: '99',
        billingFrequency: 'monthly',
        costStructure: {
          cogs: '20',
          variableCostPerUnit: '5',
          cac: '150',
          lifetimePeriods: 24,
        },
        isCurrent: true,
        createdAt: at,
      },
    ],
    unitEconomicsModels: [
      {
        id: UnitEconomicsModelIdSchema.parse('12121212-1212-4121-8121-121212121211'),
        packRevisionId,
        moneyRulesId,
        margin: {
          price: '99',
          cogs: '20',
          variableCostPerUnit: '5',
          contribution: '74',
          grossMargin: '0.75',
          cac: '150',
          ltv: '1776',
          paybackPeriods: '3',
          ltvCac: '11.84',
          currency: 'INR',
          formula: 'ltv = contribution * lifetime',
          warnings: [],
        },
        cac: '150',
        ltv: '1776',
        payback: '3',
        sensitivity: null,
        createdAt: at,
      },
    ],
    wtpEvents: [
      {
        id: WtpEventIdSchema.parse('13131313-1313-4131-8131-131313131311'),
        experimentId: null,
        offerId: null,
        participantClass: 'independent_prospect',
        instrument: 'paid_pilot',
        amount: '5000',
        currency: 'INR',
        occurredAt: at,
      },
    ],
    metricDefinitions: [
      {
        id: MetricDefinitionIdSchema.parse('14141414-1414-4141-8141-141414141411'),
        projectId,
        name: 'paying_strangers',
        unit: 'count',
        calculationSpec: {},
        createdAt: at,
      },
      {
        id: MetricDefinitionIdSchema.parse('14141414-1414-4141-8141-141414141412'),
        projectId,
        name: 'repeat_usage',
        unit: 'count',
        calculationSpec: {},
        createdAt: at,
      },
      {
        id: MetricDefinitionIdSchema.parse('14141414-1414-4141-8141-141414141413'),
        projectId,
        name: 'retention',
        unit: 'count',
        calculationSpec: {},
        createdAt: at,
      },
    ],
    metricObservations: [
      {
        id: MetricObservationIdSchema.parse('15151515-1515-4151-8151-151515151511'),
        metricId: MetricDefinitionIdSchema.parse('14141414-1414-4141-8141-141414141411'),
        value: '2',
        observedAt: at,
      },
    ],
    killLineCount: 2,
    legalItemCount: 2,
    moneyReconciliationWarningCount: 0,
    mvbpScopePassed: true,
    gateA: 'passed',
    gateB: 'passed',
    gateC: 'passed',
  };
}

describe('calculateScore', () => {
  it('treats every empty dimension as unknown with zero contribution', () => {
    const score = calculateScore(emptyInputs());
    for (const key of ScoreDimensions) {
      expect(score.dimensions[key].basis).toBe('insufficient_data');
      expect(score.dimensions[key].raw).toBe(0);
      expect(score.dimensions[key].contribution).toBe(0);
      expect(score.dimensions[key].weight).toBe(ScoreDimensionWeights[key]);
    }
    expect(score.overall).toBe(0);
  });

  it('returns the known-good overall and per-dimension breakdown', () => {
    const score = calculateScore(knownGoodInputs());
    const expectedRaw: Record<ScoreDimension, number> = {
      customer_clarity: 5,
      evidence_strength: 5,
      market_support: 4,
      business_economics: 5,
      willingness_to_pay: 4,
      execution_readiness: 5,
      risk_control: 3.35,
    };
    for (const key of ScoreDimensions) {
      expect(score.dimensions[key].basis).toBe('known');
      expect(score.dimensions[key].raw).toBeCloseTo(expectedRaw[key], 5);
      expect(score.dimensions[key].contribution).toBeCloseTo(
        (expectedRaw[key] / 5) * ScoreDimensionWeights[key],
        5,
      );
    }
    expect(score.overall).toBe(90.7);
    expect(score.ruleVersion).toBe('2026-08-1');
  });

  it('ranks topActions by weight times remaining raw points and breaks ties by dimension order', () => {
    const empty = calculateScore(emptyInputs());
    expect(empty.topActions.map((item) => item.dimension)).toEqual([
      'evidence_strength',
      'customer_clarity',
      'market_support',
    ]);
    expect(empty.topActions[0]?.expectedImpact).toBe(ScoreDimensionWeights.evidence_strength * 5);

    const tied = calculateScore({
      ...emptyInputs(),
      problems: [
        {
          id: ProblemIdSchema.parse('16161616-1616-4161-8161-161616161611'),
          packRevisionId,
          statement: 'Restaurant owners lose two hours closing the books every night',
          createdAt: at,
        },
      ],
      beachheads: [
        {
          id: BeachheadIdSchema.parse('17171717-1717-4171-8171-171717171711'),
          packRevisionId,
          segmentDefinition: 'Pune independent restaurant owners',
          personaId: null,
          dmuId: null,
          createdAt: at,
        },
      ],
      personas: [
        {
          id: PersonaIdSchema.parse('18181818-1818-4181-8181-181818181811'),
          packRevisionId,
          beachheadId: BeachheadIdSchema.parse('17171717-1717-4171-8171-171717171711'),
          profile: 'Owner-operator',
          evidenceItemIds: [],
          createdAt: at,
        },
      ],
      dmus: [
        {
          id: DmuIdSchema.parse('19191919-1919-4191-8191-191919191911'),
          packRevisionId,
          beachheadId: BeachheadIdSchema.parse('17171717-1717-4171-8171-171717171711'),
          user: null,
          champion: null,
          buyer: 'Owner',
          approver: null,
          veto: null,
          procurement: null,
          createdAt: at,
        },
      ],
    });
    expect(tied.dimensions.customer_clarity.raw).toBe(5);
    expect(tied.topActions.every((item) => item.dimension !== 'customer_clarity')).toBe(true);
    expect(tied.topActions.map((item) => item.dimension)).toEqual([
      'evidence_strength',
      'market_support',
      'business_economics',
    ]);
    expect(tied.topActions[0]?.expectedImpact).toBe(ScoreDimensionWeights.evidence_strength * 5);
    expect(tied.topActions[1]?.expectedImpact).toBe(ScoreDimensionWeights.market_support * 5);
    expect(tied.topActions[2]?.expectedImpact).toBe(ScoreDimensionWeights.business_economics * 5);
  });

  it('feeds Gate A/B/C into evidence, willingness to pay, and execution readiness', () => {
    const base: ScoringInputs = {
      ...emptyInputs(),
      interviews: [
        {
          id: InterviewIdSchema.parse('1a1a1a1a-1a1a-41a1-81a1-1a1a1a1a1a11'),
          projectId,
          participantType: 'non_friend',
          consent: { given: true },
          conductedAt: at,
          createdAt: at,
        },
      ],
      wtpEvents: [
        {
          id: WtpEventIdSchema.parse('1b1b1b1b-1b1b-41b1-81b1-1b1b1b1b1b11'),
          experimentId: null,
          offerId: null,
          participantClass: 'independent_prospect',
          instrument: 'paid_pilot',
          amount: '1000',
          currency: 'INR',
          occurredAt: at,
        },
      ],
      metricDefinitions: [
        {
          id: MetricDefinitionIdSchema.parse('1c1c1c1c-1c1c-41c1-81c1-1c1c1c1c1c11'),
          projectId,
          name: 'paying_strangers',
          unit: 'count',
          calculationSpec: {},
          createdAt: at,
        },
      ],
    };
    const failed = calculateScore({ ...base, gateA: 'failed', gateB: 'failed', gateC: 'failed' });
    const passed = calculateScore({ ...base, gateA: 'passed', gateB: 'passed', gateC: 'passed' });
    expect(passed.dimensions.evidence_strength.raw).toBeGreaterThan(
      failed.dimensions.evidence_strength.raw,
    );
    expect(passed.dimensions.willingness_to_pay.raw).toBeGreaterThan(
      failed.dimensions.willingness_to_pay.raw,
    );
    expect(passed.dimensions.execution_readiness.raw).toBeGreaterThan(
      failed.dimensions.execution_readiness.raw,
    );
  });
});
