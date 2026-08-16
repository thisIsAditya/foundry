import { z } from 'zod';

import { DecimalStringSchema, InstantSchema, IsoCurrencySchema } from './primitives.js';

export const MoneyAmountSchema = z.object({
  amount: DecimalStringSchema,
  currency: IsoCurrencySchema,
  taxIncluded: z.boolean(),
  effectiveDate: InstantSchema,
});
export type MoneyAmount = z.infer<typeof MoneyAmountSchema>;
