import { z } from 'zod';

import { IdempotencyKeySchema } from './idempotency.js';

export const CreateWorkspaceInputSchema = z.object({
  name: z.string().min(1),
  idempotencyKey: IdempotencyKeySchema,
});
export type CreateWorkspaceInput = z.infer<typeof CreateWorkspaceInputSchema>;
