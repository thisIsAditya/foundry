import { z } from 'zod';

import {
  BusinessRecordVersionIdSchema,
  ProjectIdSchema,
  ProjectMemoryEntryIdSchema,
  UserIdSchema,
  WorkspaceIdSchema,
} from '../ids.js';
import { InstantSchema } from '../value-objects/primitives.js';

export const ProjectMemoryKinds = [
  'goal',
  'constraint',
  'preference',
  'decision',
  'question',
  'assumption',
  'experiment',
  'conversation',
] as const;
export const ProjectMemoryKindSchema = z.enum(ProjectMemoryKinds);
export type ProjectMemoryKind = z.infer<typeof ProjectMemoryKindSchema>;

export const ProjectMemoryAuthorTypes = ['founder', 'cofounder', 'system'] as const;
export const ProjectMemoryAuthorTypeSchema = z.enum(ProjectMemoryAuthorTypes);
export type ProjectMemoryAuthorType = z.infer<typeof ProjectMemoryAuthorTypeSchema>;

export const ProjectMemoryEntrySchema = z.object({
  id: ProjectMemoryEntryIdSchema,
  projectId: ProjectIdSchema,
  workspaceId: WorkspaceIdSchema,
  kind: ProjectMemoryKindSchema,
  body: z.string().min(1),
  sourceKind: z.string().min(1),
  sourceIds: z.array(z.string().min(1)),
  authorType: ProjectMemoryAuthorTypeSchema,
  authorId: UserIdSchema.nullable(),
  recordVersionId: BusinessRecordVersionIdSchema.nullable(),
  stale: z.boolean(),
  generatedAt: InstantSchema,
  supersededAt: InstantSchema.nullable(),
  createdAt: InstantSchema,
  updatedAt: InstantSchema,
});
export type ProjectMemoryEntry = z.infer<typeof ProjectMemoryEntrySchema>;
