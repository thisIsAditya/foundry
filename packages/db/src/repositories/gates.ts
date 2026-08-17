import {
  GateIdSchema,
  GateResultSchema,
  GateSchema,
  GateTypeSchema,
  ProjectIdSchema,
  type Gate,
  type GateResult,
  type GateType,
  type ProjectId,
} from '@foundry/domain';
import { z } from 'zod';

import type { Sql } from '../client.js';
import { jsonParam } from '../json.js';
import { requireRow } from '../require-row.js';

const GateRowSchema = z.object({
  id: GateIdSchema,
  project_id: ProjectIdSchema,
  gate_type: GateTypeSchema,
  rule_version: z.number().int(),
  inputs_json: z.unknown(),
  result: GateResultSchema,
  evaluated_at: z.coerce.date(),
});

type GateRow = z.infer<typeof GateRowSchema>;

export type InsertGate = {
  projectId: ProjectId;
  gateType: GateType;
  ruleVersion: number;
  inputs: unknown;
  result: GateResult;
};

export function toGate(row: GateRow): Gate {
  return GateSchema.parse({
    id: row.id,
    projectId: row.project_id,
    gateType: row.gate_type,
    ruleVersion: row.rule_version,
    inputs: row.inputs_json,
    result: row.result,
    evaluatedAt: row.evaluated_at,
  });
}

function parseGate(row: GateRow): Gate {
  return toGate(GateRowSchema.parse(row));
}

export async function listGatesByProjectId(sql: Sql, projectId: ProjectId): Promise<Gate[]> {
  const rows = await sql<GateRow[]>`
    select * from gates where project_id = ${projectId} order by evaluated_at desc
  `;
  return rows.map(parseGate);
}

export async function insertGate(sql: Sql, input: InsertGate): Promise<Gate> {
  const rows = await sql<GateRow[]>`
    insert into gates (project_id, gate_type, rule_version, inputs_json, result)
    values (
      ${input.projectId},
      ${input.gateType},
      ${input.ruleVersion},
      ${jsonParam(sql, input.inputs)},
      ${input.result}
    )
    returning *
  `;
  return parseGate(requireRow(rows, 'insertGate'));
}
