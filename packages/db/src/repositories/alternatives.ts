import {
  AlternativeIdSchema,
  AlternativeSchema,
  PackRevisionIdSchema,
  ProblemIdSchema,
  ProjectIdSchema,
  type Alternative,
  type PackRevisionId,
  type ProjectId,
} from '@foundry/domain';
import { z } from 'zod';

import type { Sql } from '../client.js';
import { requireRow } from '../require-row.js';

const AlternativeRowSchema = z.object({
  id: AlternativeIdSchema,
  project_id: ProjectIdSchema,
  pack_revision_id: PackRevisionIdSchema.nullable(),
  problem_id: ProblemIdSchema.nullable(),
  description: z.string(),
  created_at: z.coerce.date(),
});

type AlternativeRow = z.infer<typeof AlternativeRowSchema>;

export type InsertAlternative = {
  projectId: ProjectId;
  description: string;
  packRevisionId?: PackRevisionId | null;
  problemId?: z.infer<typeof ProblemIdSchema> | null;
};

export function toAlternative(row: AlternativeRow): Alternative {
  return AlternativeSchema.parse({
    id: row.id,
    projectId: row.project_id,
    packRevisionId: row.pack_revision_id,
    problemId: row.problem_id,
    description: row.description,
    createdAt: row.created_at,
  });
}

function parseAlternative(row: AlternativeRow): Alternative {
  return toAlternative(AlternativeRowSchema.parse(row));
}

export async function insertAlternative(sql: Sql, input: InsertAlternative): Promise<Alternative> {
  const rows = await sql<AlternativeRow[]>`
    insert into alternatives (project_id, pack_revision_id, problem_id, description)
    values (
      ${input.projectId},
      ${input.packRevisionId ?? null},
      ${input.problemId ?? null},
      ${input.description}
    )
    returning *
  `;
  return parseAlternative(requireRow(rows, 'insertAlternative'));
}

export async function listAlternativesByProjectId(
  sql: Sql,
  projectId: ProjectId,
): Promise<Alternative[]> {
  const rows = await sql<AlternativeRow[]>`
    select * from alternatives where project_id = ${projectId} order by created_at desc
  `;
  return rows.map(parseAlternative);
}

export async function listAlternativesByPackRevisionId(
  sql: Sql,
  packRevisionId: PackRevisionId,
): Promise<Alternative[]> {
  const rows = await sql<AlternativeRow[]>`
    select * from alternatives where pack_revision_id = ${packRevisionId} order by created_at desc
  `;
  return rows.map(parseAlternative);
}
