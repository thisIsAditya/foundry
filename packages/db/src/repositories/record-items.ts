import {
  ProjectIdSchema,
  RecordItemContentSchema,
  RecordItemIdSchema,
  RecordItemSchema,
  RecordItemStatusSchema,
  RecordProvenanceSchema,
  RecordSectionKeySchema,
  WorkspaceIdSchema,
  type BusinessRecordVersionId,
  type ProjectId,
  type RecordItem,
  type RecordItemContent,
  type RecordItemId,
  type RecordItemStatus,
  type RecordProvenance,
  type RecordSectionKey,
  type WorkspaceId,
} from '@foundry/domain';
import { z } from 'zod';

import type { Sql } from '../client.js';
import { jsonParam } from '../json.js';
import { requireRow } from '../require-row.js';

const RowSchema = z.object({
  id: RecordItemIdSchema,
  project_id: ProjectIdSchema,
  workspace_id: WorkspaceIdSchema,
  section: RecordSectionKeySchema,
  item_key: z.string(),
  title: z.string(),
  body: z.unknown(),
  status: RecordItemStatusSchema,
  provenance: RecordProvenanceSchema,
  current_version_id: z.string().uuid().nullable(),
  revision: z.number().int(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

type Row = z.infer<typeof RowSchema>;

export type InsertRecordItem = {
  projectId: ProjectId;
  workspaceId: WorkspaceId;
  section: RecordSectionKey;
  itemKey: string;
  title: string;
  content?: RecordItemContent;
  status: RecordItemStatus;
  provenance: RecordProvenance;
};

export function toRecordItem(row: Row): RecordItem {
  return RecordItemSchema.parse({
    id: row.id,
    projectId: row.project_id,
    workspaceId: row.workspace_id,
    section: row.section,
    itemKey: row.item_key,
    title: row.title,
    content: RecordItemContentSchema.parse(row.body ?? { summary: '', fields: {} }),
    status: row.status,
    provenance: row.provenance,
    currentVersionId: row.current_version_id,
    revision: row.revision,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function parse(row: Row): RecordItem {
  return toRecordItem(RowSchema.parse(row));
}

export async function insertRecordItem(sql: Sql, input: InsertRecordItem): Promise<RecordItem> {
  const rows = await sql<Row[]>`
    insert into record_items (
      project_id,
      workspace_id,
      section,
      item_key,
      title,
      body,
      status,
      provenance
    )
    values (
      ${input.projectId},
      ${input.workspaceId},
      ${input.section},
      ${input.itemKey},
      ${input.title},
      ${jsonParam(sql, input.content ?? { summary: '', fields: {} })},
      ${input.status},
      ${input.provenance}
    )
    returning *
  `;
  return parse(requireRow(rows, 'insertRecordItem'));
}

export async function listRecordItemsByProjectId(
  sql: Sql,
  projectId: ProjectId,
): Promise<RecordItem[]> {
  const rows = await sql<Row[]>`
    select * from record_items where project_id = ${projectId} order by section
  `;
  return rows.map(parse);
}

export async function getRecordItemBySection(
  sql: Sql,
  projectId: ProjectId,
  section: RecordSectionKey,
  itemKey: string,
): Promise<RecordItem | null> {
  const rows = await sql<Row[]>`
    select * from record_items
    where project_id = ${projectId} and section = ${section} and item_key = ${itemKey}
  `;
  const row = rows[0];
  return row === undefined ? null : parse(row);
}

export async function getRecordItemById(sql: Sql, id: RecordItemId): Promise<RecordItem | null> {
  const rows = await sql<Row[]>`
    select * from record_items where id = ${id}
  `;
  const row = rows[0];
  return row === undefined ? null : parse(row);
}

export async function updateRecordItem(
  sql: Sql,
  id: RecordItemId,
  input: {
    expectedRevision: number;
    content?: RecordItemContent;
    status: RecordItemStatus;
    provenance: RecordProvenance;
    currentVersionId?: BusinessRecordVersionId | null;
  },
): Promise<RecordItem | null> {
  const rows = await sql<Row[]>`
    update record_items
    set
      body = coalesce(${input.content === undefined ? null : jsonParam(sql, input.content)}, body),
      status = ${input.status},
      provenance = ${input.provenance},
      current_version_id = coalesce(${input.currentVersionId ?? null}, current_version_id),
      revision = revision + 1,
      updated_at = now()
    where id = ${id} and revision = ${input.expectedRevision}
    returning *
  `;
  const row = rows[0];
  return row === undefined ? null : parse(row);
}

export async function markRecordItemStale(sql: Sql, id: RecordItemId): Promise<RecordItem | null> {
  const rows = await sql<Row[]>`
    update record_items
    set status = 'stale', updated_at = now()
    where id = ${id} and status = 'accepted'
    returning *
  `;
  const row = rows[0];
  return row === undefined ? null : parse(row);
}
