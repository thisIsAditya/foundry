import { WorkspaceIdSchema } from '@foundry/domain';
import { z } from 'zod';

export const ListProjectsInputSchema = z.object({
  workspaceId: WorkspaceIdSchema,
});
export type ListProjectsInput = z.infer<typeof ListProjectsInputSchema>;
