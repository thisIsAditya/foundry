import { z } from 'zod';

import { PackRevisionIdSchema, PlanScoreIdSchema } from '../ids.js';
import {
  DimensionScoreSchema,
  ScoreDimensionSchema,
  ScoreImprovementActionSchema,
  ScoreReasonSchema,
} from '../status/score-dimension.js';
import { InstantSchema } from '../value-objects/primitives.js';

export const PlanScoreSchema = z.object({
  id: PlanScoreIdSchema,
  packRevisionId: PackRevisionIdSchema,
  overall: z.number().min(0).max(100),
  dimensions: z.record(ScoreDimensionSchema, DimensionScoreSchema),
  ruleVersion: z.string().min(1),
  reasons: z.array(ScoreReasonSchema),
  topActions: z.array(ScoreImprovementActionSchema),
  calculatedAt: InstantSchema,
});
export type PlanScore = z.infer<typeof PlanScoreSchema>;
