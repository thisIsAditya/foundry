import {
  ProjectIdSchema,
  SprintContractSchema,
  SprintIdSchema,
  SprintSchema,
  SprintStatusSchema,
  type ProjectId,
  type Sprint,
  type SprintContract,
  type SprintId,
  type SprintStatus,
} from '@foundry/domain';
import { z } from 'zod';

import type { Sql } from '../client.js';
import { jsonParam } from '../json.js';
import { requireRow } from '../require-row.js';

const SprintRowSchema = z.object({
  id: SprintIdSchema,
  project_id: ProjectIdSchema,
  status: SprintStatusSchema,
  contract_json: z.unknown(),
  budget_reserved_usd: z.string(),
  budget_used_usd: z.string(),
  closed_reason: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

type SprintRow = z.infer<typeof SprintRowSchema>;

export type InsertSprint = {
  id?: SprintId;
  projectId: ProjectId;
  status?: SprintStatus;
  contract: SprintContract;
  budgetReservedUsd?: string;
  budgetUsedUsd?: string;
};

export function toSprint(row: SprintRow): Sprint {
  return SprintSchema.parse({
    id: row.id,
    projectId: row.project_id,
    status: row.status,
    contract: SprintContractSchema.parse(row.contract_json),
    budgetReservedUsd: row.budget_reserved_usd,
    budgetUsedUsd: row.budget_used_usd,
    closedReason: row.closed_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function parseSprint(row: SprintRow): Sprint {
  return toSprint(SprintRowSchema.parse(row));
}

export async function insertSprint(sql: Sql, input: InsertSprint): Promise<Sprint> {
  const id = input.id;
  const rows =
    id === undefined
      ? await sql<SprintRow[]>`
          insert into sprints (
            project_id, status, contract_json, budget_reserved_usd, budget_used_usd
          )
          values (
            ${input.projectId},
            ${input.status ?? 'draft'},
            ${jsonParam(sql, input.contract)},
            ${input.budgetReservedUsd ?? '0'},
            ${input.budgetUsedUsd ?? '0'}
          )
          returning *
        `
      : await sql<SprintRow[]>`
          insert into sprints (
            id, project_id, status, contract_json, budget_reserved_usd, budget_used_usd
          )
          values (
            ${id},
            ${input.projectId},
            ${input.status ?? 'draft'},
            ${jsonParam(sql, input.contract)},
            ${input.budgetReservedUsd ?? '0'},
            ${input.budgetUsedUsd ?? '0'}
          )
          returning *
        `;
  return parseSprint(requireRow(rows, 'insertSprint'));
}

export async function getSprintById(sql: Sql, id: SprintId): Promise<Sprint | null> {
  const rows = await sql<SprintRow[]>`
    select * from sprints where id = ${id}
  `;
  const row = rows[0];
  return row === undefined ? null : parseSprint(row);
}

export async function listSprintsByProjectId(sql: Sql, projectId: ProjectId): Promise<Sprint[]> {
  const rows = await sql<SprintRow[]>`
    select * from sprints where project_id = ${projectId} order by created_at desc
  `;
  return rows.map(parseSprint);
}

export async function updateSprintStatus(
  sql: Sql,
  id: SprintId,
  status: SprintStatus,
  closedReason: string | null = null,
): Promise<Sprint> {
  const rows = await sql<SprintRow[]>`
    update sprints
    set status = ${status},
        closed_reason = ${closedReason},
        updated_at = now()
    where id = ${id}
    returning *
  `;
  return parseSprint(requireRow(rows, 'updateSprintStatus'));
}

export async function updateSprintContract(
  sql: Sql,
  id: SprintId,
  contract: SprintContract,
  status: SprintStatus,
): Promise<Sprint> {
  const rows = await sql<SprintRow[]>`
    update sprints
    set contract_json = ${jsonParam(sql, contract)},
        status = ${status},
        updated_at = now()
    where id = ${id}
    returning *
  `;
  return parseSprint(requireRow(rows, 'updateSprintContract'));
}
