import { limits } from '@foundry/config/limits';
import {
  DecimalStringSchema,
  type MetricDefinition,
  type MetricObservation,
} from '@foundry/domain';
import { z } from 'zod';

import { cmp } from './calculators/decimal.js';

const GateCSpecSchema = z.object({
  gateC: z.literal(true),
  key: z.enum(limits.gateC.requiredMetricKeys),
  threshold: DecimalStringSchema,
});

export type GateCCheck = {
  id: string;
  passed: boolean;
  detail: string;
};

export type GateCInput = {
  definitions: readonly MetricDefinition[];
  observations: readonly MetricObservation[];
};

export type GateCEvaluation = {
  result: 'passed' | 'failed';
  ruleVersion: number;
  checks: GateCCheck[];
};

function latestValue(metricId: MetricDefinition['id'], observations: readonly MetricObservation[]) {
  const matching = observations.filter((item) => item.metricId === metricId);
  return matching.at(-1);
}

export function evaluateGateC(input: GateCInput): GateCEvaluation {
  const registered = new Map<string, { definition: MetricDefinition; threshold: string }>();
  for (const definition of input.definitions) {
    const parsed = GateCSpecSchema.safeParse(definition.calculationSpec);
    if (!parsed.success) {
      continue;
    }
    registered.set(parsed.data.key, { definition, threshold: parsed.data.threshold });
  }

  const checks: GateCCheck[] = limits.gateC.requiredMetricKeys.map((key) => {
    const entry = registered.get(key);
    if (entry === undefined) {
      return {
        id: key,
        passed: false,
        detail: `${key} threshold was not registered before the experiment`,
      };
    }
    const observation = latestValue(entry.definition.id, input.observations);
    if (observation === undefined) {
      return {
        id: key,
        passed: false,
        detail: `${key} has a threshold but no observation`,
      };
    }
    const passed = cmp(observation.value, entry.threshold) >= 0;
    return {
      id: key,
      passed,
      detail: passed
        ? `${key} ${observation.value} meets ${entry.threshold}`
        : `${key} ${observation.value} is below ${entry.threshold}`,
    };
  });

  checks.push({
    id: 'thresholds_pre_registered',
    passed: registered.size === limits.gateC.requiredMetricKeys.length,
    detail:
      registered.size === limits.gateC.requiredMetricKeys.length
        ? 'All Gate C metrics were registered before evaluation'
        : 'Gate C cannot pass until every kill/success metric is registered',
  });

  return {
    result: checks.every((check) => check.passed) ? 'passed' : 'failed',
    ruleVersion: limits.gateC.ruleVersion,
    checks,
  };
}
