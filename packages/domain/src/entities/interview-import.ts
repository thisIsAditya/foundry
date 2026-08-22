import { z } from 'zod';

import {
  InterviewIdSchema,
  InterviewImportBatchIdSchema,
  InterviewImportCandidateIdSchema,
  ProjectIdSchema,
  SourceIdSchema,
  SourceSnapshotIdSchema,
  WorkspaceIdSchema,
} from '../ids.js';
import { InterviewParticipantTypeSchema } from '../status/evidence-status.js';
import { InstantSchema } from '../value-objects/primitives.js';

export const InterviewImportBatchStatuses = [
  'uploaded',
  'extracted',
  'reviewing',
  'accepted',
  'rejected',
  'failed',
] as const;
export const InterviewImportBatchStatusSchema = z.enum(InterviewImportBatchStatuses);
export type InterviewImportBatchStatus = z.infer<typeof InterviewImportBatchStatusSchema>;

export const InterviewImportCandidateStatuses = [
  'pending',
  'edited',
  'accepted',
  'rejected',
  'duplicate',
] as const;
export const InterviewImportCandidateStatusSchema = z.enum(InterviewImportCandidateStatuses);
export type InterviewImportCandidateStatus = z.infer<typeof InterviewImportCandidateStatusSchema>;

export const InterviewImportBatchSchema = z.object({
  id: InterviewImportBatchIdSchema,
  projectId: ProjectIdSchema,
  workspaceId: WorkspaceIdSchema,
  sourceId: SourceIdSchema,
  sourceSnapshotId: SourceSnapshotIdSchema.nullable(),
  classification: z.enum(['interview_bundle', 'single_interview', 'other']),
  status: InterviewImportBatchStatusSchema,
  extractorVersion: z.string().min(1),
  failureReason: z.string().nullable(),
  createdAt: InstantSchema,
  updatedAt: InstantSchema,
});
export type InterviewImportBatch = z.infer<typeof InterviewImportBatchSchema>;

export const InterviewImportCandidateSchema = z.object({
  id: InterviewImportCandidateIdSchema,
  batchId: InterviewImportBatchIdSchema,
  projectId: ProjectIdSchema,
  workspaceId: WorkspaceIdSchema,
  position: z.number().int().nonnegative(),
  label: z.string().min(1),
  participantType: InterviewParticipantTypeSchema,
  consentGiven: z.boolean(),
  consentUnknown: z.boolean(),
  notes: z.string(),
  quotes: z.array(z.string().min(1)),
  excerpt: z.string(),
  warnings: z.array(z.string()),
  status: InterviewImportCandidateStatusSchema,
  founderEdits: z.unknown(),
  acceptedInterviewId: InterviewIdSchema.nullable(),
  createdAt: InstantSchema,
  updatedAt: InstantSchema,
});
export type InterviewImportCandidate = z.infer<typeof InterviewImportCandidateSchema>;
