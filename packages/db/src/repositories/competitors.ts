import {
  CompetitorIdSchema,
  CompetitorSchema,
  ProjectIdSchema,
  SourceIdSchema,
  type Competitor,
  type ProjectId,
} from '@foundry/domain';
import { z } from 'zod';

import { parseUuidArray } from '../arrays.js';
import type { Sql } from '../client.js';
import { requireRow } from '../require-row.js';

const CompetitorRowSchema = z.object({
  id: CompetitorIdSchema,
  project_id: ProjectIdSchema,
  name: z.string(),
  source_ids: z.unknown(),
  created_at: z.coerce.date(),
});

type CompetitorRow = z.infer<typeof CompetitorRowSchema>;

export type InsertCompetitor = {
  projectId: ProjectId;
  name: string;
  sourceIds?: z.infer<typeof SourceIdSchema>[];
};

export function toCompetitor(row: CompetitorRow): Competitor {
  return CompetitorSchema.parse({
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    sourceIds: parseUuidArray(row.source_ids),
    createdAt: row.created_at,
  });
}

function parseCompetitor(row: CompetitorRow): Competitor {
  return toCompetitor(CompetitorRowSchema.parse(row));
}

export async function insertCompetitor(sql: Sql, input: InsertCompetitor): Promise<Competitor> {
  const rows = await sql<CompetitorRow[]>`
    insert into competitors (project_id, name, source_ids)
    values (${input.projectId}, ${input.name}, ${input.sourceIds ?? []})
    returning *
  `;
  return parseCompetitor(requireRow(rows, 'insertCompetitor'));
}

export async function listCompetitorsByProjectId(
  sql: Sql,
  projectId: ProjectId,
): Promise<Competitor[]> {
  const rows = await sql<CompetitorRow[]>`
    select * from competitors where project_id = ${projectId} order by created_at desc
  `;
  return rows.map(parseCompetitor);
}
