import { z } from 'zod';

import { MoneyRulesIdSchema, PackRevisionIdSchema, ProjectIdSchema } from '../ids.js';
import {
  DecimalStringSchema,
  InstantSchema,
  IsoCurrencySchema,
} from '../value-objects/primitives.js';

export const MoneyRulesSchema = z.object({
  id: MoneyRulesIdSchema,
  projectId: ProjectIdSchema,
  packRevisionId: PackRevisionIdSchema,
  currency: IsoCurrencySchema,
  unitOfSale: z.string().min(1),
  price: DecimalStringSchema,
  billingFrequency: z.string().nullable().default(null),
  costStructure: z.unknown(),
  isCurrent: z.boolean(),
  createdAt: InstantSchema,
});
export type MoneyRules = z.infer<typeof MoneyRulesSchema>;
