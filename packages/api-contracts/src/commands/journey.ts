import {
  CofounderInteractionTypeSchema,
  CofounderOperationIdSchema,
  EvidenceItemIdSchema,
  ExperimentIdSchema,
  InterviewParticipantTypeSchema,
  JourneyIdSchema,
  JourneyMoveModeSchema,
  JourneyStageSchema,
  JourneyStepIdSchema,
  ProjectIdSchema,
  ProposalChangeIdSchema,
  ProposalChangeOutcomeSchema,
  ProposalIdSchema,
  RecordItemIdSchema,
  RecordSectionKeySchema,
} from '@foundry/domain';
import { z } from 'zod';

import { IdempotencyKeySchema } from './idempotency.js';

export const FounderUrgencySchema = z.enum(['now', 'soon', 'exploring']);
export type FounderUrgency = z.infer<typeof FounderUrgencySchema>;

const expectedRevision = z.number().int().positive();

export const JourneySetObjectiveInputSchema = z.object({
  projectId: ProjectIdSchema,
  expectedRevision,
  objective: z.string().min(1),
  idempotencyKey: IdempotencyKeySchema,
});
export type JourneySetObjectiveInput = z.infer<typeof JourneySetObjectiveInputSchema>;

export const JourneyStartStepInputSchema = z.object({
  projectId: ProjectIdSchema,
  stepId: JourneyStepIdSchema,
  expectedRevision,
  idempotencyKey: IdempotencyKeySchema,
});
export type JourneyStartStepInput = z.infer<typeof JourneyStartStepInputSchema>;

export const JourneySubmitStepInputSchema = z.object({
  projectId: ProjectIdSchema,
  stepId: JourneyStepIdSchema,
  expectedRevision,
  completionEvidence: z.unknown().optional(),
  idempotencyKey: IdempotencyKeySchema,
});
export type JourneySubmitStepInput = z.infer<typeof JourneySubmitStepInputSchema>;

export const JourneyDeferStepInputSchema = z.object({
  projectId: ProjectIdSchema,
  stepId: JourneyStepIdSchema,
  expectedRevision,
  reason: z.string().min(1),
  skip: z.boolean().default(false),
  idempotencyKey: IdempotencyKeySchema,
});
export type JourneyDeferStepInput = z.infer<typeof JourneyDeferStepInputSchema>;

export const JourneyRevisitStageInputSchema = z.object({
  projectId: ProjectIdSchema,
  stage: JourneyStageSchema,
  mode: JourneyMoveModeSchema.default('revisit'),
  reason: z.string().min(1).optional(),
  expectedRevision,
  idempotencyKey: IdempotencyKeySchema,
});
export type JourneyRevisitStageInput = z.infer<typeof JourneyRevisitStageInputSchema>;

export const GetJourneyOverviewInputSchema = z.object({
  projectId: ProjectIdSchema,
});
export type GetJourneyOverviewInput = z.infer<typeof GetJourneyOverviewInputSchema>;

export const GetJourneyMapInputSchema = z.object({
  projectId: ProjectIdSchema,
});
export type GetJourneyMapInput = z.infer<typeof GetJourneyMapInputSchema>;

export const GetJourneyStepInputSchema = z.object({
  projectId: ProjectIdSchema,
  stepId: JourneyStepIdSchema,
});
export type GetJourneyStepInput = z.infer<typeof GetJourneyStepInputSchema>;

export const CaptureEvidenceInputSchema = z.object({
  projectId: ProjectIdSchema,
  kind: z.enum(['observation', 'interview', 'source', 'assumption']),
  summary: z.string().min(1),
  section: RecordSectionKeySchema.optional(),
  stepId: JourneyStepIdSchema.optional(),
  evidenceItemId: EvidenceItemIdSchema.optional(),
  participantType: InterviewParticipantTypeSchema.optional(),
  consentGiven: z.boolean().optional(),
  idempotencyKey: IdempotencyKeySchema,
});
export type CaptureEvidenceInput = z.infer<typeof CaptureEvidenceInputSchema>;

export const RecordAssumptionInputSchema = z.object({
  projectId: ProjectIdSchema,
  statement: z.string().min(1),
  section: RecordSectionKeySchema.optional(),
  idempotencyKey: IdempotencyKeySchema,
});
export type RecordAssumptionInput = z.infer<typeof RecordAssumptionInputSchema>;

export const RecordDecisionV4InputSchema = z.object({
  projectId: ProjectIdSchema,
  statement: z.string().min(1),
  rationale: z.string().min(1),
  section: RecordSectionKeySchema.optional(),
  idempotencyKey: IdempotencyKeySchema,
});
export type RecordDecisionV4Input = z.infer<typeof RecordDecisionV4InputSchema>;

export const DefineExperimentInputSchema = z.object({
  projectId: ProjectIdSchema,
  name: z.string().min(1),
  successCriteria: z.string().min(1),
  section: RecordSectionKeySchema.optional(),
  experimentId: ExperimentIdSchema.optional(),
  idempotencyKey: IdempotencyKeySchema,
});
export type DefineExperimentInput = z.infer<typeof DefineExperimentInputSchema>;

export const ProposalChangeDraftSchema = z.object({
  recordItemId: RecordItemIdSchema.optional(),
  section: RecordSectionKeySchema,
  itemKey: z.string().min(1).optional(),
  afterPayload: z.unknown(),
  rationale: z.string().min(1).optional(),
  evidenceRefs: z.array(z.string()).default([]),
});
export type ProposalChangeDraft = z.infer<typeof ProposalChangeDraftSchema>;

export const CreateProposalInputSchema = z.object({
  projectId: ProjectIdSchema,
  rationale: z.string().min(1),
  uncertainty: z.string().optional(),
  interactionType: CofounderInteractionTypeSchema.optional(),
  changes: z.array(ProposalChangeDraftSchema).min(1),
  idempotencyKey: IdempotencyKeySchema,
});
export type CreateProposalInput = z.infer<typeof CreateProposalInputSchema>;

export const ReviewProposalChangeInputSchema = z.object({
  changeId: ProposalChangeIdSchema,
  outcome: ProposalChangeOutcomeSchema,
  modifiedAfter: z.unknown().optional(),
});
export type ReviewProposalChangeInput = z.infer<typeof ReviewProposalChangeInputSchema>;

export const ReviewProposalInputSchema = z.object({
  projectId: ProjectIdSchema,
  proposalId: ProposalIdSchema,
  expectedRevision,
  outcomes: z.array(ReviewProposalChangeInputSchema).min(1),
  idempotencyKey: IdempotencyKeySchema,
});
export type ReviewProposalInput = z.infer<typeof ReviewProposalInputSchema>;

export const AcceptRecordChangesInputSchema = z.object({
  projectId: ProjectIdSchema,
  proposalId: ProposalIdSchema,
  changeIds: z.array(ProposalChangeIdSchema).min(1),
  expectedRevision,
  idempotencyKey: IdempotencyKeySchema,
});
export type AcceptRecordChangesInput = z.infer<typeof AcceptRecordChangesInputSchema>;

export const GetRecordSectionInputSchema = z.object({
  projectId: ProjectIdSchema,
  section: RecordSectionKeySchema,
});
export type GetRecordSectionInput = z.infer<typeof GetRecordSectionInputSchema>;

export const ListRecordSectionsInputSchema = z.object({
  projectId: ProjectIdSchema,
});
export type ListRecordSectionsInput = z.infer<typeof ListRecordSectionsInputSchema>;

export const ExportRecordInputSchema = z.object({
  projectId: ProjectIdSchema,
});
export type ExportRecordInput = z.infer<typeof ExportRecordInputSchema>;

export const GetProposalInputSchema = z.object({
  projectId: ProjectIdSchema,
  proposalId: ProposalIdSchema,
});
export type GetProposalInput = z.infer<typeof GetProposalInputSchema>;

export const ListProposalsInputSchema = z.object({
  projectId: ProjectIdSchema,
});
export type ListProposalsInput = z.infer<typeof ListProposalsInputSchema>;

export const CofounderRespondInputSchema = z.object({
  projectId: ProjectIdSchema,
  text: z.string().min(1),
  stepId: JourneyStepIdSchema.optional(),
  section: RecordSectionKeySchema.optional(),
  idempotencyKey: IdempotencyKeySchema,
});
export type CofounderRespondInput = z.infer<typeof CofounderRespondInputSchema>;

export const CancelCofounderOperationInputSchema = z.object({
  projectId: ProjectIdSchema,
  operationId: CofounderOperationIdSchema,
  idempotencyKey: IdempotencyKeySchema,
});
export type CancelCofounderOperationInput = z.infer<typeof CancelCofounderOperationInputSchema>;

export const GetReadinessInputSchema = z.object({
  projectId: ProjectIdSchema,
});
export type GetReadinessInput = z.infer<typeof GetReadinessInputSchema>;

export const SaveRecordSectionInputSchema = z.object({
  projectId: ProjectIdSchema,
  section: RecordSectionKeySchema,
  expectedRevision: z.number().int().positive(),
  summary: z.string().min(1),
  evidenceIds: z.array(z.string().uuid()).default([]),
  idempotencyKey: IdempotencyKeySchema,
});
export type SaveRecordSectionInput = z.infer<typeof SaveRecordSectionInputSchema>;

export const GetJourneyByIdInputSchema = z.object({
  journeyId: JourneyIdSchema,
});
export type GetJourneyByIdInput = z.infer<typeof GetJourneyByIdInputSchema>;
