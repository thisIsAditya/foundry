import { z } from 'zod';

import {
  AlternativeIdSchema,
  AssumptionIdSchema,
  EvidenceItemIdSchema,
  PackRevisionIdSchema,
  WedgeIdSchema,
} from '../ids.js';
import { InstantSchema } from '../value-objects/primitives.js';

export const WedgeSchema = z.object({
  id: WedgeIdSchema,
  packRevisionId: PackRevisionIdSchema,
  statement: z.string().min(1),
  alternativeIds: z.array(AlternativeIdSchema),
  evidenceItemIds: z.array(EvidenceItemIdSchema),
  assumptionIds: z.array(AssumptionIdSchema),
  createdAt: InstantSchema,
});
export type Wedge = z.infer<typeof WedgeSchema>;
