import {
  PackRevisionIdSchema,
  ProblemIdSchema,
  ProblemSchema,
  type PackRevisionId,
  type Problem,
} from '@foundry/domain';
import { z } from 'zod';

import type { Sql } from '../client.js';
import { requireRow } from '../require-row.js';

const ProblemRowSchema = z.object({
  id: ProblemIdSchema,
  pack_revision_id: PackRevisionIdSchema,
  statement: z.string(),
  created_at: z.coerce.date(),
});

type ProblemRow = z.infer<typeof ProblemRowSchema>;

export type InsertProblem = {
  packRevisionId: PackRevisionId;
  statement: string;
};

export function toProblem(row: ProblemRow): Problem {
  return ProblemSchema.parse({
    id: row.id,
    packRevisionId: row.pack_revision_id,
    statement: row.statement,
    createdAt: row.created_at,
  });
}

function parseProblem(row: ProblemRow): Problem {
  return toProblem(ProblemRowSchema.parse(row));
}

export async function insertProblem(sql: Sql, input: InsertProblem): Promise<Problem> {
  const rows = await sql<ProblemRow[]>`
    insert into problems (pack_revision_id, statement)
    values (${input.packRevisionId}, ${input.statement})
    returning *
  `;
  return parseProblem(requireRow(rows, 'insertProblem'));
}

export async function listProblemsByPackRevisionId(
  sql: Sql,
  packRevisionId: PackRevisionId,
): Promise<Problem[]> {
  const rows = await sql<ProblemRow[]>`
    select * from problems where pack_revision_id = ${packRevisionId} order by created_at asc
  `;
  return rows.map(parseProblem);
}
