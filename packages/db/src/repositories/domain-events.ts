import {
  ActorTypeSchema,
  ProjectIdSchema,
  WorkspaceIdSchema,
  type ActorType,
  type ProjectId,
  type WorkspaceId,
} from '@foundry/domain';
import { z } from 'zod';

import type { Sql } from '../client.js';
import { requireRow } from '../require-row.js';

const DomainEventRowSchema = z.object({
  id: z.coerce.number().int(),
  event_type: z.string().min(1),
  workspace_id: WorkspaceIdSchema,
  project_id: ProjectIdSchema.nullable(),
  actor_type: ActorTypeSchema,
  actor_id: z.string().nullable(),
  correlation_id: z.uuid(),
  causation_id: z.string().uuid().nullable(),
  schema_version: z.number().int(),
  payload_json: z.unknown(),
  occurred_at: z.coerce.date(),
});

export type DomainEvent = {
  id: number;
  eventType: string;
  workspaceId: WorkspaceId;
  projectId: ProjectId | null;
  actorType: ActorType;
  actorId: string | null;
  correlationId: string;
  causationId: string | null;
  schemaVersion: number;
  payload: unknown;
  occurredAt: Date;
};

export type InsertDomainEvent = {
  eventType: string;
  workspaceId: WorkspaceId;
  projectId?: ProjectId | null;
  actorType: ActorType;
  actorId?: string | null;
  correlationId: string;
  causationId?: string | null;
  schemaVersion?: number;
  payload: unknown;
};

export function toDomainEvent(row: unknown): DomainEvent {
  const parsed = DomainEventRowSchema.parse(row);
  return {
    id: parsed.id,
    eventType: parsed.event_type,
    workspaceId: parsed.workspace_id,
    projectId: parsed.project_id,
    actorType: parsed.actor_type,
    actorId: parsed.actor_id,
    correlationId: parsed.correlation_id,
    causationId: parsed.causation_id,
    schemaVersion: parsed.schema_version,
    payload: parsed.payload_json,
    occurredAt: parsed.occurred_at,
  };
}

export async function insertDomainEvent(sql: Sql, input: InsertDomainEvent): Promise<DomainEvent> {
  const rows = await sql`
    insert into domain_events (
      event_type,
      workspace_id,
      project_id,
      actor_type,
      actor_id,
      correlation_id,
      causation_id,
      schema_version,
      payload_json
    )
    values (
      ${input.eventType},
      ${input.workspaceId},
      ${input.projectId ?? null},
      ${input.actorType},
      ${input.actorId ?? null},
      ${input.correlationId},
      ${input.causationId ?? null},
      ${input.schemaVersion ?? 1},
      ${sql.json(JSON.parse(JSON.stringify(input.payload)))}
    )
    returning *
  `;
  return toDomainEvent(requireRow(rows, 'insertDomainEvent'));
}
