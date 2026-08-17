import {
  ConversationMessageIdSchema,
  FounderPreferenceIdSchema,
  FounderPreferenceSchema,
  FounderPreferenceScopeSchema,
  ProjectIdSchema,
  WorkspaceIdSchema,
  ConfidenceSchema,
  type FounderPreference,
  type FounderPreferenceScope,
  type ProjectId,
  type WorkspaceId,
} from '@foundry/domain';
import { z } from 'zod';

import type { Sql } from '../client.js';
import { jsonParam } from '../json.js';
import { requireRow } from '../require-row.js';

const FounderPreferenceRowSchema = z.object({
  id: FounderPreferenceIdSchema,
  workspace_id: WorkspaceIdSchema.nullable(),
  project_id: ProjectIdSchema.nullable(),
  key: z.string(),
  value: z.unknown(),
  source_message_id: ConversationMessageIdSchema.nullable(),
  confidence_json: z.unknown(),
  founder_confirmed: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

type FounderPreferenceRow = z.infer<typeof FounderPreferenceRowSchema>;

export type InsertFounderPreference = {
  scope: FounderPreferenceScope;
  key: string;
  value: unknown;
  sourceMessageId?: z.infer<typeof ConversationMessageIdSchema> | null;
  confidence: z.infer<typeof ConfidenceSchema>;
  founderConfirmed?: boolean;
};

function rowScope(row: FounderPreferenceRow): FounderPreferenceScope {
  if (row.project_id !== null) {
    return FounderPreferenceScopeSchema.parse({ type: 'project', projectId: row.project_id });
  }
  if (row.workspace_id !== null) {
    return FounderPreferenceScopeSchema.parse({ type: 'workspace', workspaceId: row.workspace_id });
  }
  throw new Error('founder preference row missing scope');
}

export function toFounderPreference(row: FounderPreferenceRow): FounderPreference {
  return FounderPreferenceSchema.parse({
    id: row.id,
    scope: rowScope(row),
    key: row.key,
    value: row.value,
    sourceMessageId: row.source_message_id,
    confidence: ConfidenceSchema.parse(row.confidence_json),
    founderConfirmed: row.founder_confirmed,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function parseFounderPreference(row: FounderPreferenceRow): FounderPreference {
  return toFounderPreference(FounderPreferenceRowSchema.parse(row));
}

export async function upsertFounderPreference(
  sql: Sql,
  input: InsertFounderPreference,
): Promise<FounderPreference> {
  const workspaceId = input.scope.type === 'workspace' ? input.scope.workspaceId : null;
  const projectId = input.scope.type === 'project' ? input.scope.projectId : null;
  const rows = await sql<FounderPreferenceRow[]>`
    insert into founder_preferences (
      workspace_id,
      project_id,
      key,
      value,
      source_message_id,
      confidence_json,
      founder_confirmed
    )
    values (
      ${workspaceId},
      ${projectId},
      ${input.key},
      ${jsonParam(sql, input.value)},
      ${input.sourceMessageId ?? null},
      ${jsonParam(sql, input.confidence)},
      ${input.founderConfirmed ?? false}
    )
    on conflict ((coalesce(project_id::text, workspace_id::text)), key)
    do update set
      value = excluded.value,
      source_message_id = excluded.source_message_id,
      confidence_json = excluded.confidence_json,
      founder_confirmed = excluded.founder_confirmed,
      updated_at = now()
    returning *
  `;
  return parseFounderPreference(requireRow(rows, 'upsertFounderPreference'));
}

export async function listFounderPreferencesByProjectId(
  sql: Sql,
  projectId: ProjectId,
): Promise<FounderPreference[]> {
  const rows = await sql<FounderPreferenceRow[]>`
    select * from founder_preferences where project_id = ${projectId} order by key asc
  `;
  return rows.map(parseFounderPreference);
}

export async function getFounderPreferenceById(
  sql: Sql,
  id: z.infer<typeof FounderPreferenceIdSchema>,
): Promise<FounderPreference | null> {
  const rows = await sql<FounderPreferenceRow[]>`
    select * from founder_preferences where id = ${id}
  `;
  const row = rows[0];
  return row === undefined ? null : parseFounderPreference(row);
}

export async function confirmFounderPreference(
  sql: Sql,
  id: z.infer<typeof FounderPreferenceIdSchema>,
): Promise<FounderPreference> {
  const rows = await sql<FounderPreferenceRow[]>`
    update founder_preferences
    set founder_confirmed = true,
        updated_at = now()
    where id = ${id}
    returning *
  `;
  return parseFounderPreference(requireRow(rows, 'confirmFounderPreference'));
}

export async function correctFounderPreference(
  sql: Sql,
  id: z.infer<typeof FounderPreferenceIdSchema>,
  value: unknown,
): Promise<FounderPreference> {
  const rows = await sql<FounderPreferenceRow[]>`
    update founder_preferences
    set value = ${jsonParam(sql, value)},
        founder_confirmed = true,
        updated_at = now()
    where id = ${id}
    returning *
  `;
  return parseFounderPreference(requireRow(rows, 'correctFounderPreference'));
}

export async function listFounderPreferencesByWorkspaceId(
  sql: Sql,
  workspaceId: WorkspaceId,
): Promise<FounderPreference[]> {
  const rows = await sql<FounderPreferenceRow[]>`
    select * from founder_preferences where workspace_id = ${workspaceId} order by key asc
  `;
  return rows.map(parseFounderPreference);
}
