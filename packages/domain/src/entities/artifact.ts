import { z } from 'zod';

import { ArtifactIdSchema, ArtifactVersionIdSchema, ProjectIdSchema } from '../ids.js';
import { ArtifactTypeSchema } from '../status/money-status.js';
import { InstantSchema } from '../value-objects/primitives.js';

export const ArtifactSchema = z.object({
  id: ArtifactIdSchema,
  projectId: ProjectIdSchema,
  artifactType: ArtifactTypeSchema,
  currentVersionId: ArtifactVersionIdSchema.nullable().default(null),
  createdAt: InstantSchema,
});
export type Artifact = z.infer<typeof ArtifactSchema>;
