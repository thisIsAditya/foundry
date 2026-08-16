import { z } from 'zod';

import { ProjectIdSchema, SprintIdSchema } from '../ids.js';
import { SprintStatusSchema } from '../status/execution-status.js';
import { DecimalStringSchema, InstantSchema } from '../value-objects/primitives.js';
import { SprintContractSchema } from './sprint-contract.js';

export const SprintSchema = z.object({
  id: SprintIdSchema,
  projectId: ProjectIdSchema,
  status: SprintStatusSchema,
  contract: SprintContractSchema,
  budgetReservedUsd: DecimalStringSchema,
  budgetUsedUsd: DecimalStringSchema,
  closedReason: z.string().nullable().default(null),
  createdAt: InstantSchema,
  updatedAt: InstantSchema,
});
export type Sprint = z.infer<typeof SprintSchema>;
