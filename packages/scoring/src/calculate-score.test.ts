import { describe, expect, it } from 'vitest';

import { BeachheadIdSchema, PackRevisionIdSchema, ProblemIdSchema } from '@foundry/domain';

import { calculateScore, type ScoringInputs } from './calculate-score.js';

const packRevisionId = PackRevisionIdSchema.parse('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');

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

describe('calculateScore', () => {
  it('treats missing data as unknown with zero contribution', () => {
    const score = calculateScore(emptyInputs());
    expect(score.dimensions.evidence_strength.basis).toBe('insufficient_data');
    expect(score.dimensions.evidence_strength.contribution).toBe(0);
    expect(score.dimensions.willingness_to_pay.basis).toBe('insufficient_data');
    expect(score.overall).toBe(0);
    expect(score.topActions).toHaveLength(3);
  });

  it('raises customer clarity when a specific problem and beachhead exist', () => {
    const score = calculateScore({
      ...emptyInputs(),
      problems: [
        {
          id: ProblemIdSchema.parse('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
          packRevisionId,
          statement: 'Restaurant owners lose two hours closing the books every night',
          createdAt: new Date('2026-04-01T00:00:00.000Z'),
        },
      ],
      beachheads: [
        {
          id: BeachheadIdSchema.parse('cccccccc-cccc-4ccc-8ccc-cccccccccccc'),
          packRevisionId,
          segmentDefinition: 'Pune independent restaurant owners with 2-5 sites',
          personaId: null,
          dmuId: null,
          createdAt: new Date('2026-04-01T00:00:00.000Z'),
        },
      ],
    });
    expect(score.dimensions.customer_clarity.basis).toBe('known');
    expect(score.dimensions.customer_clarity.raw).toBeGreaterThan(2);
    expect(score.overall).toBeGreaterThan(0);
  });
});
