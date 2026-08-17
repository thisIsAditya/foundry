import {
  AiJobKindSchema,
  AiJobOwnerSchema,
  CostEstimateSchema,
  ProductJobStatusSchema,
} from '@foundry/domain';
import { z } from 'zod';

export const AiJobSummarySchema = z.object({
  id: z.string().min(1),
  objective: z.string().min(1),
  whyNow: z.string().min(1).optional(),
  roleLabel: z.string().min(1).optional(),
  owner: AiJobOwnerSchema,
  status: ProductJobStatusSchema,
  jobKind: AiJobKindSchema,
  sourceAndScope: z.object({
    sectionKeys: z.array(z.string()),
    sourcePolicy: z.unknown().optional(),
  }),
  estimatedCost: CostEstimateSchema.optional(),
  actualCost: CostEstimateSchema.optional(),
  citationCount: z.number().int().nonnegative(),
  changedSectionKeys: z.array(z.string()),
  founderActionRequired: z.string().min(1).optional(),
  progressPercent: z.number().min(0).max(100),
});
export type AiJobSummary = z.infer<typeof AiJobSummarySchema>;
