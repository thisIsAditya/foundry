import { z } from 'zod';

import { MetricDefinitionIdSchema, MetricObservationIdSchema } from '../ids.js';
import { DecimalStringSchema, InstantSchema } from '../value-objects/primitives.js';

export const MetricObservationSchema = z.object({
  id: MetricObservationIdSchema,
  metricId: MetricDefinitionIdSchema,
  value: DecimalStringSchema,
  observedAt: InstantSchema,
});
export type MetricObservation = z.infer<typeof MetricObservationSchema>;
