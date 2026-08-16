import { z } from 'zod';

import { DecimalStringSchema, IsoCurrencySchema } from './primitives.js';

export const CostEstimateSchema = z.object({
  provider: z.string().min(1),
  modelOrTool: z.string().min(1),
  inputEstimate: DecimalStringSchema,
  outputEstimate: DecimalStringSchema,
  currency: IsoCurrencySchema,
  uncertainty: z.string().min(1),
});
export type CostEstimate = z.infer<typeof CostEstimateSchema>;
