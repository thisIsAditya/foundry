import { z } from 'zod';

import {
  AlternativeIdSchema,
  PackRevisionIdSchema,
  ProblemIdSchema,
  ProjectIdSchema,
} from '../ids.js';
import { InstantSchema } from '../value-objects/primitives.js';

export const AlternativeSchema = z.object({
  id: AlternativeIdSchema,
  projectId: ProjectIdSchema,
  packRevisionId: PackRevisionIdSchema.nullable().default(null),
  problemId: ProblemIdSchema.nullable().default(null),
  description: z.string().min(1),
  createdAt: InstantSchema,
});
export type Alternative = z.infer<typeof AlternativeSchema>;
