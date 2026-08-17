import {
  InterviewIdSchema,
  QuoteIdSchema,
  QuoteSchema,
  SourceSnapshotIdSchema,
  type InterviewId,
  type Quote,
  type SourceSnapshotId,
} from '@foundry/domain';
import { z } from 'zod';

import type { Sql } from '../client.js';
import { requireRow } from '../require-row.js';

const QuoteRowSchema = z.object({
  id: QuoteIdSchema,
  interview_id: InterviewIdSchema.nullable(),
  source_snapshot_id: SourceSnapshotIdSchema.nullable(),
  text_content: z.string(),
  created_at: z.coerce.date(),
});

type QuoteRow = z.infer<typeof QuoteRowSchema>;

export type InsertQuote = {
  textContent: string;
  interviewId?: InterviewId | null;
  sourceSnapshotId?: SourceSnapshotId | null;
};

export function toQuote(row: QuoteRow): Quote {
  return QuoteSchema.parse({
    id: row.id,
    interviewId: row.interview_id,
    sourceSnapshotId: row.source_snapshot_id,
    textContent: row.text_content,
    createdAt: row.created_at,
  });
}

function parseQuote(row: QuoteRow): Quote {
  return toQuote(QuoteRowSchema.parse(row));
}

export async function insertQuote(sql: Sql, input: InsertQuote): Promise<Quote> {
  const rows = await sql<QuoteRow[]>`
    insert into quotes (interview_id, source_snapshot_id, text_content)
    values (
      ${input.interviewId ?? null},
      ${input.sourceSnapshotId ?? null},
      ${input.textContent}
    )
    returning *
  `;
  return parseQuote(requireRow(rows, 'insertQuote'));
}

export async function listQuotesByInterviewIds(
  sql: Sql,
  interviewIds: readonly InterviewId[],
): Promise<Quote[]> {
  if (interviewIds.length === 0) {
    return [];
  }
  const rows = await sql<QuoteRow[]>`
    select * from quotes
    where interview_id in ${sql(interviewIds)}
    order by created_at asc
  `;
  return rows.map(parseQuote);
}
