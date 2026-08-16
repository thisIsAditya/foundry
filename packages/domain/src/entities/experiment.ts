import { z } from 'zod';

import { AssumptionIdSchema, ExperimentIdSchema, ProjectIdSchema } from '../ids.js';
import { ExperimentStatusSchema } from '../status/evidence-status.js';
import { InstantSchema } from '../value-objects/primitives.js';

export const ExperimentSchema = z.object({
  id: ExperimentIdSchema,
  projectId: ProjectIdSchema,
  hypothesis: z.string().min(1),
  method: z.string().min(1),
  threshold: z.unknown(),
  result: z.unknown().nullable().default(null),
  status: ExperimentStatusSchema,
  assumptionIds: z.array(AssumptionIdSchema),
  createdAt: InstantSchema,
});
export type Experiment = z.infer<typeof ExperimentSchema>;
