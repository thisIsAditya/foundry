import { z } from 'zod';

import { AssumptionIdSchema, ProjectIdSchema } from '../ids.js';
import { AssumptionStatusSchema } from '../status/assumption-status.js';
import { InstantSchema } from '../value-objects/primitives.js';

export const AssumptionSchema = z.object({
  id: AssumptionIdSchema,
  projectId: ProjectIdSchema,
  statement: z.string().min(1),
  status: AssumptionStatusSchema,
  createdAt: InstantSchema,
  updatedAt: InstantSchema,
});
export type Assumption = z.infer<typeof AssumptionSchema>;
