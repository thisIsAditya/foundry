import {
  JourneyIdSchema,
  JourneySchema,
  JourneyStageSchema,
  ProjectIdSchema,
  WorkspaceIdSchema,
  type BusinessRecordVersionId,
  type Journey,
  type JourneyId,
  type JourneyStage,
  type ProjectId,
  type WorkspaceId,
} from '@foundry/domain';
import { z } from 'zod';

import type { Sql } from '../client.js';
import { requireRow } from '../require-row.js';

const JourneyRowSchema = z.object({
  id: JourneyIdSchema,
  project_id: ProjectIdSchema,
  workspace_id: WorkspaceIdSchema,
  current_stage: JourneyStageSchema,
  current_objective: z.string(),
  accepted_record_version_id: z.string().uuid().nullable(),
  revision: z.number().int(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

type JourneyRow = z.infer<typeof JourneyRowSchema>;

export type InsertJourney = {
  projectId: ProjectId;
  workspaceId: WorkspaceId;
  currentStage: JourneyStage;
  currentObjective: string;
};

export function toJourney(row: JourneyRow): Journey {
  return JourneySchema.parse({
    id: row.id,
    projectId: row.project_id,
    workspaceId: row.workspace_id,
    currentStage: row.current_stage,
    currentObjective: row.current_objective,
    acceptedRecordVersionId: row.accepted_record_version_id,
    revision: row.revision,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function parseJourney(row: JourneyRow): Journey {
  return toJourney(JourneyRowSchema.parse(row));
}

export async function insertJourney(sql: Sql, input: InsertJourney): Promise<Journey> {
  const rows = await sql<JourneyRow[]>`
    insert into journeys (
      project_id,
      workspace_id,
      current_stage,
      current_objective
    )
    values (
      ${input.projectId},
      ${input.workspaceId},
      ${input.currentStage},
      ${input.currentObjective}
    )
    returning *
  `;
  return parseJourney(requireRow(rows, 'insertJourney'));
}

export async function getJourneyByProjectId(
  sql: Sql,
  projectId: ProjectId,
): Promise<Journey | null> {
  const rows = await sql<JourneyRow[]>`
    select * from journeys where project_id = ${projectId}
  `;
  const row = rows[0];
  return row === undefined ? null : parseJourney(row);
}

export async function getJourneyById(sql: Sql, id: JourneyId): Promise<Journey | null> {
  const rows = await sql<JourneyRow[]>`
    select * from journeys where id = ${id}
  `;
  const row = rows[0];
  return row === undefined ? null : parseJourney(row);
}

export async function updateJourneyState(
  sql: Sql,
  id: JourneyId,
  input: {
    expectedRevision: number;
    currentStage?: JourneyStage;
    currentObjective?: string;
    acceptedRecordVersionId?: BusinessRecordVersionId | null;
  },
): Promise<Journey | null> {
  const rows = await sql<JourneyRow[]>`
    update journeys
    set
      current_stage = coalesce(${input.currentStage ?? null}, current_stage),
      current_objective = coalesce(${input.currentObjective ?? null}, current_objective),
      accepted_record_version_id = coalesce(
        ${input.acceptedRecordVersionId ?? null},
        accepted_record_version_id
      ),
      revision = revision + 1,
      updated_at = now()
    where id = ${id} and revision = ${input.expectedRevision}
    returning *
  `;
  const row = rows[0];
  return row === undefined ? null : parseJourney(row);
}
