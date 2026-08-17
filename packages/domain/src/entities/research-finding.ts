import { z } from 'zod';

import {
  CitationIdSchema,
  ProjectIdSchema,
  ResearchFindingIdSchema,
  SprintIdSchema,
} from '../ids.js';
import { BusinessModelSectionKeySchema } from '../status/business-model-section.js';
import { ResearchExtractionMethodSchema } from '../status/conversation-status.js';
import { InstantSchema } from '../value-objects/primitives.js';
import { ConfidenceSchema } from '../value-objects/confidence.js';

export const ResearchFindingSchema = z.object({
  id: ResearchFindingIdSchema,
  projectId: ProjectIdSchema,
  jobId: SprintIdSchema,
  claim: z.string().min(1),
  citationIds: z.array(CitationIdSchema),
  confidence: ConfidenceSchema,
  affectedSectionKeys: z.array(BusinessModelSectionKeySchema),
  conflictsWithFindingIds: z.array(ResearchFindingIdSchema),
  staleAt: InstantSchema.nullable().default(null),
  extractionMethod: ResearchExtractionMethodSchema,
  createdAt: InstantSchema,
});
export type ResearchFinding = z.infer<typeof ResearchFindingSchema>;
