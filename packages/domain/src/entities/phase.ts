import { z } from 'zod';

import { GateIdSchema, PhaseIdSchema, ProjectIdSchema } from '../ids.js';
import { JourneyPhaseSchema } from '../status/journey-status.js';
import { InstantSchema } from '../value-objects/primitives.js';

export const PhaseSchema = z.object({
  id: PhaseIdSchema,
  projectId: ProjectIdSchema,
  name: JourneyPhaseSchema,
  gateIds: z.array(GateIdSchema),
  startedAt: InstantSchema,
  endedAt: InstantSchema.nullable().default(null),
});
export type Phase = z.infer<typeof PhaseSchema>;
