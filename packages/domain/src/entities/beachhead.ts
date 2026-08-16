import { z } from 'zod';

import { BeachheadIdSchema, DmuIdSchema, PackRevisionIdSchema, PersonaIdSchema } from '../ids.js';
import { InstantSchema } from '../value-objects/primitives.js';

export const BeachheadSchema = z.object({
  id: BeachheadIdSchema,
  packRevisionId: PackRevisionIdSchema,
  segmentDefinition: z.string().min(1),
  personaId: PersonaIdSchema.nullable().default(null),
  dmuId: DmuIdSchema.nullable().default(null),
  createdAt: InstantSchema,
});
export type Beachhead = z.infer<typeof BeachheadSchema>;
