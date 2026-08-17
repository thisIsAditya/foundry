import { ProjectIdSchema, SourceIdSchema } from '@foundry/domain';
import { z } from 'zod';

import { IdempotencyKeySchema } from './idempotency.js';

export const CreateUploadIntentInputSchema = z.object({
  projectId: ProjectIdSchema,
  filename: z.string().min(1).max(255),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
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
