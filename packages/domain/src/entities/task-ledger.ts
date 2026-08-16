import { z } from 'zod';

import { SprintIdSchema, TaskLedgerIdSchema } from '../ids.js';
import { InstantSchema } from '../value-objects/primitives.js';

export const TaskLedgerSchema = z.object({
  id: TaskLedgerIdSchema,
  sprintId: SprintIdSchema,
  facts: z.unknown(),
  guesses: z.unknown(),
  plan: z.unknown(),
  planVersion: z.number().int().positive(),
  createdAt: InstantSchema,
});
export type TaskLedger = z.infer<typeof TaskLedgerSchema>;
