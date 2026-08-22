import { z } from 'zod';

import {
  BusinessRecordVersionIdSchema,
  ProjectIdSchema,
  RecordItemIdSchema,
  RecordItemStalenessIdSchema,
  WorkspaceIdSchema,
} from '../ids.js';
import { InstantSchema } from '../value-objects/primitives.js';

export const RecordItemStalenessSchema = z.object({
  id: RecordItemStalenessIdSchema,
  projectId: ProjectIdSchema,
  workspaceId: WorkspaceIdSchema,
  sourceItemId: RecordItemIdSchema,
  affectedItemId: RecordItemIdSchema,
  reason: z.string().min(1),
  detectedAt: InstantSchema,
  resolvedByVersionId: BusinessRecordVersionIdSchema.nullable().default(null),
});
export type RecordItemStaleness = z.infer<typeof RecordItemStalenessSchema>;
