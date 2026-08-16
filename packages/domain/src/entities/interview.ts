import { z } from 'zod';

import { InterviewIdSchema, ProjectIdSchema } from '../ids.js';
import { InterviewParticipantTypeSchema } from '../status/evidence-status.js';
import { InstantSchema } from '../value-objects/primitives.js';

export const InterviewSchema = z.object({
  id: InterviewIdSchema,
  projectId: ProjectIdSchema,
  participantType: InterviewParticipantTypeSchema,
  consent: z.unknown(),
  conductedAt: InstantSchema.nullable().default(null),
  createdAt: InstantSchema,
});
export type Interview = z.infer<typeof InterviewSchema>;
