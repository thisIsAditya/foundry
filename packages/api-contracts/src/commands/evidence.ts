import {
  BusinessModelSectionKeySchema,
  InterviewParticipantTypeSchema,
  ProjectIdSchema,
  SourceIdSchema,
  SourceKindSchema,
  WorkspaceIdSchema,
} from '@foundry/domain';
import { z } from 'zod';

import { IdempotencyKeySchema } from './idempotency.js';

export const CreateUploadIntentInputSchema = z
  .object({
    projectId: ProjectIdSchema.optional(),
    workspaceId: WorkspaceIdSchema.optional(),
    filename: z.string().min(1).max(255),
    mimeType: z.string().min(1),
    sizeBytes: z.number().int().positive(),
    kind: SourceKindSchema.optional(),
    idempotencyKey: IdempotencyKeySchema,
  })
  .refine((value) => value.projectId !== undefined || value.workspaceId !== undefined);
export type CreateUploadIntentInput = z.infer<typeof CreateUploadIntentInputSchema>;

export const ConfirmUploadInputSchema = z.object({
  sourceId: SourceIdSchema,
  idempotencyKey: IdempotencyKeySchema,
});
export type ConfirmUploadInput = z.infer<typeof ConfirmUploadInputSchema>;

export const ListEvidenceInputSchema = z.object({
  projectId: ProjectIdSchema,
});
export type ListEvidenceInput = z.infer<typeof ListEvidenceInputSchema>;

export const SearchEvidenceInputSchema = z.object({
  projectId: ProjectIdSchema,
  query: z.string().min(1),
});
export type SearchEvidenceInput = z.infer<typeof SearchEvidenceInputSchema>;

export const InterviewConsentInputSchema = z
  .object({
    given: z.boolean(),
    simulated: z.boolean().optional(),
    hypotheticalPitch: z.boolean().optional(),
  })
  .passthrough();
export type InterviewConsentInput = z.infer<typeof InterviewConsentInputSchema>;

export const AddInterviewInputSchema = z.object({
  projectId: ProjectIdSchema,
  participantType: InterviewParticipantTypeSchema,
  consent: InterviewConsentInputSchema,
  conductedAt: z.coerce.date().optional(),
  label: z.string().min(1).optional(),
  notes: z.string().min(1).optional(),
  sourceId: SourceIdSchema.optional(),
  quotes: z.array(z.string().min(1)).min(1),
  idempotencyKey: IdempotencyKeySchema,
});
export type AddInterviewInput = z.infer<typeof AddInterviewInputSchema>;

export const RecordObservationInputSchema = z.object({
  projectId: ProjectIdSchema,
  summary: z.string().min(1),
  sectionKey: BusinessModelSectionKeySchema.optional(),
  idempotencyKey: IdempotencyKeySchema,
});
export type RecordObservationInput = z.infer<typeof RecordObservationInputSchema>;

export const EvidenceLibraryFilters = [
  'interviews',
  'quotes',
  'sources',
  'findings',
  'assumptions',
  'payment_signals',
  'stale',
  'conflicting',
] as const;
export const EvidenceLibraryFilterSchema = z.enum(EvidenceLibraryFilters);
export type EvidenceLibraryFilter = z.infer<typeof EvidenceLibraryFilterSchema>;

export const ListEvidenceLibraryInputSchema = z.object({
  projectId: ProjectIdSchema,
  filter: EvidenceLibraryFilterSchema.optional(),
});
export type ListEvidenceLibraryInput = z.infer<typeof ListEvidenceLibraryInputSchema>;

export const EvidenceLibraryItemSchema = z.object({
  id: z.string().min(1),
  kind: EvidenceLibraryFilterSchema,
  title: z.string().min(1),
  detail: z.string(),
  stale: z.boolean(),
  conflicting: z.boolean(),
  createdAt: z.coerce.date(),
});
export type EvidenceLibraryItem = z.infer<typeof EvidenceLibraryItemSchema>;

export const ListInterviewsInputSchema = z.object({
  projectId: ProjectIdSchema,
});
export type ListInterviewsInput = z.infer<typeof ListInterviewsInputSchema>;

export const StartInterviewImportInputSchema = z
  .object({
    projectId: ProjectIdSchema,
    sourceId: SourceIdSchema.optional(),
    text: z.string().min(1).optional(),
    filename: z.string().min(1).optional(),
    idempotencyKey: IdempotencyKeySchema,
  })
  .refine(
    (value) =>
      value.sourceId !== undefined || (value.text !== undefined && value.text.trim().length > 0),
    {
      message: 'Provide an uploaded source or pasted interview notes.',
    },
  );
export type StartInterviewImportInput = z.infer<typeof StartInterviewImportInputSchema>;

export const ListInterviewImportsInputSchema = z.object({
  projectId: ProjectIdSchema,
});
export type ListInterviewImportsInput = z.infer<typeof ListInterviewImportsInputSchema>;

export const GetInterviewImportInputSchema = z.object({
  projectId: ProjectIdSchema,
  batchId: z.string().uuid(),
});
export type GetInterviewImportInput = z.infer<typeof GetInterviewImportInputSchema>;

export const ReviewInterviewImportCandidateInputSchema = z.object({
  projectId: ProjectIdSchema,
  candidateId: z.string().uuid(),
  label: z.string().min(1).optional(),
  participantType: InterviewParticipantTypeSchema.optional(),
  notes: z.string().optional(),
  quotes: z.array(z.string().min(1)).optional(),
  consentGiven: z.boolean().optional(),
  idempotencyKey: IdempotencyKeySchema,
});
export type ReviewInterviewImportCandidateInput = z.infer<
  typeof ReviewInterviewImportCandidateInputSchema
>;

export const DecideInterviewImportInputSchema = z.object({
  projectId: ProjectIdSchema,
  batchId: z.string().uuid(),
  acceptIds: z.array(z.string().uuid()),
  rejectIds: z.array(z.string().uuid()).default([]),
  idempotencyKey: IdempotencyKeySchema,
});
export type DecideInterviewImportInput = z.infer<typeof DecideInterviewImportInputSchema>;

export const ListProjectMemoryInputSchema = z.object({
  projectId: ProjectIdSchema,
});
export type ListProjectMemoryInput = z.infer<typeof ListProjectMemoryInputSchema>;

export const UpsertProjectMemoryInputSchema = z.object({
  projectId: ProjectIdSchema,
  id: z.string().uuid().optional(),
  kind: z.enum([
    'goal',
    'constraint',
    'preference',
    'decision',
    'question',
    'assumption',
    'experiment',
    'conversation',
  ]),
  body: z.string().min(1),
  sourceIds: z.array(z.string().min(1)).default([]),
  idempotencyKey: IdempotencyKeySchema,
});
export type UpsertProjectMemoryInput = z.infer<typeof UpsertProjectMemoryInputSchema>;

export const DeleteProjectMemoryInputSchema = z.object({
  projectId: ProjectIdSchema,
  id: z.string().uuid(),
  idempotencyKey: IdempotencyKeySchema,
});
export type DeleteProjectMemoryInput = z.infer<typeof DeleteProjectMemoryInputSchema>;
