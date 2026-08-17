import {
  BusinessModelIdSchema,
  BusinessModelSchema,
  MoneyRulesIdSchema,
  PackRevisionIdSchema,
  type BusinessModel,
  type PackRevisionId,
} from '@foundry/domain';
import { z } from 'zod';

import type { Sql } from '../client.js';
import { requireRow } from '../require-row.js';

const BusinessModelRowSchema = z.object({
  id: BusinessModelIdSchema,
  pack_revision_id: PackRevisionIdSchema,
  money_rules_id: MoneyRulesIdSchema,
  who_receives_value: z.string(),
  who_pays: z.string(),
  unit_of_sale: z.string(),
  delivery_mechanism: z.string(),
  revenue_pattern: z.string(),
  created_at: z.coerce.date(),
});

type BusinessModelRow = z.infer<typeof BusinessModelRowSchema>;

export type InsertBusinessModel = {
  packRevisionId: PackRevisionId;
  moneyRulesId: z.infer<typeof MoneyRulesIdSchema>;
  whoReceivesValue: string;
  whoPays: string;
  unitOfSale: string;
  deliveryMechanism: string;
  revenuePattern: string;
};

export function toBusinessModel(row: BusinessModelRow): BusinessModel {
  return BusinessModelSchema.parse({
    id: row.id,
    packRevisionId: row.pack_revision_id,
    moneyRulesId: row.money_rules_id,
    whoReceivesValue: row.who_receives_value,
    whoPays: row.who_pays,
    unitOfSale: row.unit_of_sale,
    deliveryMechanism: row.delivery_mechanism,
    revenuePattern: row.revenue_pattern,
    createdAt: row.created_at,
  });
}

function parseBusinessModel(row: BusinessModelRow): BusinessModel {
  return toBusinessModel(BusinessModelRowSchema.parse(row));
}

export async function insertBusinessModel(
  sql: Sql,
  input: InsertBusinessModel,
): Promise<BusinessModel> {
  const rows = await sql<BusinessModelRow[]>`
    insert into business_models (
      pack_revision_id,
      money_rules_id,
      who_receives_value,
      who_pays,
      unit_of_sale,
      delivery_mechanism,
      revenue_pattern
    )
    values (
      ${input.packRevisionId},
      ${input.moneyRulesId},
      ${input.whoReceivesValue},
      ${input.whoPays},
      ${input.unitOfSale},
      ${input.deliveryMechanism},
      ${input.revenuePattern}
    )
    returning *
  `;
  return parseBusinessModel(requireRow(rows, 'insertBusinessModel'));
}

export async function listBusinessModelsByPackRevisionId(
  sql: Sql,
  packRevisionId: PackRevisionId,
): Promise<BusinessModel[]> {
  const rows = await sql<BusinessModelRow[]>`
    select * from business_models where pack_revision_id = ${packRevisionId} order by created_at asc
  `;
  return rows.map(parseBusinessModel);
}
