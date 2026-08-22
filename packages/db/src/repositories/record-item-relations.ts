import {
  ProjectIdSchema,
  RecordItemIdSchema,
  RecordItemRelationIdSchema,
  RecordItemRelationSchema,
  RecordRelationTypeSchema,
  WorkspaceIdSchema,
  type ProjectId,
  type RecordItemId,
  type RecordItemRelation,
  type RecordRelationType,
  type WorkspaceId,
} from '@foundry/domain';
import { z } from 'zod';

import type { Sql } from '../client.js';
import { requireRow } from '../require-row.js';

const RowSchema = z.object({
  id: RecordItemRelationIdSchema,
  project_id: ProjectIdSchema,
  workspace_id: WorkspaceIdSchema,
  source_item_id: RecordItemIdSchema,
  target_item_id: RecordItemIdSchema,
  relation_type: RecordRelationTypeSchema,
  created_at: z.coerce.date(),
});

type Row = z.infer<typeof RowSchema>;

export type InsertRecordItemRelation = {
  projectId: ProjectId;
  workspaceId: WorkspaceId;
  sourceItemId: RecordItemId;
  targetItemId: RecordItemId;
  relationType: RecordRelationType;
};

export function toRecordItemRelation(row: Row): RecordItemRelation {
  return RecordItemRelationSchema.parse({
    id: row.id,
    projectId: row.project_id,
    workspaceId: row.workspace_id,
    sourceItemId: row.source_item_id,
    targetItemId: row.target_item_id,
    relationType: row.relation_type,
    createdAt: row.created_at,
  });
}

function parse(row: Row): RecordItemRelation {
  return toRecordItemRelation(RowSchema.parse(row));
}

export async function insertRecordItemRelation(
  sql: Sql,
  input: InsertRecordItemRelation,
): Promise<RecordItemRelation> {
  const rows = await sql<Row[]>`
    insert into record_item_relations (
      project_id,
      workspace_id,
      source_item_id,
      target_item_id,
      relation_type
    )
    values (
      ${input.projectId},
      ${input.workspaceId},
      ${input.sourceItemId},
      ${input.targetItemId},
      ${input.relationType}
    )
    returning *
  `;
  return parse(requireRow(rows, 'insertRecordItemRelation'));
}

export async function listRecordItemRelationsByProjectId(
  sql: Sql,
  projectId: ProjectId,
): Promise<RecordItemRelation[]> {
  const rows = await sql<Row[]>`
    select * from record_item_relations
    where project_id = ${projectId}
    order by created_at asc
  `;
  return rows.map(parse);
}
