import { z } from 'zod';

import { InterviewIdSchema, QuoteIdSchema, SourceSnapshotIdSchema } from '../ids.js';
import { InstantSchema } from '../value-objects/primitives.js';

export const QuoteSchema = z.object({
  id: QuoteIdSchema,
  interviewId: InterviewIdSchema.nullable().default(null),
  sourceSnapshotId: SourceSnapshotIdSchema.nullable().default(null),
  textContent: z.string().min(1),
  createdAt: InstantSchema,
});
export type Quote = z.infer<typeof QuoteSchema>;
