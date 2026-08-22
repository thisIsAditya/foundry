import {
  CofounderOperationIdSchema,
  ProjectIdSchema,
  UserIdSchema,
  WorkspaceIdSchema,
} from '@foundry/domain';
import { z } from 'zod';

export const CofounderJobDataSchema = z.object({
  operationId: CofounderOperationIdSchema,
  projectId: ProjectIdSchema,
  workspaceId: WorkspaceIdSchema,
  actorUserId: UserIdSchema,
  correlationId: z.string().min(1),
});
export type CofounderJobData = z.infer<typeof CofounderJobDataSchema>;
