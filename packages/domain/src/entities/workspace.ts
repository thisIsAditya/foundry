import { z } from 'zod';

import { UserIdSchema, WorkspaceIdSchema } from '../ids.js';
import { WorkspacePlanSchema, WorkspaceStatusSchema } from '../status/workspace-status.js';
import { InstantSchema } from '../value-objects/primitives.js';

export const WorkspaceSchema = z.object({
  id: WorkspaceIdSchema,
  name: z.string().min(1),
  ownerUserId: UserIdSchema,
  plan: WorkspacePlanSchema,
  defaultProviderPolicy: z.record(z.string(), z.unknown()),
  defaultRetentionPolicy: z.record(z.string(), z.unknown()),
  locale: z.string().min(1),
  timezone: z.string().min(1),
  status: WorkspaceStatusSchema,
  createdAt: InstantSchema,
  updatedAt: InstantSchema,
});
export type Workspace = z.infer<typeof WorkspaceSchema>;
