import { z } from 'zod';

import { NotificationEndpointIdSchema, UserIdSchema, WorkspaceIdSchema } from '../ids.js';
import { NotificationChannelSchema } from '../status/execution-status.js';
import { InstantSchema } from '../value-objects/primitives.js';

export const NotificationEndpointSchema = z.object({
  id: NotificationEndpointIdSchema,
  userId: UserIdSchema,
  workspaceId: WorkspaceIdSchema,
  channel: NotificationChannelSchema,
  target: z.string().min(1),
  consentedAt: InstantSchema,
  revokedAt: InstantSchema.nullable().default(null),
});
export type NotificationEndpoint = z.infer<typeof NotificationEndpointSchema>;
