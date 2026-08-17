import {
  MarketComputedResultSchema,
  MarketFormulaSpecSchema,
  MarketInputsSchema,
  MarketModelIdSchema,
  MarketModelSchema,
  PackRevisionIdSchema,
  type MarketComputedResult,
  type MarketFormulaSpec,
  type MarketInputs,
  type MarketModel,
  type PackRevisionId,
} from '@foundry/domain';
import { z } from 'zod';

import type { Sql } from '../client.js';
import { jsonParam } from '../json.js';
import { requireRow } from '../require-row.js';

const MarketModelRowSchema = z.object({
  id: MarketModelIdSchema,
  pack_revision_id: PackRevisionIdSchema,
  formula_spec_json: z.unknown(),
  inputs_json: z.unknown(),
  computed_result_json: z.unknown().nullable(),
  created_at: z.coerce.date(),
});

type MarketModelRow = z.infer<typeof MarketModelRowSchema>;

export type InsertMarketModel = {
  packRevisionId: PackRevisionId;
  formulaSpec: MarketFormulaSpec;
  inputs: MarketInputs;
  computedResult?: MarketComputedResult | null;
};

export function toMarketModel(row: MarketModelRow): MarketModel {
  return MarketModelSchema.parse({
    id: row.id,
    packRevisionId: row.pack_revision_id,
    formulaSpec: MarketFormulaSpecSchema.parse(row.formula_spec_json),
    inputs: MarketInputsSchema.parse(row.inputs_json),
    computedResult:
      row.computed_result_json === null
        ? null
        : MarketComputedResultSchema.parse(row.computed_result_json),
    createdAt: row.created_at,
  });
}

function parseMarketModel(row: MarketModelRow): MarketModel {
  return toMarketModel(MarketModelRowSchema.parse(row));
}

export async function insertMarketModel(sql: Sql, input: InsertMarketModel): Promise<MarketModel> {
  const rows = await sql<MarketModelRow[]>`
    insert into market_models (
      pack_revision_id,
      formula_spec_json,
      inputs_json,
      computed_result_json
    )
    values (
      ${input.packRevisionId},
      ${jsonParam(sql, input.formulaSpec)},
      ${jsonParam(sql, input.inputs)},
      ${
        input.computedResult === undefined || input.computedResult === null
          ? null
          : jsonParam(sql, input.computedResult)
      }
    )
    returning *
  `;
  return parseMarketModel(requireRow(rows, 'insertMarketModel'));
}

export async function listMarketModelsByPackRevisionId(
  sql: Sql,
  packRevisionId: PackRevisionId,
): Promise<MarketModel[]> {
  const rows = await sql<MarketModelRow[]>`
    select * from market_models
    where pack_revision_id = ${packRevisionId}
    order by created_at desc
  `;
  return rows.map(parseMarketModel);
}
