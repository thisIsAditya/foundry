import { z } from 'zod';

import {
  BusinessRecordVersionIdSchema,
  JourneyIdSchema,
  ProjectIdSchema,
  WorkspaceIdSchema,
} from '../ids.js';
import { JourneyStageSchema } from '../journey/stages.js';
import { InstantSchema } from '../value-objects/primitives.js';

export const JourneySchema = z.object({
  id: JourneyIdSchema,
  projectId: ProjectIdSchema,
  workspaceId: WorkspaceIdSchema,
  currentStage: JourneyStageSchema,
  currentObjective: z.string().min(1),
  acceptedRecordVersionId: BusinessRecordVersionIdSchema.nullable().default(null),
  revision: z.number().int().positive(),
  createdAt: InstantSchema,
  updatedAt: InstantSchema,
});
export type Journey = z.infer<typeof JourneySchema>;
