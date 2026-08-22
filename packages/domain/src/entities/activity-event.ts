import { z } from 'zod';

import {
  ActivityEventIdSchema,
  BusinessRecordVersionIdSchema,
  JourneyIdSchema,
  JourneyStepIdSchema,
  ProjectIdSchema,
  ProposalIdSchema,
  WorkspaceIdSchema,
} from '../ids.js';
import { ActorTypeSchema } from '../status/journey-status.js';
import { InstantSchema } from '../value-objects/primitives.js';

export const ActivityEventSchema = z.object({
  id: ActivityEventIdSchema,
  projectId: ProjectIdSchema,
  workspaceId: WorkspaceIdSchema,
  eventType: z.string().min(1),
  actorType: ActorTypeSchema,
  actorId: z.string().nullable().default(null),
  payload: z.unknown().default({}),
  journeyId: JourneyIdSchema.nullable().default(null),
  stepId: JourneyStepIdSchema.nullable().default(null),
  proposalId: ProposalIdSchema.nullable().default(null),
  versionId: BusinessRecordVersionIdSchema.nullable().default(null),
  createdAt: InstantSchema,
});
export type ActivityEvent = z.infer<typeof ActivityEventSchema>;
