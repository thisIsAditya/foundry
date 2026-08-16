import { z } from 'zod';

import { UserIdSchema } from '../ids.js';
import { InstantSchema } from './primitives.js';

export const ConfidenceSchema = z.object({
  label: z.string().min(1),
  basis: z.string().min(1),
  reviewerUserId: UserIdSchema.nullable().default(null),
  expiresAt: InstantSchema.nullable().default(null),
});
export type Confidence = z.infer<typeof ConfidenceSchema>;
