import {
  ExperimentIdSchema,
  OfferIdSchema,
  ProjectIdSchema,
  WtpEventIdSchema,
  WtpEventSchema,
  WtpInstrumentSchema,
  WtpParticipantClassSchema,
  type ExperimentId,
  type OfferId,
  type ProjectId,
  type WtpEvent,
  type WtpInstrument,
  type WtpParticipantClass,
} from '@foundry/domain';
import { z } from 'zod';

import type { Sql } from '../client.js';
import { nullableNumericToString } from '../numeric.js';
import { requireRow } from '../require-row.js';

const WtpEventRowSchema = z.object({
  id: WtpEventIdSchema,
  project_id: ProjectIdSchema,
  experiment_id: ExperimentIdSchema.nullable(),
  offer_id: OfferIdSchema.nullable(),
  participant_class: WtpParticipantClassSchema,
  instrument: WtpInstrumentSchema,
  amount: z.unknown().nullable(),
  currency: z.string().nullable(),
  occurred_at: z.coerce.date(),
});

type WtpEventRow = z.infer<typeof WtpEventRowSchema>;

export type InsertWtpEvent = {
  projectId: ProjectId;
  experimentId?: ExperimentId | null;
  offerId?: OfferId | null;
  participantClass: WtpParticipantClass;
  instrument: WtpInstrument;
  amount?: string | null;
  currency?: string | null;
  occurredAt?: Date;
};

export function toWtpEvent(row: WtpEventRow): WtpEvent {
  return WtpEventSchema.parse({
    id: row.id,
    experimentId: row.experiment_id,
    offerId: row.offer_id,
    participantClass: row.participant_class,
    instrument: row.instrument,
    amount: nullableNumericToString(row.amount),
    currency: row.currency,
    occurredAt: row.occurred_at,
  });
}

function parseWtpEvent(row: WtpEventRow): WtpEvent {
  return toWtpEvent(WtpEventRowSchema.parse(row));
}

export async function insertWtpEvent(sql: Sql, input: InsertWtpEvent): Promise<WtpEvent> {
  const rows = await sql<WtpEventRow[]>`
    insert into wtp_events (
      project_id,
      experiment_id,
      offer_id,
      participant_class,
      instrument,
      amount,
      currency,
      occurred_at
    )
    values (
      ${input.projectId},
      ${input.experimentId ?? null},
      ${input.offerId ?? null},
      ${input.participantClass},
      ${input.instrument},
      ${input.amount ?? null},
      ${input.currency ?? null},
      ${input.occurredAt ?? new Date()}
    )
    returning *
  `;
  return parseWtpEvent(requireRow(rows, 'insertWtpEvent'));
}

export async function listWtpEventsByProjectId(
  sql: Sql,
  projectId: ProjectId,
): Promise<WtpEvent[]> {
  const rows = await sql<WtpEventRow[]>`
    select * from wtp_events where project_id = ${projectId} order by occurred_at asc
  `;
  return rows.map(parseWtpEvent);
}
