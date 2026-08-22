import {
  ProjectIdSchema,
  RecordItemIdSchema,
  RecordItemStalenessSchema,
  WorkspaceIdSchema,
  type ProjectId,
  type RecordItemId,
  type RecordItemStaleness,
  type WorkspaceId,
} from '@foundry/domain';
import { z } from 'zod';

import type { Sql } from '../client.js';
import { requireRow } from '../require-row.js';

const RowSchema = z.object({
  id: z.string().uuid(),
  project_id: ProjectIdSchema,
  workspace_id: WorkspaceIdSchema,
  source_item_id: RecordItemIdSchema,
  affected_item_id: RecordItemIdSchema,
  reason: z.string(),
  detected_at: z.coerce.date(),
  resolved_by_version_id: z.string().uuid().nullable(),
});

type Row = z.infer<typeof RowSchema>;

export type InsertRecordItemStaleness = {
  projectId: ProjectId;
  workspaceId: WorkspaceId;
  sourceItemId: RecordItemId;
  affectedItemId: RecordItemId;
  reason: string;
};

export function toRecordItemStaleness(row: Row): RecordItemStaleness {
  return RecordItemStalenessSchema.parse({
    id: row.id,
    projectId: row.project_id,
    workspaceId: row.workspace_id,
    sourceItemId: row.source_item_id,
    affectedItemId: row.affected_item_id,
    reason: row.reason,
    detectedAt: row.detected_at,
    resolvedByVersionId: row.resolved_by_version_id,
  });
}

function parse(row: Row): RecordItemStaleness {
  return toRecordItemStaleness(RowSchema.parse(row));
}

export async function insertRecordItemStaleness(
  sql: Sql,
  input: InsertRecordItemStaleness,
): Promise<RecordItemStaleness> {
  const rows = await sql<Row[]>`
    insert into record_item_staleness (
      project_id,
      workspace_id,
      source_item_id,
      affected_item_id,
      reason
    )
    values (
      ${input.projectId},
      ${input.workspaceId},
      ${input.sourceItemId},
      ${input.affectedItemId},
      ${input.reason}
    )
    returning *
  `;
  return parse(requireRow(rows, 'insertRecordItemStaleness'));
}

export async function listOpenStalenessByProjectId(
  sql: Sql,
  projectId: ProjectId,
): Promise<RecordItemStaleness[]> {
  const rows = await sql<Row[]>`
    select * from record_item_staleness
    where project_id = ${projectId} and resolved_by_version_id is null
    order by detected_at desc
  `;
  return rows.map(parse);
}
