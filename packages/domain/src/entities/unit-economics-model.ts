import { z } from 'zod';

import { MoneyRulesIdSchema, PackRevisionIdSchema, UnitEconomicsModelIdSchema } from '../ids.js';
import { InstantSchema } from '../value-objects/primitives.js';

export const UnitEconomicsModelSchema = z.object({
  id: UnitEconomicsModelIdSchema,
  packRevisionId: PackRevisionIdSchema,
  moneyRulesId: MoneyRulesIdSchema,
  margin: z.unknown().nullable().default(null),
  cac: z.unknown().nullable().default(null),
  ltv: z.unknown().nullable().default(null),
  payback: z.unknown().nullable().default(null),
  sensitivity: z.unknown().nullable().default(null),
  createdAt: InstantSchema,
});
export type UnitEconomicsModel = z.infer<typeof UnitEconomicsModelSchema>;
