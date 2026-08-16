import { z } from 'zod';

import { UserIdSchema, WorkspaceIdSchema, WorkspaceMembershipIdSchema } from '../ids.js';
import { WorkspaceRoleSchema } from '../status/workspace-status.js';
import { InstantSchema } from '../value-objects/primitives.js';

export const WorkspaceMembershipSchema = z.object({
  id: WorkspaceMembershipIdSchema,
  workspaceId: WorkspaceIdSchema,
  userId: UserIdSchema,
  role: WorkspaceRoleSchema,
  invitedBy: UserIdSchema.nullable().default(null),
  createdAt: InstantSchema,
});
export type WorkspaceMembership = z.infer<typeof WorkspaceMembershipSchema>;
