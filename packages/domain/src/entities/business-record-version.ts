import { z } from 'zod';

import {
  BusinessRecordVersionIdSchema,
  ProjectIdSchema,
  ProposalIdSchema,
  WorkspaceIdSchema,
} from '../ids.js';
import { InstantSchema } from '../value-objects/primitives.js';

export const BusinessRecordVersionSchema = z.object({
  id: BusinessRecordVersionIdSchema,
  projectId: ProjectIdSchema,
  workspaceId: WorkspaceIdSchema,
  versionNumber: z.number().int().positive(),
  acceptedBy: z.string().nullable().default(null),
  acceptedAt: InstantSchema,
  sourceProposalIds: z.array(ProposalIdSchema).default([]),
  exportMetadata: z.unknown().default({}),
  compatibilitySourceRef: z.string().nullable().default(null),
});
export type BusinessRecordVersion = z.infer<typeof BusinessRecordVersionSchema>;
