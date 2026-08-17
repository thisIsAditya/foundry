import { SprintIdSchema, type SprintId } from '@foundry/domain';
import { z } from 'zod';

import type { Sql } from '../client.js';
import { jsonParam } from '../json.js';
import { requireRow } from '../require-row.js';

export type SprintProgressEvent = {
  id: string;
  sprintId: SprintId;
  sequenceNo: number;
  eventType: string;
  payload: unknown;
  createdAt: Date;
};

const SprintProgressRowSchema = z.object({
  id: z.uuid(),
  sprint_id: SprintIdSchema,
  sequence_no: z.coerce.number().int(),
  event_type: z.string(),
  payload_json: z.unknown(),
  created_at: z.coerce.date(),
});

type SprintProgressRow = z.infer<typeof SprintProgressRowSchema>;

function toSprintProgressEvent(row: SprintProgressRow): SprintProgressEvent {
  return {
    id: row.id,
    sprintId: row.sprint_id,
    sequenceNo: row.sequence_no,
    eventType: row.event_type,
    payload: row.payload_json,
    createdAt: row.created_at,
  };
}

function parseEvent(row: SprintProgressRow): SprintProgressEvent {
  return toSprintProgressEvent(SprintProgressRowSchema.parse(row));
}

export async function nextSprintProgressSequence(sql: Sql, sprintId: SprintId): Promise<number> {
  const rows = await sql<{ next: string | number | null }[]>`
    select coalesce(max(sequence_no), 0) + 1 as next
    from sprint_progress_events
    where sprint_id = ${sprintId}
  `;
  return Number(requireRow(rows, 'nextSprintProgressSequence').next ?? 1);
}

export async function insertSprintProgressEvent(
  sql: Sql,
  input: { sprintId: SprintId; eventType: string; payload: unknown },
): Promise<SprintProgressEvent> {
  const sequenceNo = await nextSprintProgressSequence(sql, input.sprintId);
  const rows = await sql<SprintProgressRow[]>`
    insert into sprint_progress_events (sprint_id, sequence_no, event_type, payload_json)
    values (
      ${input.sprintId},
      ${sequenceNo},
      ${input.eventType},
      ${jsonParam(sql, input.payload)}
    )
    returning *
  `;
  return parseEvent(requireRow(rows, 'insertSprintProgressEvent'));
}

export async function listSprintProgressEvents(
  sql: Sql,
  sprintId: SprintId,
  afterSequenceNo = 0,
): Promise<SprintProgressEvent[]> {
  const rows = await sql<SprintProgressRow[]>`
    select * from sprint_progress_events
    where sprint_id = ${sprintId}
      and sequence_no > ${afterSequenceNo}
    order by sequence_no asc
  `;
  return rows.map(parseEvent);
}
