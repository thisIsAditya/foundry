import {
  WorkspaceMembershipSchema,
  type UserId,
  type WorkspaceId,
  type WorkspaceMembership,
  type WorkspaceRole,
} from '@foundry/domain';

import type { Sql } from '../client.js';
import { requireRow } from '../require-row.js';

type WorkspaceMembershipRow = {
  id: string;
  workspace_id: string;
  user_id: string;
  role: string;
  invited_by: string | null;
  created_at: Date;
};

export type InsertWorkspaceMembership = {
  workspaceId: WorkspaceId;
  userId: UserId;
  role: WorkspaceRole;
  invitedBy?: UserId | null;
};

export function toWorkspaceMembership(row: WorkspaceMembershipRow): WorkspaceMembership {
  return WorkspaceMembershipSchema.parse({
    id: row.id,
    workspaceId: row.workspace_id,
    userId: row.user_id,
    role: row.role,
    invitedBy: row.invited_by,
    createdAt: row.created_at,
  });
}

export async function insertWorkspaceMembership(
  sql: Sql,
  input: InsertWorkspaceMembership,
): Promise<WorkspaceMembership> {
  const rows = await sql<WorkspaceMembershipRow[]>`
    insert into workspace_memberships (workspace_id, user_id, role, invited_by)
    values (
      ${input.workspaceId},
      ${input.userId},
      ${input.role},
      ${input.invitedBy ?? null}
    )
    returning *
  `;
  return toWorkspaceMembership(requireRow(rows, 'insertWorkspaceMembership'));
}

export async function listWorkspaceMembershipsByUserId(
  sql: Sql,
  userId: UserId,
): Promise<WorkspaceMembership[]> {
  const rows = await sql<WorkspaceMembershipRow[]>`
    select * from workspace_memberships where user_id = ${userId} order by created_at asc
  `;
  return rows.map(toWorkspaceMembership);
}
