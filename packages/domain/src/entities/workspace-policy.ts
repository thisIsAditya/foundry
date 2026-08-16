import { z } from 'zod';

import { ProjectIdSchema, WorkspaceIdSchema, WorkspacePolicyIdSchema } from '../ids.js';
import { InstantSchema } from '../value-objects/primitives.js';

export const WorkspacePolicySchema = z.object({
  id: WorkspacePolicyIdSchema,
  workspaceId: WorkspaceIdSchema,
  projectId: ProjectIdSchema.nullable().default(null),
  retention: z.record(z.string(), z.unknown()),
  provider: z.record(z.string(), z.unknown()),
  tool: z.record(z.string(), z.unknown()),
  approval: z.record(z.string(), z.unknown()),
  createdAt: InstantSchema,
});
export type WorkspacePolicy = z.infer<typeof WorkspacePolicySchema>;
