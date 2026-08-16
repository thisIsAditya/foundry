import { z } from 'zod';

import { CompetitorIdSchema, ProjectIdSchema, SourceIdSchema } from '../ids.js';
import { InstantSchema } from '../value-objects/primitives.js';

export const CompetitorSchema = z.object({
  id: CompetitorIdSchema,
  projectId: ProjectIdSchema,
  name: z.string().min(1),
  sourceIds: z.array(SourceIdSchema),
  createdAt: InstantSchema,
});
export type Competitor = z.infer<typeof CompetitorSchema>;
