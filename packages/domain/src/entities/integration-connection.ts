import { z } from 'zod';

import { IntegrationConnectionIdSchema, WorkspaceIdSchema } from '../ids.js';
import { IntegrationProviderSchema } from '../status/output-status.js';
import { InstantSchema } from '../value-objects/primitives.js';

export const IntegrationConnectionSchema = z.object({
  id: IntegrationConnectionIdSchema,
  workspaceId: WorkspaceIdSchema,
  provider: IntegrationProviderSchema,
  authRefEncrypted: z.string().min(1),
  scope: z.unknown().nullable().default(null),
  revokedAt: InstantSchema.nullable().default(null),
  createdAt: InstantSchema,
});
export type IntegrationConnection = z.infer<typeof IntegrationConnectionSchema>;
