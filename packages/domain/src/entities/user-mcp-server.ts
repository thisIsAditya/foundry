import { z } from 'zod';

import { UserIdSchema, UserMcpServerIdSchema } from '../ids.js';
import { McpHealthStatusSchema, McpTransportSchema } from '../status/output-status.js';
import { InstantSchema } from '../value-objects/primitives.js';

export const UserMcpServerSchema = z.object({
  id: UserMcpServerIdSchema,
  userId: UserIdSchema,
  name: z.string().min(1),
  transport: McpTransportSchema,
  url: z.url(),
  headersEncrypted: z.string().nullable().default(null),
  enabled: z.boolean(),
  healthStatus: McpHealthStatusSchema,
  lastToolCount: z.number().int().nonnegative().nullable().default(null),
  lastValidatedAt: InstantSchema.nullable().default(null),
  createdAt: InstantSchema,
});
export type UserMcpServer = z.infer<typeof UserMcpServerSchema>;
