import {
  WorkspaceSchema,
  type UserId,
  type Workspace,
  type WorkspaceId,
  type WorkspacePlan,
  type WorkspaceStatus,
} from '@foundry/domain';

import type { Sql } from '../client.js';
import { requireRow } from '../require-row.js';

type WorkspaceRow = {
  id: string;
  name: string;
  owner_user_id: string;
  plan: string;
  default_provider_policy: Record<string, unknown>;
  default_retention_policy: Record<string, unknown>;
  locale: string;
  timezone: string;
  status: string;
  created_at: Date;
  updated_at: Date;
};

export type InsertWorkspace = {
  name: string;
  ownerUserId: UserId;
  plan?: WorkspacePlan;
  defaultProviderPolicy?: Record<string, unknown>;
  defaultRetentionPolicy?: Record<string, unknown>;
  locale?: string;
  timezone?: string;
  status?: WorkspaceStatus;
};

export function toWorkspace(row: WorkspaceRow): Workspace {
  return WorkspaceSchema.parse({
    id: row.id,
    name: row.name,
    ownerUserId: row.owner_user_id,
    plan: row.plan,
    defaultProviderPolicy: row.default_provider_policy,
    defaultRetentionPolicy: row.default_retention_policy,
    locale: row.locale,
    timezone: row.timezone,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

export async function insertWorkspace(sql: Sql, input: InsertWorkspace): Promise<Workspace> {
  const rows = await sql<WorkspaceRow[]>`
    insert into workspaces (
      name,
      owner_user_id,
      plan,
      default_provider_policy,
      default_retention_policy,
      locale,
      timezone,
      status
    )
    values (
      ${input.name},
      ${input.ownerUserId},
      ${input.plan ?? 'free'},
      ${sql.json(JSON.parse(JSON.stringify(input.defaultProviderPolicy ?? {})))},
      ${sql.json(JSON.parse(JSON.stringify(input.defaultRetentionPolicy ?? {})))},
      ${input.locale ?? 'en-IN'},
      ${input.timezone ?? 'UTC'},
      ${input.status ?? 'active'}
    )
    returning *
  `;
  return toWorkspace(requireRow(rows, 'insertWorkspace'));
}

export async function getWorkspaceById(sql: Sql, id: WorkspaceId): Promise<Workspace | null> {
  const rows = await sql<WorkspaceRow[]>`
    select * from workspaces where id = ${id}
  `;
  const row = rows[0];
  return row === undefined ? null : toWorkspace(row);
}

export async function listWorkspaces(sql: Sql): Promise<Workspace[]> {
  const rows = await sql<WorkspaceRow[]>`
    select * from workspaces order by created_at asc
  `;
  return rows.map(toWorkspace);
}

export async function listWorkspacesByIds(
  sql: Sql,
  ids: readonly WorkspaceId[],
): Promise<Workspace[]> {
  if (ids.length === 0) {
    return [];
  }
  const rows = await sql<WorkspaceRow[]>`
    select * from workspaces where id in ${sql(ids)} order by created_at asc
  `;
  return rows.map(toWorkspace);
}
