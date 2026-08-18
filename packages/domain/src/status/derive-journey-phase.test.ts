import { describe, expect, it } from 'vitest';

import {
  BusinessModelSectionKeys,
  type BusinessModelSectionStatus,
} from './business-model-section.js';
import { deriveJourneyPhase, type BusinessModelSectionSummary } from './derive-journey-phase.js';
import { ScoreDimensions, type DimensionScore, type ScoreDimension } from './score-dimension.js';

function scored(): Record<ScoreDimension, DimensionScore> {
  return Object.fromEntries(
    ScoreDimensions.map((dimension) => [
      dimension,
      { raw: 1, weight: 10, contribution: 1, basis: 'insufficient_data' as const },
    ]),
  ) as Record<ScoreDimension, DimensionScore>;
}

function sections(
  overrides: Partial<Record<BusinessModelSectionSummary['key'], BusinessModelSectionStatus>> = {},
): BusinessModelSectionSummary[] {
  return BusinessModelSectionKeys.map((key) => ({
    key,
    status: overrides[key] ?? 'draft',
  }));
}

function settled(
  extras: Partial<Record<BusinessModelSectionSummary['key'], BusinessModelSectionStatus>> = {},
): BusinessModelSectionSummary[] {
  return sections({
    context: 'supported',
    problem: 'supported',
    beachhead: 'supported',
    alternatives_competitors: 'supported',
    market_model: 'supported',
    business_model_money_rules: 'supported',
    pricing_unit_economics: 'supported',
    willingness_to_pay: 'supported',
    mvbp_kill_lines: 'supported',
    launch_operate: 'supported',
    ...extras,
  });
}

describe('deriveJourneyPhase', () => {
  it('returns diagnose when nothing has been scored or written', () => {
    expect(
      deriveJourneyPhase({
        sections: [],
        score: null,
        gateA: { passed: false },
        wtpEventCount: 0,
      }),
    ).toBe('diagnose');
    expect(
      deriveJourneyPhase({
        sections: sections(),
        score: null,
        gateA: { passed: false },
        wtpEventCount: 0,
      }),
    ).toBe('diagnose');
  });

  it('returns problem while problem or beachhead are still draft', () => {
    expect(
      deriveJourneyPhase({
        sections: sections({ context: 'supported' }),
        score: null,
        gateA: { passed: false },
        wtpEventCount: 0,
      }),
    ).toBe('problem');
    expect(
      deriveJourneyPhase({
        sections: sections({ context: 'supported', problem: 'supported' }),
        score: scored(),
        gateA: { passed: false },
        wtpEventCount: 0,
      }),
    ).toBe('problem');
  });

  it('returns evidence until Gate A passes', () => {
    expect(
      deriveJourneyPhase({
        sections: sections({
          context: 'supported',
          problem: 'supported',
          beachhead: 'supported',
        }),
        score: scored(),
        gateA: { passed: false },
        wtpEventCount: 0,
      }),
    ).toBe('evidence');
  });

  it('walks the remaining phases in JOURNEY_STEPS order', () => {
    const afterEvidence = {
      score: scored(),
      gateA: { passed: true },
    };

    expect(
      deriveJourneyPhase({
        ...afterEvidence,
        sections: settled({
          alternatives_competitors: 'assumption_heavy',
          market_model: 'assumption_heavy',
        }),
        wtpEventCount: 0,
      }),
    ).toBe('market_and_competition');

    expect(
      deriveJourneyPhase({
        ...afterEvidence,
        sections: settled({
          business_model_money_rules: 'draft',
          pricing_unit_economics: 'assumption_heavy',
        }),
        wtpEventCount: 0,
      }),
    ).toBe('model_and_pricing');

    expect(
      deriveJourneyPhase({
        ...afterEvidence,
        sections: settled({ willingness_to_pay: 'draft' }),
        wtpEventCount: 0,
      }),
    ).toBe('willingness_to_pay');

    expect(
      deriveJourneyPhase({
        ...afterEvidence,
        sections: settled({ mvbp_kill_lines: 'assumption_heavy' }),
        wtpEventCount: 2,
      }),
    ).toBe('product');

    expect(
      deriveJourneyPhase({
        ...afterEvidence,
        sections: settled({ launch_operate: 'supported' }),
        wtpEventCount: 2,
      }),
    ).toBe('build_and_launch');

    expect(
      deriveJourneyPhase({
        ...afterEvidence,
        sections: settled({ launch_operate: 'accepted' }),
        wtpEventCount: 2,
      }),
    ).toBe('operate');
  });
});
