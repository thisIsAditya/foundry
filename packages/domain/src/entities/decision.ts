import { z } from 'zod';

import {
  DecisionIdSchema,
  GateIdSchema,
  ProjectIdSchema,
  SprintIdSchema,
  UserIdSchema,
} from '../ids.js';
import { InstantSchema } from '../value-objects/primitives.js';

export const DecisionSchema = z.object({
  id: DecisionIdSchema,
  projectId: ProjectIdSchema,
  options: z.unknown(),
  chosen: z.unknown(),
  rationale: z.string().nullable().default(null),
  evidenceRefs: z.unknown().nullable().default(null),
  gateId: GateIdSchema.nullable().default(null),
  sprintId: SprintIdSchema.nullable().default(null),
  decidedByUserId: UserIdSchema.nullable().default(null),
  createdAt: InstantSchema,
});
export type Decision = z.infer<typeof DecisionSchema>;
