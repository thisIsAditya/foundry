import { z } from 'zod';

import { MarketModelIdSchema, PackRevisionIdSchema } from '../ids.js';
import {
  InstantSchema,
  DecimalStringSchema,
  IsoCurrencySchema,
} from '../value-objects/primitives.js';

export const MarketFormulaSpecSchema = z.object({
  kind: z.literal('bottom_up'),
  periodsPerYear: z.number().int().positive(),
});
export type MarketFormulaSpec = z.infer<typeof MarketFormulaSpecSchema>;

export const MarketInputsSchema = z.object({
  totalAccounts: DecimalStringSchema,
  servedAccounts: DecimalStringSchema,
  beachheadAccounts: DecimalStringSchema,
  unitsPerAccountPerPeriod: DecimalStringSchema,
  captureRate: DecimalStringSchema,
  currency: IsoCurrencySchema,
});
export type MarketInputs = z.infer<typeof MarketInputsSchema>;

export const MarketComputedResultSchema = z.object({
  tam: DecimalStringSchema,
  sam: DecimalStringSchema,
  som: DecimalStringSchema,
  volumeTam: DecimalStringSchema,
  volumeSam: DecimalStringSchema,
  volumeSom: DecimalStringSchema,
  price: DecimalStringSchema,
  currency: IsoCurrencySchema,
  formula: z.string().min(1),
  warnings: z.array(z.string()),
});
export type MarketComputedResult = z.infer<typeof MarketComputedResultSchema>;

export const MarketModelSchema = z.object({
  id: MarketModelIdSchema,
  packRevisionId: PackRevisionIdSchema,
  formulaSpec: MarketFormulaSpecSchema,
  inputs: MarketInputsSchema,
  computedResult: MarketComputedResultSchema.nullable().default(null),
  createdAt: InstantSchema,
});
export type MarketModel = z.infer<typeof MarketModelSchema>;
