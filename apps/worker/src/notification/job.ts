import {
  ApprovalRequestIdSchema,
  NotificationJobKindSchema,
  ProjectIdSchema,
  WorkspaceIdSchema,
} from '@foundry/domain';
import { z } from 'zod';

export const NotificationJobDataSchema = z.object({
  kind: NotificationJobKindSchema,
  correlationId: z.uuid(),
  projectId: ProjectIdSchema.optional(),
  workspaceId: WorkspaceIdSchema.optional(),
  approvalId: ApprovalRequestIdSchema.optional(),
});
export type NotificationJobData = z.infer<typeof NotificationJobDataSchema>;
