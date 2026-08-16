import { z } from 'zod';

import { ArtifactIdSchema, ArtifactVersionIdSchema, ProjectIdSchema } from '../ids.js';
import { InstantSchema } from '../value-objects/primitives.js';

export const ArtifactSchema = z.object({
  id: ArtifactIdSchema,
  projectId: ProjectIdSchema,
  artifactType: z.string().min(1),
  currentVersionId: ArtifactVersionIdSchema.nullable().default(null),
  createdAt: InstantSchema,
});
export type Artifact = z.infer<typeof ArtifactSchema>;
