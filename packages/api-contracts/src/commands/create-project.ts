import { FounderObjectiveSchema, WorkspaceIdSchema } from '@foundry/domain';
import { z } from 'zod';

import { IdempotencyKeySchema } from './idempotency.js';

export const CreateProjectInputSchema = z.object({
  workspaceId: WorkspaceIdSchema,
  name: z.string().min(1),
  geography: z.string().min(1).optional(),
  objective: FounderObjectiveSchema.optional(),
  founderPitch: z.string().min(1).optional(),
  constraints: z.string().min(1).optional(),
  urgency: z.enum(['now', 'soon', 'exploring']).optional(),
  customerHint: z.string().min(1).optional(),
  idempotencyKey: IdempotencyKeySchema,
});
export type CreateProjectInput = z.infer<typeof CreateProjectInputSchema>;
