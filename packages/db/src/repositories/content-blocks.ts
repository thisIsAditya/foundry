import {
  CitationLocatorSchema,
  ContentBlockIdSchema,
  ContentBlockSchema,
  ContentBlockTypeSchema,
  DocumentIdSchema,
  SourceSnapshotIdSchema,
  type CitationLocator,
  type ContentBlock,
  type ContentBlockType,
  type DocumentId,
  type ProjectId,
  type SourceId,
  type SourceSnapshotId,
} from '@foundry/domain';
import { z } from 'zod';

import type { Sql } from '../client.js';
import { requireRow } from '../require-row.js';

const ContentBlockRowSchema = z.object({
  id: ContentBlockIdSchema,
  document_id: DocumentIdSchema,
  source_snapshot_id: SourceSnapshotIdSchema,
  block_type: ContentBlockTypeSchema,
  sequence_no: z.number().int(),
  text_content: z.string().nullable(),
  structured_content_json: z.unknown().nullable(),
  locator_json: CitationLocatorSchema,
});

type ContentBlockRow = z.infer<typeof ContentBlockRowSchema>;

export type InsertContentBlock = {
  documentId: DocumentId;
  sourceSnapshotId: SourceSnapshotId;
  blockType: ContentBlockType;
  sequenceNo: number;
  textContent?: string | null;
  structuredContent?: unknown;
  locator: CitationLocator;
};

export type ContentBlockSearchHit = ContentBlock & {
  rank: number;
};

export function toContentBlock(row: ContentBlockRow): ContentBlock {
  return ContentBlockSchema.parse({
    id: row.id,
    documentId: row.document_id,
    sourceSnapshotId: row.source_snapshot_id,
    blockType: row.block_type,
    sequenceNo: row.sequence_no,
    textContent: row.text_content,
    structuredContent: row.structured_content_json,
    locator: row.locator_json,
  });
}

function parseBlock(row: ContentBlockRow): ContentBlock {
  return toContentBlock(ContentBlockRowSchema.parse(row));
}

export async function insertContentBlock(
  sql: Sql,
  input: InsertContentBlock,
): Promise<ContentBlock> {
  const rows = await sql<ContentBlockRow[]>`
    insert into content_blocks (
      document_id,
      source_snapshot_id,
      block_type,
      sequence_no,
      text_content,
      structured_content_json,
      locator_json
    )
    values (
      ${input.documentId},
      ${input.sourceSnapshotId},
      ${input.blockType},
      ${input.sequenceNo},
      ${input.textContent ?? null},
      ${input.structuredContent === undefined ? null : sql.json(JSON.parse(JSON.stringify(input.structuredContent)))},
      ${sql.json(JSON.parse(JSON.stringify(input.locator)))}
    )
    returning
      id,
      document_id,
      source_snapshot_id,
      block_type,
      sequence_no,
      text_content,
      structured_content_json,
      locator_json
  `;
  return parseBlock(requireRow(rows, 'insertContentBlock'));
}

export async function searchContentBlocks(
  sql: Sql,
  projectId: ProjectId,
  query: string,
  limit = 20,
): Promise<ContentBlockSearchHit[]> {
  const trimmed = query.trim();
  if (trimmed.length === 0) {
    return [];
  }
  const rows = await sql<(ContentBlockRow & { rank: number })[]>`
    select
      cb.id,
      cb.document_id,
      cb.source_snapshot_id,
      cb.block_type,
      cb.sequence_no,
      cb.text_content,
      cb.structured_content_json,
      cb.locator_json,
      ts_rank(cb.search_vector, websearch_to_tsquery('english', ${trimmed})) as rank
    from content_blocks cb
    join documents d on d.id = cb.document_id
    join sources s on s.id = d.source_id
    where s.project_id = ${projectId}
      and s.status = 'ready'
      and cb.search_vector @@ websearch_to_tsquery('english', ${trimmed})
    order by rank desc, cb.sequence_no asc
    limit ${limit}
  `;
  return rows.map((row) => ({
    ...parseBlock(row),
    rank: Number(row.rank),
  }));
}

export async function listReadyContentBlocksByProjectId(
  sql: Sql,
  projectId: ProjectId,
  limit = 20,
): Promise<ContentBlock[]> {
  const rows = await sql<ContentBlockRow[]>`
    select
      cb.id,
      cb.document_id,
      cb.source_snapshot_id,
      cb.block_type,
      cb.sequence_no,
      cb.text_content,
      cb.structured_content_json,
      cb.locator_json
    from content_blocks cb
    join documents d on d.id = cb.document_id
    join sources s on s.id = d.source_id
    where s.project_id = ${projectId}
      and s.status = 'ready'
    order by s.created_at desc, cb.sequence_no asc
    limit ${limit}
  `;
  return rows.map(parseBlock);
}

export async function listContentBlocksBySourceId(
  sql: Sql,
  sourceId: SourceId,
): Promise<ContentBlock[]> {
  const rows = await sql<ContentBlockRow[]>`
    select
      cb.id,
      cb.document_id,
      cb.source_snapshot_id,
      cb.block_type,
      cb.sequence_no,
      cb.text_content,
      cb.structured_content_json,
      cb.locator_json
    from content_blocks cb
    join documents d on d.id = cb.document_id
    where d.source_id = ${sourceId}
    order by cb.sequence_no asc
  `;
  return rows.map(parseBlock);
}
