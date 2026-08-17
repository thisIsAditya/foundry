import {
  AlternativeIdSchema,
  AssumptionIdSchema,
  EvidenceItemIdSchema,
  PackRevisionIdSchema,
  WedgeIdSchema,
  WedgeSchema,
  type PackRevisionId,
  type Wedge,
} from '@foundry/domain';
import { z } from 'zod';

import { parseUuidArray } from '../arrays.js';
import type { Sql } from '../client.js';
import { requireRow } from '../require-row.js';

const WedgeRowSchema = z.object({
  id: WedgeIdSchema,
  pack_revision_id: PackRevisionIdSchema,
  statement: z.string(),
  alternative_ids: z.unknown(),
  evidence_item_ids: z.unknown(),
  assumption_ids: z.unknown(),
  created_at: z.coerce.date(),
});

type WedgeRow = z.infer<typeof WedgeRowSchema>;

export type InsertWedge = {
  packRevisionId: PackRevisionId;
  statement: string;
  alternativeIds?: z.infer<typeof AlternativeIdSchema>[];
  evidenceItemIds?: z.infer<typeof EvidenceItemIdSchema>[];
  assumptionIds?: z.infer<typeof AssumptionIdSchema>[];
};

export function toWedge(row: WedgeRow): Wedge {
  return WedgeSchema.parse({
    id: row.id,
    packRevisionId: row.pack_revision_id,
    statement: row.statement,
    alternativeIds: parseUuidArray(row.alternative_ids),
    evidenceItemIds: parseUuidArray(row.evidence_item_ids),
    assumptionIds: parseUuidArray(row.assumption_ids),
    createdAt: row.created_at,
  });
}

function parseWedge(row: WedgeRow): Wedge {
  return toWedge(WedgeRowSchema.parse(row));
}

export async function insertWedge(sql: Sql, input: InsertWedge): Promise<Wedge> {
  const rows = await sql<WedgeRow[]>`
    insert into wedges (
      pack_revision_id,
      statement,
      alternative_ids,
      evidence_item_ids,
      assumption_ids
    )
    values (
      ${input.packRevisionId},
      ${input.statement},
      ${input.alternativeIds ?? []},
      ${input.evidenceItemIds ?? []},
      ${input.assumptionIds ?? []}
    )
    returning *
  `;
  return parseWedge(requireRow(rows, 'insertWedge'));
}

export async function listWedgesByPackRevisionId(
  sql: Sql,
  packRevisionId: PackRevisionId,
): Promise<Wedge[]> {
  const rows = await sql<WedgeRow[]>`
    select * from wedges where pack_revision_id = ${packRevisionId} order by created_at asc
  `;
  return rows.map(parseWedge);
}
