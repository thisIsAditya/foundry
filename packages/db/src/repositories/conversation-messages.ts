import {
  ConversationBlockSchema,
  ConversationMessageIdSchema,
  ConversationMessageSchema,
  ConversationReferenceSchema,
  ConversationActorSchema,
  ConversationVisibilitySchema,
  ProjectIdSchema,
  UserIdSchema,
  type ConversationBlock,
  type ConversationMessage,
  type ConversationReference,
  type ProjectId,
  type UserId,
} from '@foundry/domain';
import { z } from 'zod';

import type { Sql } from '../client.js';
import { jsonParam } from '../json.js';
import { requireRow } from '../require-row.js';

const ConversationMessageRowSchema = z.object({
  id: ConversationMessageIdSchema,
  project_id: ProjectIdSchema,
  actor: ConversationActorSchema,
  actor_user_id: UserIdSchema.nullable(),
  text_content: z.string(),
  blocks: z.unknown(),
  references_json: z.unknown(),
  visibility: ConversationVisibilitySchema,
  created_at: z.coerce.date(),
});

type ConversationMessageRow = z.infer<typeof ConversationMessageRowSchema>;

export type InsertConversationMessage = {
  projectId: ProjectId;
  actor: z.infer<typeof ConversationActorSchema>;
  actorUserId?: UserId | null;
  text: string;
  blocks?: ConversationBlock[];
  references?: ConversationReference[];
  visibility?: z.infer<typeof ConversationVisibilitySchema>;
};

export function toConversationMessage(row: ConversationMessageRow): ConversationMessage {
  return ConversationMessageSchema.parse({
    id: row.id,
    projectId: row.project_id,
    actor: row.actor,
    actorUserId: row.actor_user_id,
    text: row.text_content,
    blocks: z.array(ConversationBlockSchema).parse(row.blocks),
    references: z.array(ConversationReferenceSchema).parse(row.references_json),
    visibility: row.visibility,
    createdAt: row.created_at,
  });
}

function parseConversationMessage(row: ConversationMessageRow): ConversationMessage {
  return toConversationMessage(ConversationMessageRowSchema.parse(row));
}

export async function insertConversationMessage(
  sql: Sql,
  input: InsertConversationMessage,
): Promise<ConversationMessage> {
  const rows = await sql<ConversationMessageRow[]>`
    insert into conversation_messages (
      project_id,
      actor,
      actor_user_id,
      text_content,
      blocks,
      references_json,
      visibility
    )
    values (
      ${input.projectId},
      ${input.actor},
      ${input.actorUserId ?? null},
      ${input.text},
      ${jsonParam(sql, input.blocks ?? [])},
      ${jsonParam(sql, input.references ?? [])},
      ${input.visibility ?? 'founder_visible'}
    )
    returning *
  `;
  return parseConversationMessage(requireRow(rows, 'insertConversationMessage'));
}

export async function listConversationMessagesByProjectId(
  sql: Sql,
  projectId: ProjectId,
): Promise<ConversationMessage[]> {
  const rows = await sql<ConversationMessageRow[]>`
    select * from conversation_messages
    where project_id = ${projectId}
    order by created_at asc
  `;
  return rows.map(parseConversationMessage);
}

export async function getConversationMessageById(
  sql: Sql,
  id: z.infer<typeof ConversationMessageIdSchema>,
): Promise<ConversationMessage | null> {
  const rows = await sql<ConversationMessageRow[]>`
    select * from conversation_messages where id = ${id}
  `;
  const row = rows[0];
  return row === undefined ? null : parseConversationMessage(row);
}

export async function listConversationMessagesPage(
  sql: Sql,
  projectId: ProjectId,
  options: { cursor?: z.infer<typeof ConversationMessageIdSchema>; limit: number },
): Promise<ConversationMessage[]> {
  const limit = options.limit;
  if (options.cursor === undefined) {
    const rows = await sql<ConversationMessageRow[]>`
      select * from conversation_messages
      where project_id = ${projectId}
      order by created_at desc, id desc
      limit ${limit}
    `;
    return rows.map(parseConversationMessage);
  }
  const cursor = await getConversationMessageById(sql, options.cursor);
  if (cursor === null) {
    return [];
  }
  const rows = await sql<ConversationMessageRow[]>`
    select * from conversation_messages
    where project_id = ${projectId}
      and (created_at, id) < (${cursor.createdAt}, ${cursor.id})
    order by created_at desc, id desc
    limit ${limit}
  `;
  return rows.map(parseConversationMessage);
}
