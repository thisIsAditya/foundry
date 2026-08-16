import { z } from 'zod';

import { ContentBlockIdSchema, DocumentIdSchema, SourceSnapshotIdSchema } from '../ids.js';
import { ContentBlockTypeSchema } from '../status/evidence-status.js';
import { CitationLocatorSchema } from '../value-objects/citation-locator.js';

export const ContentBlockSchema = z.object({
  id: ContentBlockIdSchema,
  documentId: DocumentIdSchema,
  sourceSnapshotId: SourceSnapshotIdSchema,
  blockType: ContentBlockTypeSchema,
  sequenceNo: z.number().int().nonnegative(),
  textContent: z.string().nullable().default(null),
  structuredContent: z.unknown().nullable().default(null),
  locator: CitationLocatorSchema,
});
export type ContentBlock = z.infer<typeof ContentBlockSchema>;
