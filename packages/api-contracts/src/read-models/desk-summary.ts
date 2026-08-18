import {
  ConversationMessageSchema,
  DimensionScoreSchema,
  PackRevisionIdSchema,
  ProjectSchema,
  ScoreDimensionSchema,
} from '@foundry/domain';
import { z } from 'zod';

import { AiJobSummarySchema } from './ai-job-summary.js';

export const GateAProgressSchema = z.object({
  qualifyingInterviews: z.number().int().nonnegative(),
  requiredInterviews: z.number().int().nonnegative(),
  passed: z.boolean(),
});
export type GateAProgress = z.infer<typeof GateAProgressSchema>;

export const OverviewSummarySchema = z.object({
  overallScore: z.number().min(0).max(100).nullable(),
  dimensions: z.record(ScoreDimensionSchema, DimensionScoreSchema).nullable(),
  topAssumptions: z.array(z.string()),
  proposedResearchJob: AiJobSummarySchema.nullable(),
  runningAiWork: z.array(AiJobSummarySchema),
  waitingFounderTasks: z.number().int().nonnegative(),
  revisionPendingReview: z.boolean(),
  latestCofounderMessage: ConversationMessageSchema.nullable(),
});
export type OverviewSummary = z.infer<typeof OverviewSummarySchema>;

export const DeskSummarySchema = z.object({
  project: ProjectSchema,
  packRevisionId: PackRevisionIdSchema.nullable(),
  phase: ProjectSchema.shape.currentPhase,
  derivedPhase: ProjectSchema.shape.currentPhase,
  interviewCount: z.number().int().nonnegative(),
  staleArtifactCount: z.number().int().nonnegative(),
  moneyRulesSet: z.boolean(),
  nextAction: z.string().min(1),
  gateA: GateAProgressSchema,
  overview: OverviewSummarySchema,
});
export type DeskSummary = z.infer<typeof DeskSummarySchema>;
