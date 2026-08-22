import {
  InterviewIdSchema,
  InterviewImportBatchIdSchema,
  InterviewImportBatchSchema,
  InterviewImportBatchStatusSchema,
  InterviewImportCandidateIdSchema,
  InterviewImportCandidateSchema,
  InterviewImportCandidateStatusSchema,
  InterviewParticipantTypeSchema,
  ProjectIdSchema,
  SourceIdSchema,
  SourceSnapshotIdSchema,
  WorkspaceIdSchema,
  type InterviewId,
  type InterviewImportBatch,
  type InterviewImportBatchStatus,
  type InterviewImportCandidate,
  type InterviewImportCandidateStatus,
  type InterviewParticipantType,
  type ProjectId,
  type SourceId,
  type SourceSnapshotId,
  type WorkspaceId,
} from '@foundry/domain';
import { z } from 'zod';

import type { Sql } from '../client.js';
import { jsonParam } from '../json.js';
import { requireRow } from '../require-row.js';

const BatchRowSchema = z.object({
  id: InterviewImportBatchIdSchema,
  project_id: ProjectIdSchema,
  workspace_id: WorkspaceIdSchema,
  source_id: SourceIdSchema,
  source_snapshot_id: SourceSnapshotIdSchema.nullable(),
  classification: z.enum(['interview_bundle', 'single_interview', 'other']),
  status: InterviewImportBatchStatusSchema,
  extractor_version: z.string(),
  failure_reason: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

const CandidateRowSchema = z.object({
  id: InterviewImportCandidateIdSchema,
  batch_id: InterviewImportBatchIdSchema,
  project_id: ProjectIdSchema,
  workspace_id: WorkspaceIdSchema,
  position: z.number().int(),
  label: z.string(),
  participant_type: InterviewParticipantTypeSchema,
  consent_given: z.boolean(),
  consent_unknown: z.boolean(),
  notes: z.string(),
  quotes: z.unknown(),
  excerpt: z.string(),
  warnings: z.unknown(),
  status: InterviewImportCandidateStatusSchema,
  founder_edits: z.unknown(),
  accepted_interview_id: InterviewIdSchema.nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

type BatchRow = z.infer<typeof BatchRowSchema>;
type CandidateRow = z.infer<typeof CandidateRowSchema>;

export type InsertInterviewImportBatch = {
  projectId: ProjectId;
  workspaceId: WorkspaceId;
  sourceId: SourceId;
  sourceSnapshotId?: SourceSnapshotId | null;
  classification: InterviewImportBatch['classification'];
  status?: InterviewImportBatchStatus;
  extractorVersion: string;
  failureReason?: string | null;
};

export type InsertInterviewImportCandidate = {
  batchId: InterviewImportBatch['id'];
  projectId: ProjectId;
  workspaceId: WorkspaceId;
  position: number;
  label: string;
  participantType: InterviewParticipantType;
  consentGiven?: boolean;
  consentUnknown?: boolean;
  notes: string;
  quotes: readonly string[];
  excerpt: string;
  warnings: readonly string[];
  status?: InterviewImportCandidateStatus;
};

function parseQuotes(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === 'string' && item.length > 0);
}

function parseWarnings(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === 'string');
}

export function toInterviewImportBatch(row: BatchRow): InterviewImportBatch {
  return InterviewImportBatchSchema.parse({
    id: row.id,
    projectId: row.project_id,
    workspaceId: row.workspace_id,
    sourceId: row.source_id,
    sourceSnapshotId: row.source_snapshot_id,
    classification: row.classification,
    status: row.status,
    extractorVersion: row.extractor_version,
    failureReason: row.failure_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

export function toInterviewImportCandidate(row: CandidateRow): InterviewImportCandidate {
  return InterviewImportCandidateSchema.parse({
    id: row.id,
    batchId: row.batch_id,
    projectId: row.project_id,
    workspaceId: row.workspace_id,
    position: row.position,
    label: row.label,
    participantType: row.participant_type,
    consentGiven: row.consent_given,
    consentUnknown: row.consent_unknown,
    notes: row.notes,
    quotes: parseQuotes(row.quotes),
    excerpt: row.excerpt,
    warnings: parseWarnings(row.warnings),
    status: row.status,
    founderEdits: row.founder_edits ?? {},
    acceptedInterviewId: row.accepted_interview_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function parseBatch(row: BatchRow): InterviewImportBatch {
  return toInterviewImportBatch(BatchRowSchema.parse(row));
}

function parseCandidate(row: CandidateRow): InterviewImportCandidate {
  return toInterviewImportCandidate(CandidateRowSchema.parse(row));
}

export async function insertInterviewImportBatch(
  sql: Sql,
  input: InsertInterviewImportBatch,
): Promise<InterviewImportBatch> {
  const rows = await sql<BatchRow[]>`
    insert into interview_import_batches (
      project_id,
      workspace_id,
      source_id,
      source_snapshot_id,
      classification,
      status,
      extractor_version,
      failure_reason
    )
    values (
      ${input.projectId},
      ${input.workspaceId},
      ${input.sourceId},
      ${input.sourceSnapshotId ?? null},
      ${input.classification},
      ${input.status ?? 'extracted'},
      ${input.extractorVersion},
      ${input.failureReason ?? null}
    )
    returning *
  `;
  return parseBatch(requireRow(rows, 'insertInterviewImportBatch'));
}

export async function insertInterviewImportCandidate(
  sql: Sql,
  input: InsertInterviewImportCandidate,
): Promise<InterviewImportCandidate> {
  const rows = await sql<CandidateRow[]>`
    insert into interview_import_candidates (
      batch_id,
      project_id,
      workspace_id,
      position,
      label,
      participant_type,
      consent_given,
      consent_unknown,
      notes,
      quotes,
      excerpt,
      warnings,
      status
    )
    values (
      ${input.batchId},
      ${input.projectId},
      ${input.workspaceId},
      ${input.position},
      ${input.label},
      ${input.participantType},
      ${input.consentGiven ?? false},
      ${input.consentUnknown ?? true},
      ${input.notes},
      ${jsonParam(sql, input.quotes)},
      ${input.excerpt},
      ${jsonParam(sql, input.warnings)},
      ${input.status ?? 'pending'}
    )
    returning *
  `;
  return parseCandidate(requireRow(rows, 'insertInterviewImportCandidate'));
}

export async function getInterviewImportBatchById(
  sql: Sql,
  id: InterviewImportBatch['id'],
): Promise<InterviewImportBatch | null> {
  const rows = await sql<BatchRow[]>`
    select * from interview_import_batches where id = ${id}
  `;
  const row = rows[0];
  return row === undefined ? null : parseBatch(row);
}

export async function listInterviewImportBatchesByProjectId(
  sql: Sql,
  projectId: ProjectId,
): Promise<InterviewImportBatch[]> {
  const rows = await sql<BatchRow[]>`
    select * from interview_import_batches
    where project_id = ${projectId}
    order by created_at desc
  `;
  return rows.map(parseBatch);
}

export async function listInterviewImportCandidatesByBatchId(
  sql: Sql,
  batchId: InterviewImportBatch['id'],
): Promise<InterviewImportCandidate[]> {
  const rows = await sql<CandidateRow[]>`
    select * from interview_import_candidates
    where batch_id = ${batchId}
    order by position asc
  `;
  return rows.map(parseCandidate);
}

export async function getInterviewImportCandidateById(
  sql: Sql,
  id: InterviewImportCandidate['id'],
): Promise<InterviewImportCandidate | null> {
  const rows = await sql<CandidateRow[]>`
    select * from interview_import_candidates where id = ${id}
  `;
  const row = rows[0];
  return row === undefined ? null : parseCandidate(row);
}

export async function updateInterviewImportBatchStatus(
  sql: Sql,
  id: InterviewImportBatch['id'],
  status: InterviewImportBatchStatus,
  failureReason?: string | null,
): Promise<InterviewImportBatch | null> {
  const rows = await sql<BatchRow[]>`
    update interview_import_batches
    set
      status = ${status},
      failure_reason = coalesce(${failureReason ?? null}, failure_reason),
      updated_at = now()
    where id = ${id}
    returning *
  `;
  const row = rows[0];
  return row === undefined ? null : parseBatch(row);
}

export async function updateInterviewImportCandidate(
  sql: Sql,
  id: InterviewImportCandidate['id'],
  input: {
    label?: string;
    participantType?: InterviewParticipantType;
    consentGiven?: boolean;
    consentUnknown?: boolean;
    notes?: string;
    quotes?: readonly string[];
    status?: InterviewImportCandidateStatus;
    acceptedInterviewId?: InterviewId | null;
    founderEdits?: unknown;
  },
): Promise<InterviewImportCandidate | null> {
  const rows = await sql<CandidateRow[]>`
    update interview_import_candidates
    set
      label = coalesce(${input.label ?? null}, label),
      participant_type = coalesce(${input.participantType ?? null}, participant_type),
      consent_given = coalesce(${input.consentGiven ?? null}, consent_given),
      consent_unknown = coalesce(${input.consentUnknown ?? null}, consent_unknown),
      notes = coalesce(${input.notes ?? null}, notes),
      quotes = coalesce(${input.quotes === undefined ? null : jsonParam(sql, input.quotes)}, quotes),
      status = coalesce(${input.status ?? null}, status),
      accepted_interview_id = coalesce(${input.acceptedInterviewId ?? null}, accepted_interview_id),
      founder_edits = coalesce(
        ${input.founderEdits === undefined ? null : jsonParam(sql, input.founderEdits)},
        founder_edits
      ),
      updated_at = now()
    where id = ${id}
    returning *
  `;
  const row = rows[0];
  return row === undefined ? null : parseCandidate(row);
}
