import {
  CitationIdSchema,
  CitationLocatorSchema,
  CitationSchema,
  ContentBlockIdSchema,
  SourceSnapshotIdSchema,
  type Citation,
} from '@foundry/domain';
import { z } from 'zod';

import type { Sql } from '../client.js';
import { jsonParam } from '../json.js';
import { requireRow } from '../require-row.js';

const CitationRowSchema = z.object({
  id: CitationIdSchema,
  source_snapshot_id: SourceSnapshotIdSchema,
  content_block_id: ContentBlockIdSchema.nullable(),
  locator_json: z.unknown(),
  created_at: z.coerce.date(),
});

type CitationRow = z.infer<typeof CitationRowSchema>;

export type InsertCitation = {
  sourceSnapshotId: z.infer<typeof SourceSnapshotIdSchema>;
  contentBlockId?: z.infer<typeof ContentBlockIdSchema> | null;
  locator: z.infer<typeof CitationLocatorSchema>;
};

export function toCitation(row: CitationRow): Citation {
  return CitationSchema.parse({
    id: row.id,
    sourceSnapshotId: row.source_snapshot_id,
    contentBlockId: row.content_block_id,
    locator: CitationLocatorSchema.parse(row.locator_json),
    createdAt: row.created_at,
  });
}

function parseCitation(row: CitationRow): Citation {
  return toCitation(CitationRowSchema.parse(row));
}

export async function insertCitation(sql: Sql, input: InsertCitation): Promise<Citation> {
  const rows = await sql<CitationRow[]>`
    insert into citations (source_snapshot_id, content_block_id, locator_json)
    values (
      ${input.sourceSnapshotId},
      ${input.contentBlockId ?? null},
      ${jsonParam(sql, input.locator)}
    )
    returning *
  `;
  return parseCitation(requireRow(rows, 'insertCitation'));
}

export async function listCitationsBySourceSnapshotId(
  sql: Sql,
  sourceSnapshotId: z.infer<typeof SourceSnapshotIdSchema>,
): Promise<Citation[]> {
  const rows = await sql<CitationRow[]>`
    select * from citations where source_snapshot_id = ${sourceSnapshotId} order by created_at asc
  `;
  return rows.map(parseCitation);
}
