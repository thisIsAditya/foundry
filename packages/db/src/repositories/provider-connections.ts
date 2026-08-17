import {
  DataClassificationSchema,
  ProviderAuthModeSchema,
  ProviderConnectionIdSchema,
  ProviderConnectionSchema,
  ProviderFamilySchema,
  ProviderHealthStatusSchema,
  UserIdSchema,
  WorkspaceIdSchema,
  type DataClassification,
  type ProviderAuthMode,
  type ProviderConnection,
  type ProviderConnectionId,
  type ProviderFamily,
  type ProviderHealthStatus,
  type UserId,
  type WorkspaceId,
} from '@foundry/domain';
import { z } from 'zod';

import type { Sql } from '../client.js';
import { jsonParam } from '../json.js';
import { requireRow } from '../require-row.js';

const ProviderConnectionRowSchema = z.object({
  id: ProviderConnectionIdSchema,
  workspace_id: WorkspaceIdSchema.nullable(),
  user_id: UserIdSchema.nullable(),
  provider_family: ProviderFamilySchema,
  auth_mode: ProviderAuthModeSchema,
  credential_ref_encrypted: z.string().nullable(),
  endpoint_or_region: z.string().nullable(),
  allowed_models: z.unknown().nullable(),
  allowed_data_classifications: z.array(DataClassificationSchema).nullable(),
  fallback_policy_json: z.unknown().nullable(),
  spend_limit_usd: z.string().nullable(),
  health_status: ProviderHealthStatusSchema,
  last_validated_at: z.coerce.date().nullable(),
  created_at: z.coerce.date(),
});

type ProviderConnectionRow = z.infer<typeof ProviderConnectionRowSchema>;

export type InsertProviderConnection = {
  workspaceId?: WorkspaceId | null;
  userId?: UserId | null;
  providerFamily: ProviderFamily;
  authMode: ProviderAuthMode;
  credentialRefEncrypted?: string | null;
  endpointOrRegion?: string | null;
  allowedModels?: unknown;
  allowedDataClassifications?: DataClassification[] | null;
  fallbackPolicy?: unknown;
  spendLimitUsd?: string | null;
  healthStatus?: ProviderHealthStatus;
  lastValidatedAt?: Date | null;
};

export function toProviderConnection(row: ProviderConnectionRow): ProviderConnection {
  return ProviderConnectionSchema.parse({
    id: row.id,
    workspaceId: row.workspace_id,
    userId: row.user_id,
    providerFamily: row.provider_family,
    authMode: row.auth_mode,
    credentialRefEncrypted: row.credential_ref_encrypted,
    endpointOrRegion: row.endpoint_or_region,
    allowedModels: row.allowed_models,
    allowedDataClassifications: row.allowed_data_classifications,
    fallbackPolicy: row.fallback_policy_json,
    spendLimitUsd: row.spend_limit_usd,
    healthStatus: row.health_status,
    lastValidatedAt: row.last_validated_at,
    createdAt: row.created_at,
  });
}

function parseProviderConnection(row: ProviderConnectionRow): ProviderConnection {
  return toProviderConnection(ProviderConnectionRowSchema.parse(row));
}

export async function insertProviderConnection(
  sql: Sql,
  input: InsertProviderConnection,
): Promise<ProviderConnection> {
  const rows = await sql<ProviderConnectionRow[]>`
    insert into provider_connections (
      workspace_id,
      user_id,
      provider_family,
      auth_mode,
      credential_ref_encrypted,
      endpoint_or_region,
      allowed_models,
      allowed_data_classifications,
      fallback_policy_json,
      spend_limit_usd,
      health_status,
      last_validated_at
    )
    values (
      ${input.workspaceId ?? null},
      ${input.userId ?? null},
      ${input.providerFamily},
      ${input.authMode},
      ${input.credentialRefEncrypted ?? null},
      ${input.endpointOrRegion ?? null},
      ${input.allowedModels === undefined ? null : jsonParam(sql, input.allowedModels)},
      ${input.allowedDataClassifications === undefined || input.allowedDataClassifications === null ? null : jsonParam(sql, input.allowedDataClassifications)},
      ${input.fallbackPolicy === undefined ? null : jsonParam(sql, input.fallbackPolicy)},
      ${input.spendLimitUsd ?? null},
      ${input.healthStatus ?? 'unknown'},
      ${input.lastValidatedAt ?? null}
    )
    returning *
  `;
  return parseProviderConnection(requireRow(rows, 'insertProviderConnection'));
}

export async function listProviderConnectionsByWorkspaceId(
  sql: Sql,
  workspaceId: WorkspaceId,
): Promise<ProviderConnection[]> {
  const rows = await sql<ProviderConnectionRow[]>`
    select * from provider_connections
    where workspace_id = ${workspaceId}
    order by created_at desc
  `;
  return rows.map(parseProviderConnection);
}

export async function getProviderConnectionById(
  sql: Sql,
  id: ProviderConnectionId,
): Promise<ProviderConnection | null> {
  const rows = await sql<ProviderConnectionRow[]>`
    select * from provider_connections where id = ${id}
  `;
  const row = rows[0];
  return row === undefined ? null : parseProviderConnection(row);
}
