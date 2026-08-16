import { z } from 'zod';

import {
  ArtifactIdSchema,
  ArtifactVersionIdSchema,
  PackRevisionIdSchema,
  TemplateIdSchema,
} from '../ids.js';
import { ArtifactStatusSchema } from '../status/artifact-status.js';
import { InstantSchema } from '../value-objects/primitives.js';

export const ArtifactVersionSchema = z.object({
  id: ArtifactVersionIdSchema,
  artifactId: ArtifactIdSchema,
  versionNumber: z.number().int().positive(),
  packRevisionId: PackRevisionIdSchema,
  templateId: TemplateIdSchema.nullable().default(null),
  s3Key: z.string().min(1),
  status: ArtifactStatusSchema,
  citations: z.unknown().nullable().default(null),
  createdAt: InstantSchema,
});
export type ArtifactVersion = z.infer<typeof ArtifactVersionSchema>;
