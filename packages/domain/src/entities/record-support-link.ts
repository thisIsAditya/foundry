import { z } from 'zod';

import {
  ProjectIdSchema,
  RecordItemIdSchema,
  RecordSupportLinkIdSchema,
  WorkspaceIdSchema,
} from '../ids.js';
import { RecordRelationTypeSchema, RecordSupportTargetKindSchema } from '../record/sections.js';
import { InstantSchema } from '../value-objects/primitives.js';

export const RecordSupportLinkSchema = z.object({
  id: RecordSupportLinkIdSchema,
  projectId: ProjectIdSchema,
  workspaceId: WorkspaceIdSchema,
  recordItemId: RecordItemIdSchema,
  targetKind: RecordSupportTargetKindSchema,
  targetId: z.string().uuid(),
  relationType: RecordRelationTypeSchema,
  createdAt: InstantSchema,
});
export type RecordSupportLink = z.infer<typeof RecordSupportLinkSchema>;
