import { z } from 'zod';

import {
  JourneyIdSchema,
  JourneyStepIdSchema,
  ProposalIdSchema,
  WorkspaceIdSchema,
} from '../ids.js';
import { JourneyStageSchema, JourneyStepStatusSchema } from '../journey/stages.js';
import { InstantSchema } from '../value-objects/primitives.js';

export const JourneyStepSchema = z.object({
  id: JourneyStepIdSchema,
  journeyId: JourneyIdSchema,
  workspaceId: WorkspaceIdSchema,
  stage: JourneyStageSchema,
  objective: z.string().min(1),
  whyNow: z.string().min(1),
  expectedEffort: z.string().nullable().default(null),
  expectedMinutes: z.number().int().nonnegative().nullable().default(null),
  cofounderWillDo: z.string().nullable().default(null),
  expectedOutcome: z.string().nullable().default(null),
  status: JourneyStepStatusSchema,
  sourceProposalId: ProposalIdSchema.nullable().default(null),
  inputEvidence: z.unknown().default([]),
  completionEvidence: z.unknown().default([]),
  deferReason: z.string().nullable().default(null),
  skipReason: z.string().nullable().default(null),
  recommended: z.boolean(),
  revision: z.number().int().positive(),
  createdAt: InstantSchema,
  updatedAt: InstantSchema,
});
export type JourneyStep = z.infer<typeof JourneyStepSchema>;
