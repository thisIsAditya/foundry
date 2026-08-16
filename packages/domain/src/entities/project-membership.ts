import { z } from 'zod';

import { ProjectIdSchema, ProjectMembershipIdSchema, UserIdSchema } from '../ids.js';
import { WorkspaceRoleSchema } from '../status/workspace-status.js';
import { InstantSchema } from '../value-objects/primitives.js';

export const ProjectMembershipSchema = z.object({
  id: ProjectMembershipIdSchema,
  projectId: ProjectIdSchema,
  userId: UserIdSchema,
  roleOverride: WorkspaceRoleSchema.nullable().default(null),
  createdAt: InstantSchema,
});
export type ProjectMembership = z.infer<typeof ProjectMembershipSchema>;
