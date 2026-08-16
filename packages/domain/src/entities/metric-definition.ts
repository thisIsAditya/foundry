import { z } from 'zod';

import { MetricDefinitionIdSchema, ProjectIdSchema } from '../ids.js';
import { InstantSchema } from '../value-objects/primitives.js';

export const MetricDefinitionSchema = z.object({
  id: MetricDefinitionIdSchema,
  projectId: ProjectIdSchema,
  name: z.string().min(1),
  unit: z.string().min(1),
  calculationSpec: z.unknown(),
  createdAt: InstantSchema,
});
export type MetricDefinition = z.infer<typeof MetricDefinitionSchema>;
