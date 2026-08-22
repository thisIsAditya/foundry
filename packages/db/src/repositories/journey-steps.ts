import {
  JourneyIdSchema,
  JourneyStageSchema,
  JourneyStepSchema,
  JourneyStepStatusSchema,
  WorkspaceIdSchema,
  type JourneyId,
  type JourneyStage,
  type JourneyStep,
  type JourneyStepId,
  type JourneyStepStatus,
  type WorkspaceId,
} from '@foundry/domain';
import { z } from 'zod';

import type { Sql } from '../client.js';
import { jsonParam } from '../json.js';
import { requireRow } from '../require-row.js';

const RowSchema = z.object({
  id: z.string().uuid(),
  journey_id: JourneyIdSchema,
  workspace_id: WorkspaceIdSchema,
  stage: JourneyStageSchema,
  objective: z.string(),
  why_now: z.string(),
  expected_effort: z.string().nullable(),
  expected_minutes: z.number().int().nullable(),
  cofounder_will_do: z.string().nullable(),
  expected_outcome: z.string().nullable(),
  status: JourneyStepStatusSchema,
  source_proposal_id: z.string().uuid().nullable(),
  input_evidence: z.unknown(),
  completion_evidence: z.unknown(),
  defer_reason: z.string().nullable(),
  skip_reason: z.string().nullable(),
  recommended: z.boolean(),
  revision: z.number().int(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

type Row = z.infer<typeof RowSchema>;

export type InsertJourneyStep = {
  journeyId: JourneyId;
  workspaceId: WorkspaceId;
  stage: JourneyStage;
  objective: string;
  whyNow: string;
  expectedEffort?: string | null;
  expectedMinutes?: number | null;
  cofounderWillDo?: string | null;
  expectedOutcome?: string | null;
  status?: JourneyStepStatus;
  recommended?: boolean;
};

export function toJourneyStep(row: Row): JourneyStep {
  return JourneyStepSchema.parse({
    id: row.id,
    journeyId: row.journey_id,
    workspaceId: row.workspace_id,
    stage: row.stage,
    objective: row.objective,
    whyNow: row.why_now,
    expectedEffort: row.expected_effort,
    expectedMinutes: row.expected_minutes,
    cofounderWillDo: row.cofounder_will_do,
    expectedOutcome: row.expected_outcome,
    status: row.status,
    sourceProposalId: row.source_proposal_id,
    inputEvidence: row.input_evidence,
    completionEvidence: row.completion_evidence,
    deferReason: row.defer_reason,
    skipReason: row.skip_reason,
    recommended: row.recommended,
    revision: row.revision,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function parse(row: Row): JourneyStep {
  return toJourneyStep(RowSchema.parse(row));
}

export async function insertJourneyStep(sql: Sql, input: InsertJourneyStep): Promise<JourneyStep> {
  const rows = await sql<Row[]>`
    insert into journey_steps (
      journey_id,
      workspace_id,
      stage,
      objective,
      why_now,
      expected_effort,
      expected_minutes,
      cofounder_will_do,
      expected_outcome,
      status,
      recommended
    )
    values (
      ${input.journeyId},
      ${input.workspaceId},
      ${input.stage},
      ${input.objective},
      ${input.whyNow},
      ${input.expectedEffort ?? null},
      ${input.expectedMinutes ?? null},
      ${input.cofounderWillDo ?? null},
      ${input.expectedOutcome ?? null},
      ${input.status ?? 'ready'},
      ${input.recommended ?? false}
    )
    returning *
  `;
  return parse(requireRow(rows, 'insertJourneyStep'));
}

export async function getJourneyStepById(sql: Sql, id: JourneyStepId): Promise<JourneyStep | null> {
  const rows = await sql<Row[]>`
    select * from journey_steps where id = ${id}
  `;
  const row = rows[0];
  return row === undefined ? null : parse(row);
}

export async function listJourneySteps(sql: Sql, journeyId: JourneyId): Promise<JourneyStep[]> {
  const rows = await sql<Row[]>`
    select * from journey_steps where journey_id = ${journeyId} order by created_at asc
  `;
  return rows.map(parse);
}

export async function updateJourneyStepStatus(
  sql: Sql,
  id: JourneyStepId,
  input: {
    expectedRevision: number;
    status: JourneyStepStatus;
    deferReason?: string | null;
    skipReason?: string | null;
    completionEvidence?: unknown;
  },
): Promise<JourneyStep | null> {
  const rows = await sql<Row[]>`
    update journey_steps
    set
      status = ${input.status},
      defer_reason = coalesce(${input.deferReason ?? null}, defer_reason),
      skip_reason = coalesce(${input.skipReason ?? null}, skip_reason),
      completion_evidence = coalesce(
        ${input.completionEvidence === undefined ? null : jsonParam(sql, input.completionEvidence)},
        completion_evidence
      ),
      revision = revision + 1,
      updated_at = now()
    where id = ${id} and revision = ${input.expectedRevision}
    returning *
  `;
  const row = rows[0];
  return row === undefined ? null : parse(row);
}

export async function clearRecommendedJourneySteps(sql: Sql, journeyId: JourneyId): Promise<void> {
  await sql`
    update journey_steps
    set recommended = false, updated_at = now()
    where journey_id = ${journeyId} and recommended = true
  `;
}
