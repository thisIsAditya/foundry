import { z } from 'zod';

import { CitationIdSchema, ContentBlockIdSchema, SourceSnapshotIdSchema } from '../ids.js';
import { InstantSchema } from '../value-objects/primitives.js';
import { CitationLocatorSchema } from '../value-objects/citation-locator.js';

export const CitationSchema = z.object({
  id: CitationIdSchema,
  sourceSnapshotId: SourceSnapshotIdSchema,
  contentBlockId: ContentBlockIdSchema.nullable().default(null),
  locator: CitationLocatorSchema,
  createdAt: InstantSchema,
});
export type Citation = z.infer<typeof CitationSchema>;
