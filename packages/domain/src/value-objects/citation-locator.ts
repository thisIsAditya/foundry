import { z } from 'zod';

import { SourceSnapshotIdSchema } from '../ids.js';

export const CitationLocatorSchema = z.object({
  sourceSnapshotId: SourceSnapshotIdSchema,
  page: z.number().int().positive().optional(),
  paragraph: z.number().int().nonnegative().optional(),
  table: z.string().optional(),
  cell: z.string().optional(),
  urlFragment: z.string().optional(),
  charRange: z.tuple([z.number().int().nonnegative(), z.number().int().nonnegative()]).optional(),
});
export type CitationLocator = z.infer<typeof CitationLocatorSchema>;
