import {
  JourneyIdSchema,
  JourneyStageSchema,
  JourneyStageStateSchema,
  JourneyStageStatusSchema,
  WorkspaceIdSchema,
  type JourneyId,
  type JourneyStage,
  type JourneyStageState,
  type JourneyStageStatus,
  type WorkspaceId,
} from '@foundry/domain';
import { z } from 'zod';

import type { Sql } from '../client.js';
import { requireRow } from '../require-row.js';

const RowSchema = z.object({
  id: z.string().uuid(),
  journey_id: JourneyIdSchema,
  workspace_id: WorkspaceIdSchema,
  stage: JourneyStageSchema,
  status: JourneyStageStatusSchema,
  goal: z.string().nullable(),
  outcome: z.string().nullable(),
  completion_reason: z.string().nullable(),
  defer_reason: z.string().nullable(),
  block_reason: z.string().nullable(),
  latest_record_version_id: z.string().uuid().nullable(),
  updated_at: z.coerce.date(),
});

type Row = z.infer<typeof RowSchema>;

export type InsertJourneyStageState = {
  journeyId: JourneyId;
  workspaceId: WorkspaceId;
  stage: JourneyStage;
  status: JourneyStageStatus;
  goal?: string | null;
  outcome?: string | null;
  deferReason?: string | null;
};

export function toJourneyStageState(row: Row): JourneyStageState {
  return JourneyStageStateSchema.parse({
    id: row.id,
    journeyId: row.journey_id,
    workspaceId: row.workspace_id,
    stage: row.stage,
    status: row.status,
    goal: row.goal,
    outcome: row.outcome,
    completionReason: row.completion_reason,
    deferReason: row.defer_reason,
    blockReason: row.block_reason,
    latestRecordVersionId: row.latest_record_version_id,
    updatedAt: row.updated_at,
  });
}

function parse(row: Row): JourneyStageState {
  return toJourneyStageState(RowSchema.parse(row));
}

export async function insertJourneyStageState(
  sql: Sql,
  input: InsertJourneyStageState,
): Promise<JourneyStageState> {
  const rows = await sql<Row[]>`
    insert into journey_stage_states (
      journey_id,
      workspace_id,
      stage,
      status,
      goal,
      outcome,
      defer_reason
    )
    values (
      ${input.journeyId},
      ${input.workspaceId},
      ${input.stage},
      ${input.status},
      ${input.goal ?? null},
      ${input.outcome ?? null},
      ${input.deferReason ?? null}
    )
    returning *
  `;
  return parse(requireRow(rows, 'insertJourneyStageState'));
}

export async function listJourneyStageStates(
  sql: Sql,
  journeyId: JourneyId,
): Promise<JourneyStageState[]> {
  const rows = await sql<Row[]>`
    select * from journey_stage_states where journey_id = ${journeyId}
  `;
  return rows.map(parse);
}

export async function updateJourneyStageState(
  sql: Sql,
  journeyId: JourneyId,
  stage: JourneyStage,
  patch: {
    status: JourneyStageStatus;
    goal?: string | null;
    outcome?: string | null;
    completionReason?: string | null;
    deferReason?: string | null;
    blockReason?: string | null;
  },
): Promise<JourneyStageState> {
  const rows = await sql<Row[]>`
    update journey_stage_states
    set
      status = ${patch.status},
      goal = coalesce(${patch.goal ?? null}, goal),
      outcome = coalesce(${patch.outcome ?? null}, outcome),
      completion_reason = coalesce(${patch.completionReason ?? null}, completion_reason),
      defer_reason = coalesce(${patch.deferReason ?? null}, defer_reason),
      block_reason = coalesce(${patch.blockReason ?? null}, block_reason),
      updated_at = now()
    where journey_id = ${journeyId} and stage = ${stage}
    returning *
  `;
  return parse(requireRow(rows, 'updateJourneyStageState'));
}
