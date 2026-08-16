import { z } from 'zod';

import { PackRevisionIdSchema, ProblemIdSchema } from '../ids.js';
import { InstantSchema } from '../value-objects/primitives.js';

export const ProblemSchema = z.object({
  id: ProblemIdSchema,
  packRevisionId: PackRevisionIdSchema,
  statement: z.string().min(1),
  createdAt: InstantSchema,
});
export type Problem = z.infer<typeof ProblemSchema>;
