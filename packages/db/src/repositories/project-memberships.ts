import {
  ProjectMembershipSchema,
  type ProjectId,
  type ProjectMembership,
  type UserId,
  type WorkspaceRole,
} from '@foundry/domain';

import type { Sql } from '../client.js';
import { requireRow } from '../require-row.js';

type ProjectMembershipRow = {
  id: string;
  project_id: string;
  user_id: string;
  role_override: string | null;
  created_at: Date;
};

export type InsertProjectMembership = {
  projectId: ProjectId;
  userId: UserId;
  roleOverride?: WorkspaceRole | null;
};

export function toProjectMembership(row: ProjectMembershipRow): ProjectMembership {
  return ProjectMembershipSchema.parse({
    id: row.id,
    projectId: row.project_id,
    userId: row.user_id,
    roleOverride: row.role_override,
    createdAt: row.created_at,
  });
}

export async function insertProjectMembership(
  sql: Sql,
  input: InsertProjectMembership,
): Promise<ProjectMembership> {
  const rows = await sql<ProjectMembershipRow[]>`
    insert into project_memberships (project_id, user_id, role_override)
    values (${input.projectId}, ${input.userId}, ${input.roleOverride ?? null})
    returning *
  `;
  return toProjectMembership(requireRow(rows, 'insertProjectMembership'));
}
