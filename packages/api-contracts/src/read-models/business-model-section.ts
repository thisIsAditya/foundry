import { BusinessModelSectionKeySchema, BusinessModelSectionStatusSchema } from '@foundry/domain';
import { z } from 'zod';

export const BusinessModelSectionCardSchema = z.object({
  key: BusinessModelSectionKeySchema,
  title: z.string().min(1),
  summary: z.string(),
  status: BusinessModelSectionStatusSchema,
  scoreContribution: z.number().nullable(),
  knownFacts: z.array(z.string()),
  assumptions: z.array(z.string()),
  citations: z.array(z.string()),
  lastUpdatedAt: z.coerce.date().nullable(),
  nextAction: z.string().min(1),
});
export type BusinessModelSectionCard = z.infer<typeof BusinessModelSectionCardSchema>;
