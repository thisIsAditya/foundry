import {
  McpHealthStatusSchema,
  McpTransportSchema,
  UserIdSchema,
  UserMcpServerIdSchema,
  UserMcpServerSchema,
  type McpHealthStatus,
  type McpTransport,
  type UserId,
  type UserMcpServer,
  type UserMcpServerId,
} from '@foundry/domain';
import { z } from 'zod';

import type { Sql } from '../client.js';
import { requireRow } from '../require-row.js';

const UserMcpServerRowSchema = z.object({
  id: UserMcpServerIdSchema,
  user_id: UserIdSchema,
  name: z.string(),
  transport: McpTransportSchema,
  url: z.string(),
  headers_encrypted: z.string().nullable(),
  enabled: z.boolean(),
  read_only: z.boolean(),
  health_status: McpHealthStatusSchema,
  last_tool_count: z.number().int().nullable(),
  last_validated_at: z.coerce.date().nullable(),
  created_at: z.coerce.date(),
});

type UserMcpServerRow = z.infer<typeof UserMcpServerRowSchema>;

export type InsertUserMcpServer = {
  userId: UserId;
  name: string;
  transport: McpTransport;
  url: string;
  headersEncrypted?: string | null;
  enabled?: boolean;
  readOnly?: boolean;
  healthStatus?: McpHealthStatus;
  lastToolCount?: number | null;
  lastValidatedAt?: Date | null;
};

export function toUserMcpServer(row: UserMcpServerRow): UserMcpServer {
  return UserMcpServerSchema.parse({
    id: row.id,
    userId: row.user_id,
    name: row.name,
    transport: row.transport,
    url: row.url,
    headersEncrypted: row.headers_encrypted,
    enabled: row.enabled,
    readOnly: row.read_only,
    healthStatus: row.health_status,
    lastToolCount: row.last_tool_count,
    lastValidatedAt: row.last_validated_at,
    createdAt: row.created_at,
  });
}

function parseUserMcpServer(row: UserMcpServerRow): UserMcpServer {
  return toUserMcpServer(UserMcpServerRowSchema.parse(row));
}

export async function insertUserMcpServer(
  sql: Sql,
  input: InsertUserMcpServer,
): Promise<UserMcpServer> {
  const rows = await sql<UserMcpServerRow[]>`
    insert into user_mcp_servers (
      user_id,
      name,
      transport,
      url,
      headers_encrypted,
      enabled,
      read_only,
      health_status,
      last_tool_count,
      last_validated_at
    )
    values (
      ${input.userId},
      ${input.name},
      ${input.transport},
      ${input.url},
      ${input.headersEncrypted ?? null},
      ${input.enabled ?? true},
      ${input.readOnly ?? false},
      ${input.healthStatus ?? 'unknown'},
      ${input.lastToolCount ?? null},
      ${input.lastValidatedAt ?? null}
    )
    returning *
  `;
  return parseUserMcpServer(requireRow(rows, 'insertUserMcpServer'));
}

export async function listUserMcpServersByUserId(
  sql: Sql,
  userId: UserId,
): Promise<UserMcpServer[]> {
  const rows = await sql<UserMcpServerRow[]>`
    select * from user_mcp_servers where user_id = ${userId} order by created_at desc
  `;
  return rows.map(parseUserMcpServer);
}

export async function listEnabledUserMcpServersByUserId(
  sql: Sql,
  userId: UserId,
): Promise<UserMcpServer[]> {
  const rows = await sql<UserMcpServerRow[]>`
    select * from user_mcp_servers
    where user_id = ${userId} and enabled = true
    order by created_at desc
  `;
  return rows.map(parseUserMcpServer);
}

export async function getUserMcpServerById(
  sql: Sql,
  id: UserMcpServerId,
): Promise<UserMcpServer | null> {
  const rows = await sql<UserMcpServerRow[]>`
    select * from user_mcp_servers where id = ${id}
  `;
  const row = rows[0];
  return row === undefined ? null : parseUserMcpServer(row);
}

export async function countUserMcpServers(sql: Sql, userId: UserId): Promise<number> {
  const rows = await sql<{ count: string }[]>`
    select count(*)::text as count from user_mcp_servers where user_id = ${userId}
  `;
  return Number(requireRow(rows, 'countUserMcpServers').count);
}

export async function deleteUserMcpServer(sql: Sql, id: UserMcpServerId): Promise<void> {
  await sql`delete from user_mcp_servers where id = ${id}`;
}

export async function updateUserMcpServerEnabled(
  sql: Sql,
  id: UserMcpServerId,
  enabled: boolean,
): Promise<UserMcpServer> {
  const rows = await sql<UserMcpServerRow[]>`
    update user_mcp_servers set enabled = ${enabled} where id = ${id} returning *
  `;
  return parseUserMcpServer(requireRow(rows, 'updateUserMcpServerEnabled'));
}

export async function updateUserMcpServerReadOnly(
  sql: Sql,
  id: UserMcpServerId,
  readOnly: boolean,
): Promise<UserMcpServer> {
  const rows = await sql<UserMcpServerRow[]>`
    update user_mcp_servers set read_only = ${readOnly} where id = ${id} returning *
  `;
  return parseUserMcpServer(requireRow(rows, 'updateUserMcpServerReadOnly'));
}

export async function updateUserMcpServerHealth(
  sql: Sql,
  id: UserMcpServerId,
  healthStatus: McpHealthStatus,
  lastToolCount: number | null,
): Promise<UserMcpServer> {
  const rows = await sql<UserMcpServerRow[]>`
    update user_mcp_servers
    set health_status = ${healthStatus},
        last_tool_count = ${lastToolCount},
        last_validated_at = now()
    where id = ${id}
    returning *
  `;
  return parseUserMcpServer(requireRow(rows, 'updateUserMcpServerHealth'));
}
