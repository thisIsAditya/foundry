import { PackRevisionIdSchema, ProjectSchema } from '@foundry/domain';
import { z } from 'zod';

export const DeskSummarySchema = z.object({
  project: ProjectSchema,
  packRevisionId: PackRevisionIdSchema.nullable(),
  phase: ProjectSchema.shape.currentPhase,
  interviewCount: z.number().int().nonnegative(),
  staleArtifactCount: z.number().int().nonnegative(),
  moneyRulesSet: z.boolean(),
  nextAction: z.string().min(1),
});
export type DeskSummary = z.infer<typeof DeskSummarySchema>;
