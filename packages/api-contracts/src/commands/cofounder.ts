import {
  BusinessModelSectionKeySchema,
  ConversationMessageIdSchema,
  ConversationReferenceSchema,
  FounderPreferenceIdSchema,
  FounderTaskIdSchema,
  FounderTaskStatusSchema,
  PackRevisionIdSchema,
  ProjectIdSchema,
  ScoreDimensionSchema,
  SprintIdSchema,
} from '@foundry/domain';
import { z } from 'zod';

import { IdempotencyKeySchema } from './idempotency.js';

export const ListBusinessModelSectionsInputSchema = z.object({
  projectId: ProjectIdSchema,
});
export type ListBusinessModelSectionsInput = z.infer<typeof ListBusinessModelSectionsInputSchema>;

export const GetBusinessModelSectionInputSchema = z.object({
  projectId: ProjectIdSchema,
  key: BusinessModelSectionKeySchema,
});
export type GetBusinessModelSectionInput = z.infer<typeof GetBusinessModelSectionInputSchema>;

export const ListRevisionsInputSchema = z.object({
  projectId: ProjectIdSchema,
});
export type ListRevisionsInput = z.infer<typeof ListRevisionsInputSchema>;

export const AcceptSectionInputSchema = z.object({
  projectId: ProjectIdSchema,
  revisionId: PackRevisionIdSchema,
  sectionKey: BusinessModelSectionKeySchema,
  expectedRevision: PackRevisionIdSchema,
  idempotencyKey: IdempotencyKeySchema,
});
export type AcceptSectionInput = z.infer<typeof AcceptSectionInputSchema>;

export const AcceptAllSafeSectionsInputSchema = z.object({
  projectId: ProjectIdSchema,
  revisionId: PackRevisionIdSchema,
  expectedRevision: PackRevisionIdSchema,
  idempotencyKey: IdempotencyKeySchema,
});
export type AcceptAllSafeSectionsInput = z.infer<typeof AcceptAllSafeSectionsInputSchema>;

export const ExplainChangeInputSchema = z.object({
  projectId: ProjectIdSchema,
  revisionId: PackRevisionIdSchema,
  sectionKey: BusinessModelSectionKeySchema,
});
export type ExplainChangeInput = z.infer<typeof ExplainChangeInputSchema>;

export const ListConversationInputSchema = z.object({
  projectId: ProjectIdSchema,
  cursor: ConversationMessageIdSchema.optional(),
  limit: z.number().int().positive().max(100).default(40),
});
export type ListConversationInput = z.infer<typeof ListConversationInputSchema>;

export const SendConversationInputSchema = z.object({
  projectId: ProjectIdSchema,
  text: z.string().min(1),
  idempotencyKey: IdempotencyKeySchema,
});
export type SendConversationInput = z.infer<typeof SendConversationInputSchema>;

export const GetConversationSummaryInputSchema = z.object({
  projectId: ProjectIdSchema,
});
export type GetConversationSummaryInput = z.infer<typeof GetConversationSummaryInputSchema>;

export const ListPreferencesInputSchema = z.object({
  projectId: ProjectIdSchema,
});
export type ListPreferencesInput = z.infer<typeof ListPreferencesInputSchema>;

export const ConfirmPreferenceInputSchema = z.object({
  projectId: ProjectIdSchema,
  preferenceId: FounderPreferenceIdSchema,
  idempotencyKey: IdempotencyKeySchema,
});
export type ConfirmPreferenceInput = z.infer<typeof ConfirmPreferenceInputSchema>;

export const CorrectPreferenceInputSchema = z.object({
  projectId: ProjectIdSchema,
  preferenceId: FounderPreferenceIdSchema,
  value: z.unknown(),
  idempotencyKey: IdempotencyKeySchema,
});
export type CorrectPreferenceInput = z.infer<typeof CorrectPreferenceInputSchema>;

export const JobBoardViewSchema = z.enum([
  'kanban',
  'mine',
  'timeline',
  'cost',
  'completed',
  'blocked',
  'needs_me',
  'running',
  'waiting_for_research',
  'needs_review',
]);
export type JobBoardView = z.infer<typeof JobBoardViewSchema>;

export const ListJobsInputSchema = z.object({
  projectId: ProjectIdSchema,
  view: JobBoardViewSchema.default('kanban'),
});
export type ListJobsInput = z.infer<typeof ListJobsInputSchema>;

export const GetJobInputSchema = z.object({
  projectId: ProjectIdSchema,
  jobId: SprintIdSchema,
});
export type GetJobInput = z.infer<typeof GetJobInputSchema>;

export const UpdateJobSettingsInputSchema = z.object({
  projectId: ProjectIdSchema,
  jobId: SprintIdSchema,
  expectedVersion: z.string().min(1),
  patch: z.object({
    toolAllowlist: z.array(z.string()).optional(),
    maxWorkers: z.number().int().positive().optional(),
    maxStalls: z.number().int().positive().optional(),
    roleLabel: z.string().min(1).optional(),
    whyNow: z.string().min(1).optional(),
  }),
  idempotencyKey: IdempotencyKeySchema,
});
export type UpdateJobSettingsInput = z.infer<typeof UpdateJobSettingsInputSchema>;

export const RetryJobInputSchema = z.object({
  projectId: ProjectIdSchema,
  jobId: SprintIdSchema,
  idempotencyKey: IdempotencyKeySchema,
});
export type RetryJobInput = z.infer<typeof RetryJobInputSchema>;

export const ListFounderTasksInputSchema = z.object({
  projectId: ProjectIdSchema,
  status: FounderTaskStatusSchema.optional(),
});
export type ListFounderTasksInput = z.infer<typeof ListFounderTasksInputSchema>;

export const GetFounderTaskInputSchema = z.object({
  projectId: ProjectIdSchema,
  founderTaskId: FounderTaskIdSchema,
});
export type GetFounderTaskInput = z.infer<typeof GetFounderTaskInputSchema>;

export const RequestFounderTaskHelpInputSchema = z.object({
  projectId: ProjectIdSchema,
  founderTaskId: FounderTaskIdSchema,
  idempotencyKey: IdempotencyKeySchema,
});
export type RequestFounderTaskHelpInput = z.infer<typeof RequestFounderTaskHelpInputSchema>;

export const CompleteFounderTaskInputSchema = z.object({
  projectId: ProjectIdSchema,
  founderTaskId: FounderTaskIdSchema,
  evidenceRef: ConversationReferenceSchema,
  idempotencyKey: IdempotencyKeySchema,
});
export type CompleteFounderTaskInput = z.infer<typeof CompleteFounderTaskInputSchema>;

export const DeferOrSkipFounderTaskInputSchema = z.object({
  projectId: ProjectIdSchema,
  founderTaskId: FounderTaskIdSchema,
  reason: z.string().min(1),
  idempotencyKey: IdempotencyKeySchema,
});
export type DeferOrSkipFounderTaskInput = z.infer<typeof DeferOrSkipFounderTaskInputSchema>;

export const GetCurrentScoreInputSchema = z.object({
  projectId: ProjectIdSchema,
});
export type GetCurrentScoreInput = z.infer<typeof GetCurrentScoreInputSchema>;

export const GetScoreForRevisionInputSchema = z.object({
  projectId: ProjectIdSchema,
  revisionId: PackRevisionIdSchema,
});
export type GetScoreForRevisionInput = z.infer<typeof GetScoreForRevisionInputSchema>;

export const GetScoreHistoryInputSchema = z.object({
  projectId: ProjectIdSchema,
  limit: z.number().int().positive().max(50).default(12),
});
export type GetScoreHistoryInput = z.infer<typeof GetScoreHistoryInputSchema>;

export const ExplainScoreInputSchema = z.object({
  projectId: ProjectIdSchema,
  dimension: ScoreDimensionSchema,
});
export type ExplainScoreInput = z.infer<typeof ExplainScoreInputSchema>;
