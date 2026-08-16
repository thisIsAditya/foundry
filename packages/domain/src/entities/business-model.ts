import { z } from 'zod';

import { BusinessModelIdSchema, MoneyRulesIdSchema, PackRevisionIdSchema } from '../ids.js';
import { InstantSchema } from '../value-objects/primitives.js';

export const BusinessModelSchema = z.object({
  id: BusinessModelIdSchema,
  packRevisionId: PackRevisionIdSchema,
  moneyRulesId: MoneyRulesIdSchema,
  whoReceivesValue: z.string().min(1),
  whoPays: z.string().min(1),
  unitOfSale: z.string().min(1),
  deliveryMechanism: z.string().min(1),
  revenuePattern: z.string().min(1),
  createdAt: InstantSchema,
});
export type BusinessModel = z.infer<typeof BusinessModelSchema>;
