import { z } from 'zod';

import {
  ConversationMessageIdSchema,
  FounderTaskIdSchema,
  PackRevisionIdSchema,
  ProjectIdSchema,
  SprintIdSchema,
  UserIdSchema,
} from '../ids.js';
import {
  ConversationActorSchema,
  ConversationReferenceKindSchema,
  ConversationVisibilitySchema,
} from '../status/conversation-status.js';
import { BusinessModelSectionKeySchema } from '../status/business-model-section.js';
import { InstantSchema } from '../value-objects/primitives.js';

export const ConversationReferenceSchema = z.object({
  kind: ConversationReferenceKindSchema,
  id: z.string().min(1),
});
export type ConversationReference = z.infer<typeof ConversationReferenceSchema>;

export const ConversationBlockSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('concise_answer'), text: z.string().min(1) }),
  z.object({
    kind: z.literal('cited_finding'),
    text: z.string().min(1),
    evidenceItemId: z.string().optional(),
    citationIds: z.array(z.string()).default([]),
  }),
  z.object({
    kind: z.literal('assumption_card'),
    assumptionId: z.string().optional(),
    text: z.string().min(1),
  }),
  z.object({
    kind: z.literal('proposed_plan_change'),
    revisionId: PackRevisionIdSchema,
    sectionKey: BusinessModelSectionKeySchema.optional(),
  }),
  z.object({
    kind: z.literal('research_plan'),
    jobId: SprintIdSchema,
  }),
  z.object({
    kind: z.literal('founder_task'),
    founderTaskId: FounderTaskIdSchema,
  }),
  z.object({
    kind: z.literal('job_request'),
    jobId: SprintIdSchema,
  }),
  z.object({
    kind: z.literal('draft_action'),
    text: z.string().min(1),
    founderTaskId: FounderTaskIdSchema.optional(),
  }),
  z.object({
    kind: z.literal('decision_card'),
    decisionId: z.string().optional(),
    text: z.string().min(1),
  }),
  z.object({
    kind: z.literal('blocker'),
    text: z.string().min(1),
    recoveryAction: z.string().optional(),
  }),
]);
export type ConversationBlock = z.infer<typeof ConversationBlockSchema>;

export const ConversationMessageSchema = z.object({
  id: ConversationMessageIdSchema,
  projectId: ProjectIdSchema,
  actor: ConversationActorSchema,
  actorUserId: UserIdSchema.nullable().default(null),
  text: z.string().min(1),
  blocks: z.array(ConversationBlockSchema),
  references: z.array(ConversationReferenceSchema),
  visibility: ConversationVisibilitySchema.default('founder_visible'),
  createdAt: InstantSchema,
});
export type ConversationMessage = z.infer<typeof ConversationMessageSchema>;
