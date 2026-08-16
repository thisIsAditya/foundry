import { z } from 'zod';

import { CitationIdSchema, EvidenceItemIdSchema, ProjectIdSchema } from '../ids.js';
import { InstantSchema } from '../value-objects/primitives.js';
import { ProvenanceSchema } from '../value-objects/provenance.js';

export const EvidenceItemSchema = z.object({
  id: EvidenceItemIdSchema,
  projectId: ProjectIdSchema,
  summary: z.string().min(1),
  provenance: ProvenanceSchema,
  citationIds: z.array(CitationIdSchema),
  createdAt: InstantSchema,
});
export type EvidenceItem = z.infer<typeof EvidenceItemSchema>;
