import {
  ArtifactFormatSchema,
  ArtifactIdSchema,
  ArtifactTypeSchema,
  ProjectIdSchema,
} from '@foundry/domain';
import { z } from 'zod';

import { IdempotencyKeySchema } from './idempotency.js';

export const GenerateArtifactInputSchema = z.object({
  projectId: ProjectIdSchema,
  artifactType: ArtifactTypeSchema,
  templateVersion: z.number().int().positive().optional(),
  idempotencyKey: IdempotencyKeySchema,
});
export type GenerateArtifactInput = z.infer<typeof GenerateArtifactInputSchema>;

export const GetArtifactVersionInputSchema = z.object({
  projectId: ProjectIdSchema,
  artifactId: ArtifactIdSchema,
  version: z.number().int().positive().optional(),
});
export type GetArtifactVersionInput = z.infer<typeof GetArtifactVersionInputSchema>;

export const ExportArtifactInputSchema = z.object({
  projectId: ProjectIdSchema,
  artifactId: ArtifactIdSchema,
  version: z.number().int().positive(),
  format: ArtifactFormatSchema,
});
export type ExportArtifactInput = z.infer<typeof ExportArtifactInputSchema>;

export const ExportPackInputSchema = z.object({
  projectId: ProjectIdSchema,
  format: z.literal('json').default('json'),
  idempotencyKey: IdempotencyKeySchema,
});
export type ExportPackInput = z.infer<typeof ExportPackInputSchema>;
