import {
  BusinessRecordVersionIdSchema,
  ProjectIdSchema,
  ProjectMemoryEntryIdSchema,
  ProjectMemoryEntrySchema,
  ProjectMemoryKindSchema,
  UserIdSchema,
  WorkspaceIdSchema,
  type BusinessRecordVersionId,
  type ProjectId,
  type ProjectMemoryAuthorType,
  type ProjectMemoryEntry,
  type ProjectMemoryKind,
  type UserId,
  type WorkspaceId,
} from '@foundry/domain';
import { z } from 'zod';

import type { Sql } from '../client.js';
import { jsonParam } from '../json.js';
import { requireRow } from '../require-row.js';

const RowSchema = z.object({
  id: ProjectMemoryEntryIdSchema,
  project_id: ProjectIdSchema,
  workspace_id: WorkspaceIdSchema,
  kind: ProjectMemoryKindSchema,
  body: z.string(),
  source_kind: z.string(),
  source_ids: z.unknown(),
  author_type: z.enum(['founder', 'cofounder', 'system']),
  author_id: UserIdSchema.nullable(),
  record_version_id: BusinessRecordVersionIdSchema.nullable(),
  stale: z.boolean(),
  generated_at: z.coerce.date(),
  superseded_at: z.coerce.date().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

type Row = z.infer<typeof RowSchema>;

export type InsertProjectMemoryEntry = {
  projectId: ProjectId;
  workspaceId: WorkspaceId;
  kind: ProjectMemoryKind;
  body: string;
  sourceKind: string;
  sourceIds?: readonly string[];
  authorType: ProjectMemoryAuthorType;
  authorId?: UserId | null;
  recordVersionId?: BusinessRecordVersionId | null;
};

export function toProjectMemoryEntry(row: Row): ProjectMemoryEntry {
  return ProjectMemoryEntrySchema.parse({
    id: row.id,
    projectId: row.project_id,
    workspaceId: row.workspace_id,
    kind: row.kind,
    body: row.body,
    sourceKind: row.source_kind,
    sourceIds: Array.isArray(row.source_ids)
      ? row.source_ids.filter((item): item is string => typeof item === 'string')
      : [],
    authorType: row.author_type,
    authorId: row.author_id,
    recordVersionId: row.record_version_id,
    stale: row.stale,
    generatedAt: row.generated_at,
    supersededAt: row.superseded_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function parse(row: Row): ProjectMemoryEntry {
  return toProjectMemoryEntry(RowSchema.parse(row));
}

export async function insertProjectMemoryEntry(
  sql: Sql,
  input: InsertProjectMemoryEntry,
): Promise<ProjectMemoryEntry> {
  const rows = await sql<Row[]>`
    insert into project_memory_entries (
      project_id,
      workspace_id,
      kind,
      body,
      source_kind,
      source_ids,
      author_type,
      author_id,
      record_version_id
    )
    values (
      ${input.projectId},
      ${input.workspaceId},
      ${input.kind},
      ${input.body},
      ${input.sourceKind},
      ${jsonParam(sql, input.sourceIds ?? [])},
      ${input.authorType},
      ${input.authorId ?? null},
      ${input.recordVersionId ?? null}
    )
    returning *
  `;
  return parse(requireRow(rows, 'insertProjectMemoryEntry'));
}

export async function listActiveProjectMemoryByProjectId(
  sql: Sql,
  projectId: ProjectId,
): Promise<ProjectMemoryEntry[]> {
  const rows = await sql<Row[]>`
    select * from project_memory_entries
    where project_id = ${projectId} and superseded_at is null
    order by generated_at desc
  `;
  return rows.map(parse);
}

export async function getProjectMemoryEntryById(
  sql: Sql,
  id: ProjectMemoryEntry['id'],
): Promise<ProjectMemoryEntry | null> {
  const rows = await sql<Row[]>`
    select * from project_memory_entries where id = ${id}
  `;
  const row = rows[0];
  return row === undefined ? null : parse(row);
}

export async function updateProjectMemoryEntry(
  sql: Sql,
  id: ProjectMemoryEntry['id'],
  input: { body: string; sourceIds?: readonly string[] },
): Promise<ProjectMemoryEntry | null> {
  const rows = await sql<Row[]>`
    update project_memory_entries
    set
      body = ${input.body},
      source_ids = coalesce(
        ${input.sourceIds === undefined ? null : jsonParam(sql, input.sourceIds)},
        source_ids
      ),
      updated_at = now()
    where id = ${id} and superseded_at is null
    returning *
  `;
  const row = rows[0];
  return row === undefined ? null : parse(row);
}

export async function supersedeProjectMemoryEntry(
  sql: Sql,
  id: ProjectMemoryEntry['id'],
): Promise<ProjectMemoryEntry | null> {
  const rows = await sql<Row[]>`
    update project_memory_entries
    set superseded_at = now(), stale = true, updated_at = now()
    where id = ${id} and superseded_at is null
    returning *
  `;
  const row = rows[0];
  return row === undefined ? null : parse(row);
}
