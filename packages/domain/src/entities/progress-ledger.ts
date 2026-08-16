import { z } from 'zod';

import { ProgressLedgerEntryIdSchema, SprintIdSchema } from '../ids.js';
import { InstantSchema } from '../value-objects/primitives.js';

export const ProgressLedgerEntrySchema = z.object({
  id: ProgressLedgerEntryIdSchema,
  sprintId: SprintIdSchema,
  sequenceNo: z.number().int().nonnegative(),
  eventType: z.string().min(1),
  payload: z.unknown(),
  createdAt: InstantSchema,
});
export type ProgressLedgerEntry = z.infer<typeof ProgressLedgerEntrySchema>;
