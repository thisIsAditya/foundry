import { z } from 'zod';

import {
  ProjectIdSchema,
  RecordItemIdSchema,
  RecordItemRelationIdSchema,
  WorkspaceIdSchema,
} from '../ids.js';
import { RecordRelationTypeSchema } from '../record/sections.js';
import { InstantSchema } from '../value-objects/primitives.js';

export const RecordItemRelationSchema = z.object({
  id: RecordItemRelationIdSchema,
  projectId: ProjectIdSchema,
  workspaceId: WorkspaceIdSchema,
  sourceItemId: RecordItemIdSchema,
  targetItemId: RecordItemIdSchema,
  relationType: RecordRelationTypeSchema,
  createdAt: InstantSchema,
});
export type RecordItemRelation = z.infer<typeof RecordItemRelationSchema>;
