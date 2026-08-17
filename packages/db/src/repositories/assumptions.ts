import {
  AssumptionIdSchema,
  AssumptionSchema,
  AssumptionStatusSchema,
  ProjectIdSchema,
  type Assumption,
  type AssumptionStatus,
  type ProjectId,
} from '@foundry/domain';
import { z } from 'zod';

import type { Sql } from '../client.js';
import { requireRow } from '../require-row.js';

const AssumptionRowSchema = z.object({
  id: AssumptionIdSchema,
  project_id: ProjectIdSchema,
  statement: z.string(),
  status: AssumptionStatusSchema,
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

type AssumptionRow = z.infer<typeof AssumptionRowSchema>;

export type InsertAssumption = {
  projectId: ProjectId;
  statement: string;
  status?: AssumptionStatus;
};

export function toAssumption(row: AssumptionRow): Assumption {
  return AssumptionSchema.parse({
    id: row.id,
    projectId: row.project_id,
    statement: row.statement,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function parseAssumption(row: AssumptionRow): Assumption {
  return toAssumption(AssumptionRowSchema.parse(row));
}

export async function insertAssumption(sql: Sql, input: InsertAssumption): Promise<Assumption> {
  const rows = await sql<AssumptionRow[]>`
    insert into assumptions (project_id, statement, status)
    values (${input.projectId}, ${input.statement}, ${input.status ?? 'untested'})
    returning *
  `;
  return parseAssumption(requireRow(rows, 'insertAssumption'));
}

export async function listAssumptionsByProjectId(
  sql: Sql,
  projectId: ProjectId,
): Promise<Assumption[]> {
  const rows = await sql<AssumptionRow[]>`
    select * from assumptions where project_id = ${projectId} order by created_at desc
  `;
  return rows.map(parseAssumption);
}

export async function updateAssumptionStatus(
  sql: Sql,
  id: z.infer<typeof AssumptionIdSchema>,
  status: AssumptionStatus,
): Promise<Assumption> {
  const rows = await sql<AssumptionRow[]>`
    update assumptions set status = ${status}, updated_at = now() where id = ${id} returning *
  `;
  return parseAssumption(requireRow(rows, 'updateAssumptionStatus'));
}
