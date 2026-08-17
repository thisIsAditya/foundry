import {
  BusinessModelSectionKeySchema,
  InterviewParticipantTypeSchema,
  ProjectIdSchema,
  SourceIdSchema,
  SourceKindSchema,
} from '@foundry/domain';
import { z } from 'zod';

import { IdempotencyKeySchema } from './idempotency.js';

export const CreateUploadIntentInputSchema = z.object({
  projectId: ProjectIdSchema,
  filename: z.string().min(1).max(255),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
  kind: SourceKindSchema.optional(),
  idempotencyKey: IdempotencyKeySchema,
});
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

export const ListFindingsInputSchema = z.object({
  projectId: ProjectIdSchema,
});
export type ListFindingsInput = z.infer<typeof ListFindingsInputSchema>;

export const ListInterviewsInputSchema = z.object({
  projectId: ProjectIdSchema,
});
export type ListInterviewsInput = z.infer<typeof ListInterviewsInputSchema>;
