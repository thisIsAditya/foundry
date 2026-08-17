import type { ProviderCapabilities } from '../providers/capabilities.js';

export type ModelProfileName =
  | 'coordinator'
  | 'researchWorker'
  | 'extractor'
  | 'critic'
  | 'financialAnalyst'
  | 'visionDocument'
  | 'codePlanner'
  | 'local';

type CapabilityName = keyof Omit<ProviderCapabilities, 'dataResidency'>;

export type ModelProfileSpec = {
  requiredCapabilities: readonly CapabilityName[];
  maxCostPerRunUsd: number;
  dataResidency: ProviderCapabilities['dataResidency'] | 'any';
};

export const MODEL_PROFILES = {
  coordinator: {
    requiredCapabilities: ['toolCalling', 'structuredOutput'],
    maxCostPerRunUsd: 0.5,
    dataResidency: 'any',
  },
  researchWorker: {
    requiredCapabilities: ['toolCalling'],
    maxCostPerRunUsd: 0.15,
    dataResidency: 'any',
  },
  extractor: {
    requiredCapabilities: ['structuredOutput'],
    maxCostPerRunUsd: 0.05,
    dataResidency: 'any',
  },
  critic: {
    requiredCapabilities: ['structuredOutput'],
    maxCostPerRunUsd: 0.3,
    dataResidency: 'any',
  },
  financialAnalyst: {
    requiredCapabilities: ['structuredOutput'],
    maxCostPerRunUsd: 0.2,
    dataResidency: 'any',
  },
  visionDocument: {
    requiredCapabilities: ['vision', 'structuredOutput'],
    maxCostPerRunUsd: 0.1,
    dataResidency: 'any',
  },
  codePlanner: {
    requiredCapabilities: ['codeGeneration', 'structuredOutput'],
    maxCostPerRunUsd: 0.15,
    dataResidency: 'any',
  },
  local: {
    requiredCapabilities: [],
    maxCostPerRunUsd: 0,
    dataResidency: 'in_region',
  },
} as const satisfies Record<ModelProfileName, ModelProfileSpec>;

export function profileSatisfied(
  profile: ModelProfileName,
  capabilities: ProviderCapabilities,
): boolean {
  const spec = MODEL_PROFILES[profile];
  if (spec.dataResidency !== 'any' && capabilities.dataResidency !== spec.dataResidency) {
    return false;
  }
  return spec.requiredCapabilities.every((name) => capabilities[name]);
}
