import {
  InterviewIdSchema,
  InterviewParticipantTypeSchema,
  InterviewSchema,
  ProjectIdSchema,
  type Interview,
  type InterviewParticipantType,
  type ProjectId,
} from '@foundry/domain';
import { z } from 'zod';

import type { Sql } from '../client.js';
import { jsonParam } from '../json.js';
import { requireRow } from '../require-row.js';

const InterviewRowSchema = z.object({
  id: InterviewIdSchema,
  project_id: ProjectIdSchema,
  participant_type: InterviewParticipantTypeSchema,
  consent_json: z.unknown(),
  conducted_at: z.coerce.date().nullable(),
  created_at: z.coerce.date(),
});

type InterviewRow = z.infer<typeof InterviewRowSchema>;

export type InsertInterview = {
  projectId: ProjectId;
  participantType: InterviewParticipantType;
  consent: unknown;
  conductedAt?: Date | null;
};

export function toInterview(row: InterviewRow): Interview {
  return InterviewSchema.parse({
    id: row.id,
    projectId: row.project_id,
    participantType: row.participant_type,
    consent: row.consent_json,
    conductedAt: row.conducted_at,
    createdAt: row.created_at,
  });
}

function parseInterview(row: InterviewRow): Interview {
  return toInterview(InterviewRowSchema.parse(row));
}

export async function insertInterview(sql: Sql, input: InsertInterview): Promise<Interview> {
  const rows = await sql<InterviewRow[]>`
    insert into interviews (project_id, participant_type, consent_json, conducted_at)
    values (
      ${input.projectId},
      ${input.participantType},
      ${jsonParam(sql, input.consent)},
      ${input.conductedAt ?? null}
    )
    returning *
  `;
  return parseInterview(requireRow(rows, 'insertInterview'));
}

export async function listInterviewsByProjectId(
  sql: Sql,
  projectId: ProjectId,
): Promise<Interview[]> {
  const rows = await sql<InterviewRow[]>`
    select * from interviews where project_id = ${projectId} order by created_at asc
  `;
  return rows.map(parseInterview);
}
