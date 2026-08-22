import {
  ActorTypeSchema,
  JourneyIdSchema,
  JourneyTransitionSchema,
  WorkspaceIdSchema,
  type ActorType,
  type JourneyId,
  type JourneyTransition,
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
  actor_type: ActorTypeSchema,
  actor_id: z.string().nullable(),
  cause: z.string(),
  from_state: z.unknown(),
  to_state: z.unknown(),
  command: z.string().nullable(),
  correlation_id: z.string().uuid().nullable(),
  metadata_json: z.unknown(),
  created_at: z.coerce.date(),
});

type Row = z.infer<typeof RowSchema>;

export type InsertJourneyTransition = {
  journeyId: JourneyId;
  workspaceId: WorkspaceId;
  actorType: ActorType;
  actorId?: string | null;
  cause: string;
  fromState: unknown;
  toState: unknown;
  command?: string | null;
  correlationId?: string | null;
  metadata?: unknown;
};

export function toJourneyTransition(row: Row): JourneyTransition {
  return JourneyTransitionSchema.parse({
    id: row.id,
    journeyId: row.journey_id,
    workspaceId: row.workspace_id,
    actorType: row.actor_type,
    actorId: row.actor_id,
    cause: row.cause,
    fromState: row.from_state,
    toState: row.to_state,
    command: row.command,
    correlationId: row.correlation_id,
    metadata: row.metadata_json,
    createdAt: row.created_at,
  });
}

export async function insertJourneyTransition(
  sql: Sql,
  input: InsertJourneyTransition,
): Promise<JourneyTransition> {
  const rows = await sql<Row[]>`
    insert into journey_transitions (
      journey_id,
      workspace_id,
      actor_type,
      actor_id,
      cause,
      from_state,
      to_state,
      command,
      correlation_id,
      metadata_json
    )
    values (
      ${input.journeyId},
      ${input.workspaceId},
      ${input.actorType},
      ${input.actorId ?? null},
      ${input.cause},
      ${jsonParam(sql, input.fromState)},
      ${jsonParam(sql, input.toState)},
      ${input.command ?? null},
      ${input.correlationId ?? null},
      ${jsonParam(sql, input.metadata ?? {})}
    )
    returning *
  `;
  return toJourneyTransition(RowSchema.parse(requireRow(rows, 'insertJourneyTransition')));
}
