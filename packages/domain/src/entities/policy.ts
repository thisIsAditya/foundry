import { z } from 'zod';

import { PolicyIdSchema, ProjectIdSchema, WorkspaceIdSchema } from '../ids.js';
import { InstantSchema } from '../value-objects/primitives.js';

export const PolicySchema = z.object({
  id: PolicyIdSchema,
  workspaceId: WorkspaceIdSchema.nullable().default(null),
  projectId: ProjectIdSchema.nullable().default(null),
  policyType: z.string().min(1),
  rule: z.unknown(),
  createdAt: InstantSchema,
});
export type Policy = z.infer<typeof PolicySchema>;
