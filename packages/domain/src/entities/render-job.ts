import { z } from 'zod';

import { ArtifactVersionIdSchema, RenderJobIdSchema } from '../ids.js';
import { RenderJobStatusSchema } from '../status/output-status.js';
import { InstantSchema } from '../value-objects/primitives.js';

export const RenderJobSchema = z.object({
  id: RenderJobIdSchema,
  artifactVersionId: ArtifactVersionIdSchema,
  status: RenderJobStatusSchema,
  errorMessage: z.string().nullable().default(null),
  createdAt: InstantSchema,
  finishedAt: InstantSchema.nullable().default(null),
});
export type RenderJob = z.infer<typeof RenderJobSchema>;
