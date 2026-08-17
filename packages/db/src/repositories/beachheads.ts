import {
  BeachheadIdSchema,
  BeachheadSchema,
  DmuIdSchema,
  PackRevisionIdSchema,
  PersonaIdSchema,
  type Beachhead,
  type BeachheadId,
  type DmuId,
  type PackRevisionId,
  type PersonaId,
} from '@foundry/domain';
import { z } from 'zod';

import type { Sql } from '../client.js';
import { requireRow } from '../require-row.js';

const BeachheadRowSchema = z.object({
  id: BeachheadIdSchema,
  pack_revision_id: PackRevisionIdSchema,
  segment_definition: z.string(),
  persona_id: PersonaIdSchema.nullable(),
  dmu_id: DmuIdSchema.nullable(),
  created_at: z.coerce.date(),
});

type BeachheadRow = z.infer<typeof BeachheadRowSchema>;

export type InsertBeachhead = {
  packRevisionId: PackRevisionId;
  segmentDefinition: string;
  personaId?: PersonaId | null;
  dmuId?: DmuId | null;
};

export function toBeachhead(row: BeachheadRow): Beachhead {
  return BeachheadSchema.parse({
    id: row.id,
    packRevisionId: row.pack_revision_id,
    segmentDefinition: row.segment_definition,
    personaId: row.persona_id,
    dmuId: row.dmu_id,
    createdAt: row.created_at,
  });
}

function parseBeachhead(row: BeachheadRow): Beachhead {
  return toBeachhead(BeachheadRowSchema.parse(row));
}

export async function insertBeachhead(sql: Sql, input: InsertBeachhead): Promise<Beachhead> {
  const rows = await sql<BeachheadRow[]>`
    insert into beachheads (pack_revision_id, segment_definition, persona_id, dmu_id)
    values (
      ${input.packRevisionId},
      ${input.segmentDefinition},
      ${input.personaId ?? null},
      ${input.dmuId ?? null}
    )
    returning *
  `;
  return parseBeachhead(requireRow(rows, 'insertBeachhead'));
}

export async function listBeachheadsByPackRevisionId(
  sql: Sql,
  packRevisionId: PackRevisionId,
): Promise<Beachhead[]> {
  const rows = await sql<BeachheadRow[]>`
    select * from beachheads where pack_revision_id = ${packRevisionId} order by created_at asc
  `;
  return rows.map(parseBeachhead);
}

export async function updateBeachheadDmuId(
  sql: Sql,
  id: BeachheadId,
  dmuId: DmuId,
): Promise<Beachhead> {
  const rows = await sql<BeachheadRow[]>`
    update beachheads set dmu_id = ${dmuId} where id = ${id} returning *
  `;
  return parseBeachhead(requireRow(rows, 'updateBeachheadDmuId'));
}
