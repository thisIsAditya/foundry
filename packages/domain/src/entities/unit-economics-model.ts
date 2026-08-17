import { z } from 'zod';

import { MoneyRulesIdSchema, PackRevisionIdSchema, UnitEconomicsModelIdSchema } from '../ids.js';
import {
  InstantSchema,
  DecimalStringSchema,
  IsoCurrencySchema,
} from '../value-objects/primitives.js';

export const UnitEconomicsResultSchema = z.object({
  price: DecimalStringSchema,
  cogs: DecimalStringSchema,
  variableCostPerUnit: DecimalStringSchema,
  contribution: DecimalStringSchema,
  grossMargin: DecimalStringSchema,
  cac: DecimalStringSchema,
  ltv: DecimalStringSchema,
  paybackPeriods: DecimalStringSchema.nullable(),
  ltvCac: DecimalStringSchema.nullable(),
  currency: IsoCurrencySchema,
  formula: z.string().min(1),
  warnings: z.array(z.string()),
});
export type UnitEconomicsResult = z.infer<typeof UnitEconomicsResultSchema>;

export const SensitivityShockSchema = z.object({
  input: z.enum(['price', 'cac', 'lifetimePeriods', 'cogs']),
  deltaPercent: DecimalStringSchema,
  result: UnitEconomicsResultSchema,
});
export type SensitivityShock = z.infer<typeof SensitivityShockSchema>;

export const SensitivityResultSchema = z.object({
  base: UnitEconomicsResultSchema,
  shocks: z.array(SensitivityShockSchema),
});
export type SensitivityResult = z.infer<typeof SensitivityResultSchema>;

export const UnitEconomicsModelSchema = z.object({
  id: UnitEconomicsModelIdSchema,
  packRevisionId: PackRevisionIdSchema,
  moneyRulesId: MoneyRulesIdSchema,
  margin: UnitEconomicsResultSchema.nullable().default(null),
  cac: DecimalStringSchema.nullable().default(null),
  ltv: DecimalStringSchema.nullable().default(null),
  payback: DecimalStringSchema.nullable().default(null),
  sensitivity: SensitivityResultSchema.nullable().default(null),
  createdAt: InstantSchema,
});
export type UnitEconomicsModel = z.infer<typeof UnitEconomicsModelSchema>;
