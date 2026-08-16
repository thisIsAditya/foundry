import { z } from 'zod';

import { MarketModelIdSchema, PackRevisionIdSchema } from '../ids.js';
import { InstantSchema } from '../value-objects/primitives.js';

export const MarketModelSchema = z.object({
  id: MarketModelIdSchema,
  packRevisionId: PackRevisionIdSchema,
  formulaSpec: z.unknown(),
  inputs: z.unknown(),
  computedResult: z.unknown().nullable().default(null),
  createdAt: InstantSchema,
});
export type MarketModel = z.infer<typeof MarketModelSchema>;
