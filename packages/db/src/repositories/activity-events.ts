import {
  ActivityEventSchema,
  ActorTypeSchema,
  ProjectIdSchema,
  WorkspaceIdSchema,
  type ActivityEvent,
  type ActorType,
  type BusinessRecordVersionId,
  type JourneyId,
  type JourneyStepId,
  type ProjectId,
  type ProposalId,
  type WorkspaceId,
} from '@foundry/domain';
import { z } from 'zod';

import type { Sql } from '../client.js';
import { jsonParam } from '../json.js';
import { requireRow } from '../require-row.js';

const RowSchema = z.object({
  id: z.string().uuid(),
  project_id: ProjectIdSchema,
  workspace_id: WorkspaceIdSchema,
  event_type: z.string(),
  actor_type: ActorTypeSchema,
  actor_id: z.string().nullable(),
  payload_json: z.unknown(),
  journey_id: z.string().uuid().nullable(),
  step_id: z.string().uuid().nullable(),
  proposal_id: z.string().uuid().nullable(),
  version_id: z.string().uuid().nullable(),
  created_at: z.coerce.date(),
});

type Row = z.infer<typeof RowSchema>;

export type InsertActivityEvent = {
  projectId: ProjectId;
  workspaceId: WorkspaceId;
  eventType: string;
  actorType: ActorType;
  actorId?: string | null;
  payload?: unknown;
  journeyId?: JourneyId | null;
  stepId?: JourneyStepId | null;
  proposalId?: ProposalId | null;
  versionId?: BusinessRecordVersionId | null;
};

export function toActivityEvent(row: Row): ActivityEvent {
  return ActivityEventSchema.parse({
    id: row.id,
    projectId: row.project_id,
    workspaceId: row.workspace_id,
    eventType: row.event_type,
    actorType: row.actor_type,
    actorId: row.actor_id,
    payload: row.payload_json,
    journeyId: row.journey_id,
    stepId: row.step_id,
    proposalId: row.proposal_id,
    versionId: row.version_id,
    createdAt: row.created_at,
  });
}

function parse(row: Row): ActivityEvent {
  return toActivityEvent(RowSchema.parse(row));
}

export async function insertActivityEvent(
  sql: Sql,
  input: InsertActivityEvent,
): Promise<ActivityEvent> {
  const rows = await sql<Row[]>`
    insert into activity_events (
      project_id,
      workspace_id,
      event_type,
      actor_type,
      actor_id,
      payload_json,
      journey_id,
      step_id,
      proposal_id,
      version_id
    )
    values (
      ${input.projectId},
      ${input.workspaceId},
      ${input.eventType},
      ${input.actorType},
      ${input.actorId ?? null},
      ${jsonParam(sql, input.payload ?? {})},
      ${input.journeyId ?? null},
      ${input.stepId ?? null},
      ${input.proposalId ?? null},
      ${input.versionId ?? null}
    )
    returning *
  `;
  return parse(requireRow(rows, 'insertActivityEvent'));
}

export async function listActivityEventsByProjectId(
  sql: Sql,
  projectId: ProjectId,
  limit = 20,
): Promise<ActivityEvent[]> {
  const rows = await sql<Row[]>`
    select * from activity_events
    where project_id = ${projectId}
    order by created_at desc
    limit ${limit}
  `;
  return rows.map(parse);
}
