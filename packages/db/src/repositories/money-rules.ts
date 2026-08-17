import {
  BillingFrequencySchema,
  CostStructureSchema,
  MoneyRulesIdSchema,
  MoneyRulesSchema,
  PackRevisionIdSchema,
  ProjectIdSchema,
  type BillingFrequency,
  type CostStructure,
  type MoneyRules,
  type PackRevisionId,
  type ProjectId,
} from '@foundry/domain';
import { z } from 'zod';

import type { Sql } from '../client.js';
import { jsonParam } from '../json.js';
import { numericToString } from '../numeric.js';
import { requireRow } from '../require-row.js';

const MoneyRulesRowSchema = z.object({
  id: MoneyRulesIdSchema,
  project_id: ProjectIdSchema,
  pack_revision_id: PackRevisionIdSchema,
  currency: z.string(),
  unit_of_sale: z.string(),
  price: z.unknown(),
  billing_frequency: BillingFrequencySchema.nullable(),
  cost_structure_json: z.unknown(),
  is_current: z.boolean(),
  created_at: z.coerce.date(),
});

type MoneyRulesRow = z.infer<typeof MoneyRulesRowSchema>;

export type InsertMoneyRules = {
  projectId: ProjectId;
  packRevisionId: PackRevisionId;
  currency: string;
  unitOfSale: string;
  price: string;
  billingFrequency?: BillingFrequency | null;
  costStructure: CostStructure;
};

export function toMoneyRules(row: MoneyRulesRow): MoneyRules {
  return MoneyRulesSchema.parse({
    id: row.id,
    projectId: row.project_id,
    packRevisionId: row.pack_revision_id,
    currency: row.currency,
    unitOfSale: row.unit_of_sale,
    price: numericToString(row.price),
    billingFrequency: row.billing_frequency,
    costStructure: CostStructureSchema.parse(row.cost_structure_json),
    isCurrent: row.is_current,
    createdAt: row.created_at,
  });
}

function parseMoneyRules(row: MoneyRulesRow): MoneyRules {
  return toMoneyRules(MoneyRulesRowSchema.parse(row));
}

export async function insertCurrentMoneyRules(
  sql: Sql,
  input: InsertMoneyRules,
): Promise<MoneyRules> {
  await sql`
    update money_rules
    set is_current = false
    where project_id = ${input.projectId} and is_current
  `;
  const rows = await sql<MoneyRulesRow[]>`
    insert into money_rules (
      project_id,
      pack_revision_id,
      currency,
      unit_of_sale,
      price,
      billing_frequency,
      cost_structure_json,
      is_current
    )
    values (
      ${input.projectId},
      ${input.packRevisionId},
      ${input.currency},
      ${input.unitOfSale},
      ${input.price},
      ${input.billingFrequency ?? null},
      ${jsonParam(sql, input.costStructure)},
      true
    )
    returning *
  `;
  return parseMoneyRules(requireRow(rows, 'insertCurrentMoneyRules'));
}

export async function getCurrentMoneyRules(
  sql: Sql,
  projectId: ProjectId,
): Promise<MoneyRules | null> {
  const rows = await sql<MoneyRulesRow[]>`
    select * from money_rules where project_id = ${projectId} and is_current limit 1
  `;
  const row = rows[0];
  return row === undefined ? null : parseMoneyRules(row);
}
