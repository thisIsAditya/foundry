import {
  IntegrationConnectionIdSchema,
  IntegrationConnectionSchema,
  IntegrationProviderSchema,
  WorkspaceIdSchema,
  type IntegrationConnection,
  type IntegrationProvider,
  type WorkspaceId,
} from '@foundry/domain';
import { z } from 'zod';

import type { Sql } from '../client.js';
import { jsonParam } from '../json.js';
import { requireRow } from '../require-row.js';

const IntegrationConnectionRowSchema = z.object({
  id: IntegrationConnectionIdSchema,
  workspace_id: WorkspaceIdSchema,
  provider: IntegrationProviderSchema,
  auth_ref_encrypted: z.string(),
  scope_json: z.unknown().nullable(),
  revoked_at: z.coerce.date().nullable(),
  created_at: z.coerce.date(),
});

type IntegrationConnectionRow = z.infer<typeof IntegrationConnectionRowSchema>;

export type InsertIntegrationConnection = {
  workspaceId: WorkspaceId;
  provider: IntegrationProvider;
  authRefEncrypted: string;
  scope?: unknown;
};

export function toIntegrationConnection(row: IntegrationConnectionRow): IntegrationConnection {
  return IntegrationConnectionSchema.parse({
    id: row.id,
    workspaceId: row.workspace_id,
    provider: row.provider,
    authRefEncrypted: row.auth_ref_encrypted,
    scope: row.scope_json,
    revokedAt: row.revoked_at,
    createdAt: row.created_at,
  });
}

function parseIntegration(row: IntegrationConnectionRow): IntegrationConnection {
  return toIntegrationConnection(IntegrationConnectionRowSchema.parse(row));
}

export async function insertIntegrationConnection(
  sql: Sql,
  input: InsertIntegrationConnection,
): Promise<IntegrationConnection> {
  const rows = await sql<IntegrationConnectionRow[]>`
    insert into integration_connections (workspace_id, provider, auth_ref_encrypted, scope_json)
    values (
      ${input.workspaceId},
      ${input.provider},
      ${input.authRefEncrypted},
      ${jsonParam(sql, input.scope ?? null)}
    )
    returning *
  `;
  return parseIntegration(requireRow(rows, 'insertIntegrationConnection'));
}

export async function listIntegrationConnectionsByWorkspaceId(
  sql: Sql,
  workspaceId: WorkspaceId,
): Promise<IntegrationConnection[]> {
  const rows = await sql<IntegrationConnectionRow[]>`
    select * from integration_connections
    where workspace_id = ${workspaceId}
    order by created_at desc
  `;
  return rows.map(parseIntegration);
}

export async function revokeIntegrationConnection(
  sql: Sql,
  id: IntegrationConnection['id'],
): Promise<IntegrationConnection> {
  const rows = await sql<IntegrationConnectionRow[]>`
    update integration_connections
    set revoked_at = now()
    where id = ${id}
    returning *
  `;
  return parseIntegration(requireRow(rows, 'revokeIntegrationConnection'));
}
