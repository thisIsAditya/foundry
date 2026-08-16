import { z } from 'zod';

import { BusinessModelIdSchema, OfferIdSchema } from '../ids.js';
import { InstantSchema } from '../value-objects/primitives.js';
import { MoneyAmountSchema } from '../value-objects/money-amount.js';

export const OfferSchema = z.object({
  id: OfferIdSchema,
  businessModelId: BusinessModelIdSchema,
  promise: z.string().min(1),
  packageDescription: z.string().min(1),
  price: MoneyAmountSchema.nullable().default(null),
  createdAt: InstantSchema,
});
export type Offer = z.infer<typeof OfferSchema>;
