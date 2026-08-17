import {
  BeachheadIdSchema,
  EvidenceItemIdSchema,
  PackRevisionIdSchema,
  PersonaIdSchema,
  PersonaSchema,
  type PackRevisionId,
  type Persona,
} from '@foundry/domain';
import { z } from 'zod';

import { parseUuidArray } from '../arrays.js';
import type { Sql } from '../client.js';
import { requireRow } from '../require-row.js';

const PersonaRowSchema = z.object({
  id: PersonaIdSchema,
  pack_revision_id: PackRevisionIdSchema,
  beachhead_id: BeachheadIdSchema,
  profile: z.string(),
  evidence_item_ids: z.unknown(),
  created_at: z.coerce.date(),
});

type PersonaRow = z.infer<typeof PersonaRowSchema>;

export type InsertPersona = {
  packRevisionId: PackRevisionId;
  beachheadId: z.infer<typeof BeachheadIdSchema>;
  profile: string;
  evidenceItemIds?: z.infer<typeof EvidenceItemIdSchema>[];
};

export function toPersona(row: PersonaRow): Persona {
  return PersonaSchema.parse({
    id: row.id,
    packRevisionId: row.pack_revision_id,
    beachheadId: row.beachhead_id,
    profile: row.profile,
    evidenceItemIds: parseUuidArray(row.evidence_item_ids),
    createdAt: row.created_at,
  });
}

function parsePersona(row: PersonaRow): Persona {
  return toPersona(PersonaRowSchema.parse(row));
}

export async function insertPersona(sql: Sql, input: InsertPersona): Promise<Persona> {
  const rows = await sql<PersonaRow[]>`
    insert into personas (pack_revision_id, beachhead_id, profile, evidence_item_ids)
    values (
      ${input.packRevisionId},
      ${input.beachheadId},
      ${input.profile},
      ${input.evidenceItemIds ?? []}
    )
    returning *
  `;
  return parsePersona(requireRow(rows, 'insertPersona'));
}

export async function listPersonasByPackRevisionId(
  sql: Sql,
  packRevisionId: PackRevisionId,
): Promise<Persona[]> {
  const rows = await sql<PersonaRow[]>`
    select * from personas where pack_revision_id = ${packRevisionId} order by created_at asc
  `;
  return rows.map(parsePersona);
}
