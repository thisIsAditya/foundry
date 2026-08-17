import {
  ConversationMessageIdSchema,
  ConversationSummaryIdSchema,
  ConversationSummarySchema,
  ProjectIdSchema,
  type ConversationSummary,
  type ProjectId,
} from '@foundry/domain';
import { z } from 'zod';

import type { Sql } from '../client.js';
import { requireRow } from '../require-row.js';

const ConversationSummaryRowSchema = z.object({
  id: ConversationSummaryIdSchema,
  project_id: ProjectIdSchema,
  summary_text: z.string(),
  covered_through_message_id: ConversationMessageIdSchema,
  token_count: z.number().int(),
  created_at: z.coerce.date(),
});

type ConversationSummaryRow = z.infer<typeof ConversationSummaryRowSchema>;

export type InsertConversationSummary = {
  projectId: ProjectId;
  summaryText: string;
  coveredThroughMessageId: z.infer<typeof ConversationMessageIdSchema>;
  tokenCount: number;
};

export function toConversationSummary(row: ConversationSummaryRow): ConversationSummary {
  return ConversationSummarySchema.parse({
    id: row.id,
    projectId: row.project_id,
    summaryText: row.summary_text,
    coveredThroughMessageId: row.covered_through_message_id,
    tokenCount: row.token_count,
    createdAt: row.created_at,
  });
}

function parseConversationSummary(row: ConversationSummaryRow): ConversationSummary {
  return toConversationSummary(ConversationSummaryRowSchema.parse(row));
}

export async function insertConversationSummary(
  sql: Sql,
  input: InsertConversationSummary,
): Promise<ConversationSummary> {
  const rows = await sql<ConversationSummaryRow[]>`
    insert into conversation_summaries (
      project_id,
      summary_text,
      covered_through_message_id,
      token_count
    )
    values (
      ${input.projectId},
      ${input.summaryText},
      ${input.coveredThroughMessageId},
      ${input.tokenCount}
    )
    returning *
  `;
  return parseConversationSummary(requireRow(rows, 'insertConversationSummary'));
}

export async function listConversationSummariesByProjectId(
  sql: Sql,
  projectId: ProjectId,
): Promise<ConversationSummary[]> {
  const rows = await sql<ConversationSummaryRow[]>`
    select * from conversation_summaries
    where project_id = ${projectId}
    order by created_at desc
  `;
  return rows.map(parseConversationSummary);
}

export async function getLatestConversationSummaryByProjectId(
  sql: Sql,
  projectId: ProjectId,
): Promise<ConversationSummary | null> {
  const rows = await sql<ConversationSummaryRow[]>`
    select * from conversation_summaries
    where project_id = ${projectId}
    order by created_at desc
    limit 1
  `;
  const row = rows[0];
  return row === undefined ? null : parseConversationSummary(row);
}
