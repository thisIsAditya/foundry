import { z } from 'zod';

import { PackRevisionIdSchema, ProjectIdSchema, WorkspaceIdSchema } from '../ids.js';
import { FounderObjectiveSchema, JourneyPhaseSchema } from '../status/journey-status.js';
import { InstantSchema } from '../value-objects/primitives.js';

export const ProjectSchema = z.object({
  id: ProjectIdSchema,
  workspaceId: WorkspaceIdSchema,
  name: z.string().min(1),
  description: z.string().nullable().default(null),
  geography: z.string().nullable().default(null),
  jurisdiction: z.string().nullable().default(null),
  businessCategory: z.string().nullable().default(null),
  founderObjective: FounderObjectiveSchema,
  currentPhase: JourneyPhaseSchema,
  currentPackRevisionId: PackRevisionIdSchema.nullable().default(null),
  archivedAt: InstantSchema.nullable().default(null),
  createdAt: InstantSchema,
  updatedAt: InstantSchema,
});
export type Project = z.infer<typeof ProjectSchema>;
