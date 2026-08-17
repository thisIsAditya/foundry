import { z } from 'zod';

import { MoneyRulesIdSchema, PackRevisionIdSchema, ProjectIdSchema } from '../ids.js';
import { BillingFrequencySchema } from '../status/money-status.js';
import {
  DecimalStringSchema,
  InstantSchema,
  IsoCurrencySchema,
} from '../value-objects/primitives.js';

export const CostStructureSchema = z.object({
  cogs: DecimalStringSchema,
  variableCostPerUnit: DecimalStringSchema,
  cac: DecimalStringSchema,
  lifetimePeriods: z.number().positive(),
});
export type CostStructure = z.infer<typeof CostStructureSchema>;

export const MoneyRulesSchema = z.object({
  id: MoneyRulesIdSchema,
  projectId: ProjectIdSchema,
  packRevisionId: PackRevisionIdSchema,
  currency: IsoCurrencySchema,
  unitOfSale: z.string().min(1),
  price: DecimalStringSchema,
  billingFrequency: BillingFrequencySchema.nullable().default(null),
  costStructure: CostStructureSchema,
  isCurrent: z.boolean(),
  createdAt: InstantSchema,
});
export type MoneyRules = z.infer<typeof MoneyRulesSchema>;
