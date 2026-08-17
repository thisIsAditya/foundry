import {
  DataClassificationSchema,
  DocumentIdSchema,
  DocumentSchema,
  SourceIdSchema,
  SourceSnapshotIdSchema,
  type DataClassification,
  type Document,
  type DocumentId,
  type SourceId,
  type SourceSnapshotId,
} from '@foundry/domain';
import { z } from 'zod';

import type { Sql } from '../client.js';
import { requireRow } from '../require-row.js';

const DocumentRowSchema = z.object({
  id: DocumentIdSchema,
  source_id: SourceIdSchema,
  latest_snapshot_id: SourceSnapshotIdSchema.nullable(),
  title: z.string().nullable(),
  data_classification: DataClassificationSchema,
  created_at: z.coerce.date(),
});

type DocumentRow = z.infer<typeof DocumentRowSchema>;

export type InsertDocument = {
  sourceId: SourceId;
  title?: string | null;
  dataClassification?: DataClassification;
};

export function toDocument(row: DocumentRow): Document {
  return DocumentSchema.parse({
    id: row.id,
    sourceId: row.source_id,
    latestSnapshotId: row.latest_snapshot_id,
    title: row.title,
    dataClassification: row.data_classification,
    createdAt: row.created_at,
  });
}

function parseDocument(row: DocumentRow): Document {
  return toDocument(DocumentRowSchema.parse(row));
}

export async function insertDocument(sql: Sql, input: InsertDocument): Promise<Document> {
  const rows = await sql<DocumentRow[]>`
    insert into documents (source_id, title, data_classification)
    values (
      ${input.sourceId},
      ${input.title ?? null},
      ${input.dataClassification ?? 'internal'}
    )
    returning *
  `;
  return parseDocument(requireRow(rows, 'insertDocument'));
}

export async function getDocumentBySourceId(
  sql: Sql,
  sourceId: SourceId,
): Promise<Document | null> {
  const rows = await sql<DocumentRow[]>`
    select * from documents where source_id = ${sourceId} order by created_at asc limit 1
  `;
  const row = rows[0];
  return row === undefined ? null : parseDocument(row);
}

export async function updateDocumentLatestSnapshot(
  sql: Sql,
  id: DocumentId,
  snapshotId: SourceSnapshotId,
  title: string | null,
): Promise<Document> {
  const rows = await sql<DocumentRow[]>`
    update documents
    set latest_snapshot_id = ${snapshotId},
        title = ${title}
    where id = ${id}
    returning *
  `;
  return parseDocument(requireRow(rows, 'updateDocumentLatestSnapshot'));
}
