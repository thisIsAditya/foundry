import { FounderObjectiveSchema, WorkspaceIdSchema } from '@foundry/domain';
import { z } from 'zod';

import { IdempotencyKeySchema } from './idempotency.js';

export const CreateProjectInputSchema = z.object({
  workspaceId: WorkspaceIdSchema,
  name: z.string().min(1),
  geography: z.string().min(1).optional(),
  objective: FounderObjectiveSchema.optional(),
  idempotencyKey: IdempotencyKeySchema,
});
export type CreateProjectInput = z.infer<typeof CreateProjectInputSchema>;
