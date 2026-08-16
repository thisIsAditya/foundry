import { z } from 'zod';

import { SourceIdSchema, SourceSnapshotIdSchema } from '../ids.js';
import { InstantSchema } from '../value-objects/primitives.js';

export const SourceSnapshotSchema = z.object({
  id: SourceSnapshotIdSchema,
  sourceId: SourceIdSchema,
  contentHash: z.string().min(1),
  fetchedAt: InstantSchema,
  parserMetadata: z.unknown(),
});
export type SourceSnapshot = z.infer<typeof SourceSnapshotSchema>;
