import {
  MetricDefinitionIdSchema,
  MetricObservationIdSchema,
  ProjectIdSchema,
  type MetricDefinition,
} from '@foundry/domain';
import { describe, expect, it } from 'vitest';

import { evaluateGateC } from './gate-c.js';

function definition(id: string, key: string, threshold: string): MetricDefinition {
  return {
    id: MetricDefinitionIdSchema.parse(id),
    projectId: ProjectIdSchema.parse('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
    name: key,
    unit: 'count',
    calculationSpec: { gateC: true, key, threshold },
    createdAt: new Date('2026-04-01T00:00:00.000Z'),
  };
}

describe('evaluateGateC', () => {
  it('fails when thresholds were not registered first', () => {
    const result = evaluateGateC({ definitions: [], observations: [] });
    expect(result.result).toBe('failed');
    expect(result.checks.find((check) => check.id === 'thresholds_pre_registered')?.passed).toBe(
      false,
    );
  });

  it('passes when every registered Gate C metric meets its threshold', () => {
    const keys = [
      'paying_strangers',
      'repeat_usage',
      'contribution_margin',
      'retention',
      'distribution',
    ] as const;
    const definitions = keys.map((key, index) =>
      definition(`11111111-1111-4111-8111-11111111111${index}`, key, '1'),
    );
    const observations = definitions.map((item, index) => ({
      id: MetricObservationIdSchema.parse(`22222222-2222-4222-8222-22222222222${index}`),
      metricId: item.id,
      value: '2',
      observedAt: new Date('2026-05-01T00:00:00.000Z'),
    }));
    const result = evaluateGateC({ definitions, observations });
    expect(result.result).toBe('passed');
  });
});
