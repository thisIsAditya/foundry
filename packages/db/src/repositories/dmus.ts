import {
  BeachheadIdSchema,
  DmuIdSchema,
  DmuSchema,
  PackRevisionIdSchema,
  type BeachheadId,
  type Dmu,
  type PackRevisionId,
} from '@foundry/domain';
import { z } from 'zod';

import type { Sql } from '../client.js';
import { requireRow } from '../require-row.js';

const DmuRowSchema = z.object({
  id: DmuIdSchema,
  pack_revision_id: PackRevisionIdSchema,
  beachhead_id: BeachheadIdSchema,
  user: z.string().nullable(),
  champion: z.string().nullable(),
  buyer: z.string().nullable(),
  approver: z.string().nullable(),
  veto: z.string().nullable(),
  procurement: z.string().nullable(),
  created_at: z.coerce.date(),
});

type DmuRow = z.infer<typeof DmuRowSchema>;

export type InsertDmu = {
  packRevisionId: PackRevisionId;
  beachheadId: BeachheadId;
  user?: string | null;
  champion?: string | null;
  buyer?: string | null;
  approver?: string | null;
  veto?: string | null;
  procurement?: string | null;
};

export function toDmu(row: DmuRow): Dmu {
  return DmuSchema.parse({
    id: row.id,
    packRevisionId: row.pack_revision_id,
    beachheadId: row.beachhead_id,
    user: row.user,
    champion: row.champion,
    buyer: row.buyer,
    approver: row.approver,
    veto: row.veto,
    procurement: row.procurement,
    createdAt: row.created_at,
  });
}

function parseDmu(row: DmuRow): Dmu {
  return toDmu(DmuRowSchema.parse(row));
}

export async function insertDmu(sql: Sql, input: InsertDmu): Promise<Dmu> {
  const rows = await sql<DmuRow[]>`
    insert into dmus (
      pack_revision_id,
      beachhead_id,
      "user",
      champion,
      buyer,
      approver,
      veto,
      procurement
    )
    values (
      ${input.packRevisionId},
      ${input.beachheadId},
      ${input.user ?? null},
      ${input.champion ?? null},
      ${input.buyer ?? null},
      ${input.approver ?? null},
      ${input.veto ?? null},
      ${input.procurement ?? null}
    )
    returning *
  `;
  return parseDmu(requireRow(rows, 'insertDmu'));
}

export async function listDmusByPackRevisionId(
  sql: Sql,
  packRevisionId: PackRevisionId,
): Promise<Dmu[]> {
  const rows = await sql<DmuRow[]>`
    select * from dmus where pack_revision_id = ${packRevisionId} order by created_at asc
  `;
  return rows.map(parseDmu);
}
