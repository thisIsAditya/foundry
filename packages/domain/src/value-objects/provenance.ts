import { z } from 'zod';

import { CitationIdSchema, SourceIdSchema, SourceSnapshotIdSchema } from '../ids.js';
import { InstantSchema } from './primitives.js';

export const ProvenanceKinds = [
  'founder_asserted',
  'workflow_derived',
  'externally_verified',
  'human_reviewed',
  'unknown',
] as const;

export const ProvenanceKindSchema = z.enum(ProvenanceKinds);
export type ProvenanceKind = z.infer<typeof ProvenanceKindSchema>;

export const ProvenanceSchema = z.object({
  kind: ProvenanceKindSchema,
  sourceIds: z.array(SourceIdSchema).default([]),
  sourceSnapshotIds: z.array(SourceSnapshotIdSchema).default([]),
  citationIds: z.array(CitationIdSchema).default([]),
  verifiedAt: InstantSchema.nullable().default(null),
});
export type Provenance = z.infer<typeof ProvenanceSchema>;
