import { z } from 'zod';

import {
  BusinessRecordVersionIdSchema,
  ProjectIdSchema,
  RecordItemIdSchema,
  WorkspaceIdSchema,
} from '../ids.js';
import {
  RecordItemStatusSchema,
  RecordProvenanceSchema,
  RecordSectionKeySchema,
} from '../record/sections.js';
import { InstantSchema } from '../value-objects/primitives.js';

export const RecordItemContentSchema = z.object({
  summary: z.string().default(''),
  fields: z.record(z.string(), z.unknown()).default({}),
});
export type RecordItemContent = z.infer<typeof RecordItemContentSchema>;

export const RecordItemSchema = z.object({
  id: RecordItemIdSchema,
  projectId: ProjectIdSchema,
  workspaceId: WorkspaceIdSchema,
  section: RecordSectionKeySchema,
  itemKey: z.string().min(1),
  title: z.string().min(1),
  content: RecordItemContentSchema,
  status: RecordItemStatusSchema,
  provenance: RecordProvenanceSchema,
  currentVersionId: BusinessRecordVersionIdSchema.nullable().default(null),
  revision: z.number().int().positive(),
  createdAt: InstantSchema,
  updatedAt: InstantSchema,
});
export type RecordItem = z.infer<typeof RecordItemSchema>;
