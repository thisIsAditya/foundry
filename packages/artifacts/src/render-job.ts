import {
  ArtifactTypeSchema,
  ArtifactVersionIdSchema,
  PackRevisionIdSchema,
  ProjectIdSchema,
  WorkspaceIdSchema,
} from '@foundry/domain';
import { z } from 'zod';

export const RenderJobDataSchema = z.object({
  artifactVersionId: ArtifactVersionIdSchema,
  projectId: ProjectIdSchema,
  workspaceId: WorkspaceIdSchema,
  artifactType: ArtifactTypeSchema,
  packRevisionId: PackRevisionIdSchema,
  correlationId: z.string().min(1),
});
export type RenderJobData = z.infer<typeof RenderJobDataSchema>;
