import {
  ProjectSchema,
  type FounderObjective,
  type JourneyPhase,
  type Project,
  type ProjectId,
  type WorkspaceId,
} from '@foundry/domain';

import type { Sql } from '../client.js';
import { requireRow } from '../require-row.js';

type ProjectRow = {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  geography: string | null;
  jurisdiction: string | null;
  business_category: string | null;
  founder_objective: string;
  current_phase: string;
  current_pack_revision_id: string | null;
  archived_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

export type InsertProject = {
  workspaceId: WorkspaceId;
  name: string;
  description?: string | null;
  geography?: string | null;
  jurisdiction?: string | null;
  businessCategory?: string | null;
  founderObjective?: FounderObjective;
  currentPhase?: JourneyPhase;
  currentPackRevisionId?: Project['currentPackRevisionId'];
};

export function toProject(row: ProjectRow): Project {
  return ProjectSchema.parse({
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    description: row.description,
    geography: row.geography,
    jurisdiction: row.jurisdiction,
    businessCategory: row.business_category,
    founderObjective: row.founder_objective,
    currentPhase: row.current_phase,
    currentPackRevisionId: row.current_pack_revision_id,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

export async function insertProject(sql: Sql, input: InsertProject): Promise<Project> {
  const rows = await sql<ProjectRow[]>`
    insert into projects (
      workspace_id,
      name,
      description,
      geography,
      jurisdiction,
      business_category,
      founder_objective,
      current_phase
    )
    values (
      ${input.workspaceId},
      ${input.name},
      ${input.description ?? null},
      ${input.geography ?? null},
      ${input.jurisdiction ?? null},
      ${input.businessCategory ?? null},
      ${input.founderObjective ?? 'undecided'},
      ${input.currentPhase ?? 'diagnose'}
    )
    returning *
  `;
  return toProject(requireRow(rows, 'insertProject'));
}

export async function getProjectById(sql: Sql, id: ProjectId): Promise<Project | null> {
  const rows = await sql<ProjectRow[]>`
    select * from projects where id = ${id}
  `;
  const row = rows[0];
  return row === undefined ? null : toProject(row);
}

export async function listProjects(sql: Sql): Promise<Project[]> {
  const rows = await sql<ProjectRow[]>`
    select * from projects order by created_at asc
  `;
  return rows.map(toProject);
}

export async function listProjectsByWorkspaceId(
  sql: Sql,
  workspaceId: WorkspaceId,
): Promise<Project[]> {
  const rows = await sql<ProjectRow[]>`
    select * from projects
    where workspace_id = ${workspaceId}
      and archived_at is null
    order by created_at asc
  `;
  return rows.map(toProject);
}

export async function updateProjectCurrentPackRevision(
  sql: Sql,
  id: ProjectId,
  packRevisionId: Project['currentPackRevisionId'],
): Promise<Project> {
  const rows = await sql<ProjectRow[]>`
    update projects
    set current_pack_revision_id = ${packRevisionId},
        updated_at = now()
    where id = ${id}
    returning *
  `;
  return toProject(requireRow(rows, 'updateProjectCurrentPackRevision'));
}

export async function updateProjectCurrentPhase(
  sql: Sql,
  id: ProjectId,
  currentPhase: JourneyPhase,
): Promise<Project> {
  const rows = await sql<ProjectRow[]>`
    update projects
    set current_phase = ${currentPhase},
        updated_at = now()
    where id = ${id}
    returning *
  `;
  return toProject(requireRow(rows, 'updateProjectCurrentPhase'));
}
