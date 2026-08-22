import { z } from 'zod';

import { ProjectIdSchema, ProposalIdSchema, WorkspaceIdSchema } from '../ids.js';
import { CofounderInteractionTypeSchema, ProposalStatusSchema } from '../proposal/status.js';
import { InstantSchema } from '../value-objects/primitives.js';

export const ProposalSchema = z.object({
  id: ProposalIdSchema,
  projectId: ProjectIdSchema,
  workspaceId: WorkspaceIdSchema,
  authorType: z.enum(['founder', 'cofounder', 'system']),
  authorId: z.string().nullable().default(null),
  status: ProposalStatusSchema,
  rationale: z.string().min(1),
  uncertainty: z.string().nullable().default(null),
  interactionType: CofounderInteractionTypeSchema.nullable().default(null),
  contextReferences: z.unknown().default([]),
  expiresAt: InstantSchema.nullable().default(null),
  correlationId: z.string().uuid().nullable().default(null),
  revision: z.number().int().positive(),
  createdAt: InstantSchema,
  updatedAt: InstantSchema,
});
export type Proposal = z.infer<typeof ProposalSchema>;
