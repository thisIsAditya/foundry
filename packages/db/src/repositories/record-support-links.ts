import {
  ProjectIdSchema,
  RecordItemIdSchema,
  RecordSupportLinkIdSchema,
  RecordSupportLinkSchema,
  RecordRelationTypeSchema,
  RecordSupportTargetKindSchema,
  WorkspaceIdSchema,
  type ProjectId,
  type RecordItemId,
  type RecordRelationType,
  type RecordSupportLink,
  type RecordSupportTargetKind,
  type WorkspaceId,
} from '@foundry/domain';
import { z } from 'zod';

import type { Sql } from '../client.js';
import { requireRow } from '../require-row.js';

const RowSchema = z.object({
  id: RecordSupportLinkIdSchema,
  project_id: ProjectIdSchema,
  workspace_id: WorkspaceIdSchema,
  record_item_id: RecordItemIdSchema,
  target_kind: RecordSupportTargetKindSchema,
  target_id: z.string().uuid(),
  relation_type: RecordRelationTypeSchema,
  created_at: z.coerce.date(),
});

type Row = z.infer<typeof RowSchema>;

export type InsertRecordSupportLink = {
  projectId: ProjectId;
  workspaceId: WorkspaceId;
  recordItemId: RecordItemId;
  targetKind: RecordSupportTargetKind;
  targetId: string;
  relationType: RecordRelationType;
};

export function toRecordSupportLink(row: Row): RecordSupportLink {
  return RecordSupportLinkSchema.parse({
    id: row.id,
    projectId: row.project_id,
    workspaceId: row.workspace_id,
    recordItemId: row.record_item_id,
    targetKind: row.target_kind,
    targetId: row.target_id,
    relationType: row.relation_type,
    createdAt: row.created_at,
  });
}

function parse(row: Row): RecordSupportLink {
  return toRecordSupportLink(RowSchema.parse(row));
}

export async function insertRecordSupportLink(
  sql: Sql,
  input: InsertRecordSupportLink,
): Promise<RecordSupportLink> {
  const rows = await sql<Row[]>`
    insert into record_support_links (
      project_id,
      workspace_id,
      record_item_id,
      target_kind,
      target_id,
      relation_type
    )
    values (
      ${input.projectId},
      ${input.workspaceId},
      ${input.recordItemId},
      ${input.targetKind},
      ${input.targetId},
      ${input.relationType}
    )
    on conflict (record_item_id, target_kind, target_id, relation_type) do nothing
    returning *
  `;
  const row = rows[0];
  if (row !== undefined) {
    return parse(row);
  }
  const existing = await sql<Row[]>`
    select * from record_support_links
    where record_item_id = ${input.recordItemId}
      and target_kind = ${input.targetKind}
      and target_id = ${input.targetId}
      and relation_type = ${input.relationType}
  `;
  return parse(requireRow(existing, 'insertRecordSupportLink'));
}

export async function listRecordSupportLinksByProjectId(
  sql: Sql,
  projectId: ProjectId,
): Promise<RecordSupportLink[]> {
  const rows = await sql<Row[]>`
    select * from record_support_links
    where project_id = ${projectId}
    order by created_at asc
  `;
  return rows.map(parse);
}

export async function listRecordSupportLinksByItemId(
  sql: Sql,
  recordItemId: RecordItemId,
): Promise<RecordSupportLink[]> {
  const rows = await sql<Row[]>`
    select * from record_support_links
    where record_item_id = ${recordItemId}
    order by created_at asc
  `;
  return rows.map(parse);
}
