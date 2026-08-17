import {
  SourceIdSchema,
  SourceSnapshotIdSchema,
  SourceSnapshotSchema,
  type SourceId,
  type SourceSnapshot,
} from '@foundry/domain';
import { z } from 'zod';

import type { Sql } from '../client.js';
import { requireRow } from '../require-row.js';

const SourceSnapshotRowSchema = z.object({
  id: SourceSnapshotIdSchema,
  source_id: SourceIdSchema,
  content_hash: z.string().min(1),
  fetched_at: z.coerce.date(),
  parser_metadata_json: z.unknown(),
});

type SourceSnapshotRow = z.infer<typeof SourceSnapshotRowSchema>;

export type InsertSourceSnapshot = {
  sourceId: SourceId;
  contentHash: string;
  parserMetadata?: unknown;
};

export function toSourceSnapshot(row: SourceSnapshotRow): SourceSnapshot {
  return SourceSnapshotSchema.parse({
    id: row.id,
    sourceId: row.source_id,
    contentHash: row.content_hash,
    fetchedAt: row.fetched_at,
    parserMetadata: row.parser_metadata_json,
  });
}

function parseSnapshot(row: SourceSnapshotRow): SourceSnapshot {
  return toSourceSnapshot(SourceSnapshotRowSchema.parse(row));
}

export async function insertSourceSnapshot(
  sql: Sql,
  input: InsertSourceSnapshot,
): Promise<SourceSnapshot> {
  const rows = await sql<SourceSnapshotRow[]>`
    insert into source_snapshots (source_id, content_hash, parser_metadata_json)
    values (
      ${input.sourceId},
      ${input.contentHash},
      ${sql.json(JSON.parse(JSON.stringify(input.parserMetadata ?? {})))}
    )
    returning *
  `;
  return parseSnapshot(requireRow(rows, 'insertSourceSnapshot'));
}
