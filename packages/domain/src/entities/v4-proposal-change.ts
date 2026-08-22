import { z } from 'zod';

import {
  ProjectIdSchema,
  ProposalChangeIdSchema,
  ProposalIdSchema,
  RecordItemIdSchema,
  WorkspaceIdSchema,
} from '../ids.js';
import { RecordSectionKeySchema } from '../record/sections.js';
import { ProposalChangeOutcomeSchema } from '../proposal/status.js';
import { InstantSchema } from '../value-objects/primitives.js';

export const ProposalChangeSchema = z.object({
  id: ProposalChangeIdSchema,
  proposalId: ProposalIdSchema,
  projectId: ProjectIdSchema,
  workspaceId: WorkspaceIdSchema,
  recordItemId: RecordItemIdSchema.nullable().default(null),
  section: RecordSectionKeySchema,
  itemKey: z.string().nullable().default(null),
  beforePayload: z.unknown().nullable().default(null),
  afterPayload: z.unknown(),
  evidenceRefs: z.unknown().default([]),
  selectedOutcome: ProposalChangeOutcomeSchema.nullable().default(null),
  conflictRevision: z.number().int().nullable().default(null),
  createdAt: InstantSchema,
});
export type ProposalChange = z.infer<typeof ProposalChangeSchema>;
