import { z } from 'zod';

import { AssumptionIdSchema, SourceIdSchema } from '../ids.js';
import { ConfidenceSchema } from './confidence.js';
import { DecimalStringSchema, IsoCurrencySchema } from './primitives.js';
import { ProvenanceSchema } from './provenance.js';

export const NumericClaimSchema = z.object({
  value: DecimalStringSchema,
  unit: z.string().min(1),
  currency: IsoCurrencySchema.optional(),
  formulaRef: z.string().optional(),
  provenance: ProvenanceSchema,
  sourceIds: z.array(SourceIdSchema),
  assumptionIds: z.array(AssumptionIdSchema),
  confidence: ConfidenceSchema,
});
export type NumericClaim = z.infer<typeof NumericClaimSchema>;
