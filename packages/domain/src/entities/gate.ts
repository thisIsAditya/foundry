import { z } from 'zod';

import { GateIdSchema, ProjectIdSchema } from '../ids.js';
import { GateResultSchema, GateTypeSchema } from '../status/execution-status.js';
import { InstantSchema } from '../value-objects/primitives.js';

export const GateSchema = z.object({
  id: GateIdSchema,
  projectId: ProjectIdSchema,
  gateType: GateTypeSchema,
  ruleVersion: z.number().int().positive(),
  inputs: z.unknown(),
  result: GateResultSchema,
  evaluatedAt: InstantSchema,
});
export type Gate = z.infer<typeof GateSchema>;
