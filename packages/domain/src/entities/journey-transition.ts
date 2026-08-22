import { z } from 'zod';

import { JourneyIdSchema, JourneyTransitionIdSchema, WorkspaceIdSchema } from '../ids.js';
import { ActorTypeSchema } from '../status/journey-status.js';
import { InstantSchema } from '../value-objects/primitives.js';

export const JourneyTransitionSchema = z.object({
  id: JourneyTransitionIdSchema,
  journeyId: JourneyIdSchema,
  workspaceId: WorkspaceIdSchema,
  actorType: ActorTypeSchema,
  actorId: z.string().nullable().default(null),
  cause: z.string().min(1),
  fromState: z.unknown(),
  toState: z.unknown(),
  command: z.string().nullable().default(null),
  correlationId: z.string().uuid().nullable().default(null),
  metadata: z.unknown().default({}),
  createdAt: InstantSchema,
});
export type JourneyTransition = z.infer<typeof JourneyTransitionSchema>;
