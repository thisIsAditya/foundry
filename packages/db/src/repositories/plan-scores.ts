import {
  DimensionScoreSchema,
  PackRevisionIdSchema,
  PlanScoreIdSchema,
  PlanScoreSchema,
  ScoreDimensionSchema,
  ScoreImprovementActionSchema,
  ScoreReasonSchema,
  type PackRevisionId,
  type PlanScore,
  type ProjectId,
} from '@foundry/domain';
import { z } from 'zod';

import type { Sql } from '../client.js';
import { jsonParam } from '../json.js';
import { requireRow } from '../require-row.js';

const PlanScoreRowSchema = z.object({
  id: PlanScoreIdSchema,
  pack_revision_id: PackRevisionIdSchema,
  overall: z.unknown(),
  dimensions_json: z.unknown(),
  rule_version: z.string(),
  reasons_json: z.unknown(),
  top_actions_json: z.unknown(),
  calculated_at: z.coerce.date(),
});

type PlanScoreRow = z.infer<typeof PlanScoreRowSchema>;

export type InsertPlanScore = {
  packRevisionId: PackRevisionId;
  overall: number;
  dimensions: Record<string, z.infer<typeof DimensionScoreSchema>>;
  ruleVersion: string;
  reasons?: z.infer<typeof ScoreReasonSchema>[];
  topActions?: z.infer<typeof ScoreImprovementActionSchema>[];
};

function parseOverall(value: unknown): number {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    return Number(value);
  }
  throw new Error('Expected numeric overall score');
}

export function toPlanScore(row: PlanScoreRow): PlanScore {
  const dimensionsRecord = z
    .record(ScoreDimensionSchema, DimensionScoreSchema)
    .parse(row.dimensions_json);
  return PlanScoreSchema.parse({
    id: row.id,
    packRevisionId: row.pack_revision_id,
    overall: parseOverall(row.overall),
    dimensions: dimensionsRecord,
    ruleVersion: row.rule_version,
    reasons: z.array(ScoreReasonSchema).parse(row.reasons_json ?? []),
    topActions: z.array(ScoreImprovementActionSchema).parse(row.top_actions_json ?? []),
    calculatedAt: row.calculated_at,
  });
}

function parsePlanScore(row: PlanScoreRow): PlanScore {
  return toPlanScore(PlanScoreRowSchema.parse(row));
}

export async function insertPlanScore(sql: Sql, input: InsertPlanScore): Promise<PlanScore> {
  const rows = await sql<PlanScoreRow[]>`
    insert into plan_scores (
      pack_revision_id,
      overall,
      dimensions_json,
      rule_version,
      reasons_json,
      top_actions_json
    )
    values (
      ${input.packRevisionId},
      ${input.overall},
      ${jsonParam(sql, input.dimensions)},
      ${input.ruleVersion},
      ${jsonParam(sql, input.reasons ?? [])},
      ${jsonParam(sql, input.topActions ?? [])}
    )
    returning *
  `;
  return parsePlanScore(requireRow(rows, 'insertPlanScore'));
}

export async function listPlanScoresByPackRevisionId(
  sql: Sql,
  packRevisionId: PackRevisionId,
): Promise<PlanScore[]> {
  const rows = await sql<PlanScoreRow[]>`
    select * from plan_scores
    where pack_revision_id = ${packRevisionId}
    order by calculated_at desc
  `;
  return rows.map(parsePlanScore);
}

export async function listPlanScoresByProjectId(
  sql: Sql,
  projectId: ProjectId,
  limit: number,
): Promise<PlanScore[]> {
  const rows = await sql<PlanScoreRow[]>`
    select ps.*
    from plan_scores ps
    inner join pack_revisions pr on pr.id = ps.pack_revision_id
    where pr.project_id = ${projectId}
    order by ps.calculated_at desc
    limit ${limit}
  `;
  return rows.map(parsePlanScore);
}

export async function getLatestPlanScoreByPackRevisionId(
  sql: Sql,
  packRevisionId: PackRevisionId,
): Promise<PlanScore | null> {
  const rows = await sql<PlanScoreRow[]>`
    select * from plan_scores
    where pack_revision_id = ${packRevisionId}
    order by calculated_at desc
    limit 1
  `;
  const row = rows[0];
  return row === undefined ? null : parsePlanScore(row);
}
