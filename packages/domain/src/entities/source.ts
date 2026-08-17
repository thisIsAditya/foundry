import { z } from 'zod';

import { ProjectIdSchema, SourceIdSchema, UserIdSchema } from '../ids.js';
import {
  DataClassificationSchema,
  SourceCategorySchema,
  SourceKindSchema,
  SourceStatusSchema,
} from '../status/evidence-status.js';
import { InstantSchema } from '../value-objects/primitives.js';

export const SourceSchema = z.object({
  id: SourceIdSchema,
  projectId: ProjectIdSchema,
  kind: SourceKindSchema,
  status: SourceStatusSchema,
  originalFilename: z.string().nullable().default(null),
  mimeType: z.string().nullable().default(null),
  sizeBytes: z.number().int().nonnegative().nullable().default(null),
  s3Key: z.string().nullable().default(null),
  sourceUrl: z.string().nullable().default(null),
  sourceCategory: SourceCategorySchema.nullable().default(null),
  geographicScope: z.string().nullable().default(null),
  reliabilityNotes: z.string().nullable().default(null),
  dataClassification: DataClassificationSchema.default('internal'),
  failureReason: z.string().nullable().default(null),
  createdByUserId: UserIdSchema.nullable().default(null),
  createdAt: InstantSchema,
});
export type Source = z.infer<typeof SourceSchema>;
