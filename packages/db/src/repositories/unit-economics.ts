import {
  MoneyRulesIdSchema,
  PackRevisionIdSchema,
  SensitivityResultSchema,
  UnitEconomicsModelIdSchema,
  UnitEconomicsModelSchema,
  UnitEconomicsResultSchema,
  type MoneyRulesId,
  type PackRevisionId,
  type SensitivityResult,
  type UnitEconomicsModel,
  type UnitEconomicsResult,
} from '@foundry/domain';
import { z } from 'zod';

import type { Sql } from '../client.js';
import { jsonParam } from '../json.js';
import { nullableNumericToString } from '../numeric.js';
import { requireRow } from '../require-row.js';

const UnitEconomicsRowSchema = z.object({
  id: UnitEconomicsModelIdSchema,
  pack_revision_id: PackRevisionIdSchema,
  money_rules_id: MoneyRulesIdSchema,
  margin_json: z.unknown().nullable(),
  cac: z.unknown().nullable(),
  ltv: z.unknown().nullable(),
  payback: z.unknown().nullable(),
  sensitivity_json: z.unknown().nullable(),
  created_at: z.coerce.date(),
});

type UnitEconomicsRow = z.infer<typeof UnitEconomicsRowSchema>;

export type InsertUnitEconomicsModel = {
  packRevisionId: PackRevisionId;
  moneyRulesId: MoneyRulesId;
  margin: UnitEconomicsResult;
  sensitivity: SensitivityResult;
};

export function toUnitEconomicsModel(row: UnitEconomicsRow): UnitEconomicsModel {
  return UnitEconomicsModelSchema.parse({
    id: row.id,
    packRevisionId: row.pack_revision_id,
    moneyRulesId: row.money_rules_id,
    margin: row.margin_json === null ? null : UnitEconomicsResultSchema.parse(row.margin_json),
    cac: nullableNumericToString(row.cac),
    ltv: nullableNumericToString(row.ltv),
    payback: nullableNumericToString(row.payback),
    sensitivity:
      row.sensitivity_json === null ? null : SensitivityResultSchema.parse(row.sensitivity_json),
    createdAt: row.created_at,
  });
}

function parseUnitEconomics(row: UnitEconomicsRow): UnitEconomicsModel {
  return toUnitEconomicsModel(UnitEconomicsRowSchema.parse(row));
}

export async function insertUnitEconomicsModel(
  sql: Sql,
  input: InsertUnitEconomicsModel,
): Promise<UnitEconomicsModel> {
  const rows = await sql<UnitEconomicsRow[]>`
    insert into unit_economics_models (
      pack_revision_id,
      money_rules_id,
      margin_json,
      cac,
      ltv,
      payback,
      sensitivity_json
    )
    values (
      ${input.packRevisionId},
      ${input.moneyRulesId},
      ${jsonParam(sql, input.margin)},
      ${input.margin.cac},
      ${input.margin.ltv},
      ${input.margin.paybackPeriods},
      ${jsonParam(sql, input.sensitivity)}
    )
    returning *
  `;
  return parseUnitEconomics(requireRow(rows, 'insertUnitEconomicsModel'));
}

export async function listUnitEconomicsByPackRevisionId(
  sql: Sql,
  packRevisionId: PackRevisionId,
): Promise<UnitEconomicsModel[]> {
  const rows = await sql<UnitEconomicsRow[]>`
    select * from unit_economics_models
    where pack_revision_id = ${packRevisionId}
    order by created_at desc
  `;
  return rows.map(parseUnitEconomics);
}
