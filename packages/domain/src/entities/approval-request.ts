import { z } from 'zod';

import { ApprovalRequestIdSchema, ProjectIdSchema, UserIdSchema } from '../ids.js';
import { ApprovalStatusSchema } from '../status/approval-status.js';
import { InstantSchema } from '../value-objects/primitives.js';

export const ApprovalRequestSchema = z.object({
  id: ApprovalRequestIdSchema,
  projectId: ProjectIdSchema,
  actionType: z.string().min(1),
  payload: z.unknown(),
  payloadHash: z.string().min(1),
  status: ApprovalStatusSchema,
  requestedBy: z.string().min(1),
  decidedByUserId: UserIdSchema.nullable().default(null),
  expiresAt: InstantSchema,
  createdAt: InstantSchema,
  decidedAt: InstantSchema.nullable().default(null),
});
export type ApprovalRequest = z.infer<typeof ApprovalRequestSchema>;
