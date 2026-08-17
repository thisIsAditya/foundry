import {
  ExperimentIdSchema,
  ExperimentSchema,
  ExperimentStatusSchema,
  ProjectIdSchema,
  type Experiment,
  type ExperimentStatus,
  type ProjectId,
} from '@foundry/domain';
import { z } from 'zod';

import type { Sql } from '../client.js';
import { jsonParam } from '../json.js';
import { requireRow } from '../require-row.js';

const ExperimentRowSchema = z.object({
  id: ExperimentIdSchema,
  project_id: ProjectIdSchema,
  hypothesis: z.string(),
  method: z.string(),
  threshold_json: z.unknown(),
  result_json: z.unknown().nullable(),
  status: ExperimentStatusSchema,
  created_at: z.coerce.date(),
});

type ExperimentRow = z.infer<typeof ExperimentRowSchema>;

export type InsertExperiment = {
  projectId: ProjectId;
  hypothesis: string;
  method: string;
  threshold: unknown;
  status?: ExperimentStatus;
};

export function toExperiment(row: ExperimentRow): Experiment {
  return ExperimentSchema.parse({
    id: row.id,
    projectId: row.project_id,
    hypothesis: row.hypothesis,
    method: row.method,
    threshold: row.threshold_json,
    result: row.result_json,
    status: row.status,
    assumptionIds: [],
    createdAt: row.created_at,
  });
}

function parseExperiment(row: ExperimentRow): Experiment {
  return toExperiment(ExperimentRowSchema.parse(row));
}

export async function insertExperiment(sql: Sql, input: InsertExperiment): Promise<Experiment> {
  const rows = await sql<ExperimentRow[]>`
    insert into experiments (project_id, hypothesis, method, threshold_json, status)
    values (
      ${input.projectId},
      ${input.hypothesis},
      ${input.method},
      ${jsonParam(sql, input.threshold)},
      ${input.status ?? 'planned'}
    )
    returning *
  `;
  return parseExperiment(requireRow(rows, 'insertExperiment'));
}

export async function getExperimentById(
  sql: Sql,
  id: Experiment['id'],
): Promise<Experiment | null> {
  const rows = await sql<ExperimentRow[]>`
    select * from experiments where id = ${id}
  `;
  const row = rows[0];
  return row === undefined ? null : parseExperiment(row);
}

export async function listExperimentsByProjectId(
  sql: Sql,
  projectId: ProjectId,
): Promise<Experiment[]> {
  const rows = await sql<ExperimentRow[]>`
    select * from experiments where project_id = ${projectId} order by created_at desc
  `;
  return rows.map(parseExperiment);
}
