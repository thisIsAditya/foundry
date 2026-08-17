import type { AgentDefinition } from '@foundry/domain';
import { RiskClassSchema, type RiskClass } from '@foundry/domain';
import { z } from 'zod';

const CapabilitiesSchema = z
  .object({
    modelProfile: z.string().min(1).optional(),
    toolAllowlist: z.array(z.string()).optional(),
  })
  .passthrough();

const PolicyDefaultsSchema = z
  .object({
    maxToolRiskClass: RiskClassSchema.optional(),
  })
  .passthrough();

export type AgentRuntimeCapabilities = {
  modelProfile: string;
  toolAllowlist: string[];
  maxToolRiskClass: RiskClass;
};

/**
 * Reads the loosely-typed `capabilities`/`policyDefaults` JSON columns off an
 * `AgentDefinition` row with safe defaults, so callers never have to guess shape.
 */
export function readAgentCapabilities(
  definition: AgentDefinition | null,
): AgentRuntimeCapabilities {
  const capabilities = CapabilitiesSchema.safeParse(definition?.capabilities);
  const policyDefaults = PolicyDefaultsSchema.safeParse(definition?.policyDefaults);
  return {
    modelProfile:
      (capabilities.success ? capabilities.data.modelProfile : undefined) ?? 'coordinator',
    toolAllowlist: (capabilities.success ? capabilities.data.toolAllowlist : undefined) ?? [],
    maxToolRiskClass:
      (policyDefaults.success ? policyDefaults.data.maxToolRiskClass : undefined) ?? 'compute',
  };
}
