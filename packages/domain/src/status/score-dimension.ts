import { z } from 'zod';

export const ScoreDimensions = [
  'customer_clarity',
  'evidence_strength',
  'market_support',
  'business_economics',
  'willingness_to_pay',
  'execution_readiness',
  'risk_control',
] as const;
export const ScoreDimensionSchema = z.enum(ScoreDimensions);
export type ScoreDimension = z.infer<typeof ScoreDimensionSchema>;

export const ScoreDimensionWeights: Readonly<Record<ScoreDimension, number>> = {
  customer_clarity: 15,
  evidence_strength: 20,
  market_support: 15,
  business_economics: 15,
  willingness_to_pay: 15,
  execution_readiness: 10,
  risk_control: 10,
};

export const ScoreDimensionBasisSchema = z.enum(['known', 'insufficient_data']);
export type ScoreDimensionBasis = z.infer<typeof ScoreDimensionBasisSchema>;

export const DimensionScoreSchema = z.object({
  raw: z.number().min(0).max(5),
  weight: z.number().int().positive(),
  contribution: z.number(),
  basis: ScoreDimensionBasisSchema,
});
export type DimensionScore = z.infer<typeof DimensionScoreSchema>;

export const ScoreReasonSchema = z.object({
  dimension: ScoreDimensionSchema,
  message: z.string().min(1),
});
export type ScoreReason = z.infer<typeof ScoreReasonSchema>;

export const ScoreImprovementActionSchema = z.object({
  dimension: ScoreDimensionSchema,
  action: z.string().min(1),
  expectedImpact: z.number().optional(),
});
export type ScoreImprovementAction = z.infer<typeof ScoreImprovementActionSchema>;
