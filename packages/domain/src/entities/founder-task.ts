import { z } from 'zod';

import {
  ConversationMessageIdSchema,
  FounderTaskIdSchema,
  ProjectIdSchema,
  SprintIdSchema,
} from '../ids.js';
import { BusinessModelSectionKeySchema } from '../status/business-model-section.js';
import { FounderTaskStatusSchema } from '../status/founder-task-status.js';
import { ScoreDimensionSchema } from '../status/score-dimension.js';
import { InstantSchema } from '../value-objects/primitives.js';

import { ConversationReferenceSchema } from './conversation-message.js';

export const FounderTaskPreparationSchema = z.object({
  script: z.string().optional(),
  questionnaire: z.array(z.string()).optional(),
  template: z.string().optional(),
  helpMessageId: ConversationMessageIdSchema.optional(),
});
export type FounderTaskPreparation = z.infer<typeof FounderTaskPreparationSchema>;

export const FounderTaskEvidenceSchema = z.object({
  description: z.string().min(1),
  requiredKinds: z.array(ConversationReferenceSchema.shape.kind).default([]),
});
export type FounderTaskEvidenceSchema = z.infer<typeof FounderTaskEvidenceSchema>;

export const FounderTaskSchema = z.object({
  id: FounderTaskIdSchema,
  projectId: ProjectIdSchema,
  title: z.string().min(1),
  explanation: z.string().min(1),
  owner: z.literal('founder'),
  linkedJobId: SprintIdSchema.nullable().default(null),
  linkedSectionKeys: z.array(BusinessModelSectionKeySchema),
  linkedScoreDimensions: z.array(ScoreDimensionSchema),
  preparation: FounderTaskPreparationSchema,
  evidenceSchema: FounderTaskEvidenceSchema,
  status: FounderTaskStatusSchema,
  dueOrSuggestedAt: InstantSchema.nullable().default(null),
  deferOrSkipReason: z.string().nullable().default(null),
  completionEvidenceRef: ConversationReferenceSchema.nullable().default(null),
  createdAt: InstantSchema,
  updatedAt: InstantSchema,
});
export type FounderTask = z.infer<typeof FounderTaskSchema>;
