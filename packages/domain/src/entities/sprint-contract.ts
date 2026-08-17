import { z } from 'zod';

import { PackRevisionIdSchema, SprintContractIdSchema, SprintIdSchema } from '../ids.js';
import { GateTypeSchema } from '../status/execution-status.js';
import { JourneyPhaseSchema } from '../status/journey-status.js';
import { CostEstimateSchema } from '../value-objects/cost-estimate.js';
import { InstantSchema } from '../value-objects/primitives.js';
import { RiskClassSchema } from '../value-objects/risk-class.js';
import { SchemaRefSchema } from '../value-objects/schema-ref.js';

export const SprintWorkerSpecSchema = z.object({
  name: z.string().min(1),
  readsOnly: z.boolean(),
  writeTargets: z.array(z.string()),
});
export type SprintWorkerSpec = z.infer<typeof SprintWorkerSpecSchema>;

export const SprintContractSchema = z.object({
  id: SprintContractIdSchema,
  sprintId: SprintIdSchema,
  objective: z.string().min(1),
  whyNow: z.string().min(1),
  phase: JourneyPhaseSchema,
  packRevisionId: PackRevisionIdSchema,
  relevantEvidence: z.array(z.string()),
  inputs: z.unknown(),
  outputSchema: SchemaRefSchema,
  toolAllowlist: z.array(z.string()),
  riskPolicy: RiskClassSchema,
  budget: CostEstimateSchema,
  qualityChecks: z.array(z.string()),
  stopConditions: z.array(z.string()),
  promptVersion: z.string().min(1),
  maxWorkers: z.number().int().positive(),
  maxStalls: z.number().int().positive(),
  workers: z.array(SprintWorkerSpecSchema),
  gateType: GateTypeSchema.nullable().default(null),
  createdAt: InstantSchema,
});
export type SprintContract = z.infer<typeof SprintContractSchema>;
