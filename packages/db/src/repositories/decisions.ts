import {
  DecisionIdSchema,
  DecisionSchema,
  GateIdSchema,
  ProjectIdSchema,
  SprintIdSchema,
  UserIdSchema,
  type Decision,
  type GateId,
  type ProjectId,
  type SprintId,
  type UserId,
} from '@foundry/domain';
import { z } from 'zod';

import type { Sql } from '../client.js';
import { jsonParam } from '../json.js';
import { requireRow } from '../require-row.js';

const DecisionRowSchema = z.object({
  id: DecisionIdSchema,
  project_id: ProjectIdSchema,
  options_json: z.unknown(),
  chosen_json: z.unknown(),
  rationale: z.string().nullable(),
  evidence_refs_json: z.unknown().nullable(),
  gate_id: GateIdSchema.nullable(),
  sprint_id: SprintIdSchema.nullable(),
  decided_by_user_id: UserIdSchema.nullable(),
  created_at: z.coerce.date(),
});

type DecisionRow = z.infer<typeof DecisionRowSchema>;

export type InsertDecision = {
  projectId: ProjectId;
  options: unknown;
  chosen: unknown;
  rationale?: string | null;
  evidenceRefs?: unknown;
  gateId?: GateId | null;
  sprintId?: SprintId | null;
  decidedByUserId?: UserId | null;
};

export function toDecision(row: DecisionRow): Decision {
  return DecisionSchema.parse({
    id: row.id,
    projectId: row.project_id,
    options: row.options_json,
    chosen: row.chosen_json,
    rationale: row.rationale,
    evidenceRefs: row.evidence_refs_json,
    gateId: row.gate_id,
    sprintId: row.sprint_id,
    decidedByUserId: row.decided_by_user_id,
    createdAt: row.created_at,
  });
}

export async function insertDecision(sql: Sql, input: InsertDecision): Promise<Decision> {
  const rows = await sql<DecisionRow[]>`
    insert into decisions (
      project_id, options_json, chosen_json, rationale, evidence_refs_json,
      gate_id, sprint_id, decided_by_user_id
    )
    values (
      ${input.projectId},
      ${jsonParam(sql, input.options)},
      ${jsonParam(sql, input.chosen)},
      ${input.rationale ?? null},
      ${jsonParam(sql, input.evidenceRefs ?? null)},
      ${input.gateId ?? null},
      ${input.sprintId ?? null},
      ${input.decidedByUserId ?? null}
    )
    returning *
  `;
  return toDecision(DecisionRowSchema.parse(requireRow(rows, 'insertDecision')));
}

export async function listDecisionsByProjectId(
  sql: Sql,
  projectId: ProjectId,
): Promise<Decision[]> {
  const rows = await sql<DecisionRow[]>`
    select * from decisions where project_id = ${projectId} order by created_at desc
  `;
  return rows.map((row) => toDecision(DecisionRowSchema.parse(row)));
}
