import { z } from 'zod';

import { ActorTypeSchema } from '../status/journey-status.js';
import { InstantSchema } from './primitives.js';

export const LifecycleStateSchema = z.object({
  state: z.string().min(1),
  actorType: ActorTypeSchema,
  actorId: z.string().min(1),
  occurredAt: InstantSchema,
  reason: z.string().nullable().default(null),
  previousState: z.string().nullable().default(null),
});
export type LifecycleState = z.infer<typeof LifecycleStateSchema>;
