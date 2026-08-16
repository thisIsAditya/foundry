import { z } from 'zod';

import { DocumentIdSchema, SourceIdSchema, SourceSnapshotIdSchema } from '../ids.js';
import { DataClassificationSchema } from '../status/evidence-status.js';
import { InstantSchema } from '../value-objects/primitives.js';

export const DocumentSchema = z.object({
  id: DocumentIdSchema,
  sourceId: SourceIdSchema,
  latestSnapshotId: SourceSnapshotIdSchema.nullable().default(null),
  title: z.string().nullable().default(null),
  dataClassification: DataClassificationSchema.default('internal'),
  createdAt: InstantSchema,
});
export type Document = z.infer<typeof DocumentSchema>;
