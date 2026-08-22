import { z } from 'zod';

import {
  BusinessRecordVersionIdSchema,
  JourneyIdSchema,
  JourneyStageStateIdSchema,
  WorkspaceIdSchema,
} from '../ids.js';
import { JourneyStageSchema, JourneyStageStatusSchema } from '../journey/stages.js';
import { InstantSchema } from '../value-objects/primitives.js';

export const JourneyStageStateSchema = z.object({
  id: JourneyStageStateIdSchema,
  journeyId: JourneyIdSchema,
  workspaceId: WorkspaceIdSchema,
  stage: JourneyStageSchema,
  status: JourneyStageStatusSchema,
  goal: z.string().nullable().default(null),
  outcome: z.string().nullable().default(null),
  completionReason: z.string().nullable().default(null),
  deferReason: z.string().nullable().default(null),
  blockReason: z.string().nullable().default(null),
  latestRecordVersionId: BusinessRecordVersionIdSchema.nullable().default(null),
  updatedAt: InstantSchema,
});
export type JourneyStageState = z.infer<typeof JourneyStageStateSchema>;
