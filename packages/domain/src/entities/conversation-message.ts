import { z } from 'zod';

import {
  CofounderOperationIdSchema,
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
import {
  CofounderInteractionTypeSchema,
  CofounderOperationStateSchema,
} from '../proposal/status.js';

export const COFOUNDER_TURN_SCHEMA_VERSION = 'v4.p2.1' as const;

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
    citationIds: z.array(z.string().min(1)).min(1),
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
  z.object({
    kind: z.literal('cofounder_turn'),
    schemaVersion: z.literal(COFOUNDER_TURN_SCHEMA_VERSION),
    interactionType: CofounderInteractionTypeSchema,
    explanation: z.string().min(1),
    uncertainty: z.string(),
    blockedConditions: z.array(z.string()),
    activity: z.string(),
    proposalId: z.string().uuid().nullable(),
    stepId: z.string().uuid().nullable(),
    operationId: CofounderOperationIdSchema,
    operationState: CofounderOperationStateSchema.optional(),
    references: z.array(z.object({ kind: z.string().min(1), id: z.string().min(1) })),
  }),
]);
export type ConversationBlock = z.infer<typeof ConversationBlockSchema>;
export type CofounderTurnBlock = Extract<ConversationBlock, { kind: 'cofounder_turn' }>;

export function toCofounderTurnBlock(input: {
  interactionType: CofounderTurnBlock['interactionType'];
  explanation: string;
  uncertainty: string;
  blockedConditions: readonly string[];
  activity: string;
  proposalId: string | null;
  stepId: string | null;
  operationId: CofounderTurnBlock['operationId'];
  references: CofounderTurnBlock['references'];
  operationState?: CofounderTurnBlock['operationState'];
}): CofounderTurnBlock {
  return {
    kind: 'cofounder_turn',
    schemaVersion: COFOUNDER_TURN_SCHEMA_VERSION,
    interactionType: input.interactionType,
    explanation: input.explanation,
    uncertainty: input.uncertainty,
    blockedConditions: [...input.blockedConditions],
    activity: input.activity,
    proposalId: input.proposalId,
    stepId: input.stepId,
    operationId: input.operationId,
    references: [...input.references],
    ...(input.operationState === undefined ? {} : { operationState: input.operationState }),
  };
}

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
