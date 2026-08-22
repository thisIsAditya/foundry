import {
  ActivityEventSchema,
  CofounderInteractionTypeSchema,
  CofounderOperationSchema,
  JourneySchema,
  JourneyStageSchema,
  JourneyStageStatusSchema,
  JourneyStepSchema,
  ProjectIdSchema,
  ProposalChangeSchema,
  ProposalSchema,
  ReadinessKinds,
  RecordItemSchema,
  RecordProvenanceSchema,
  RecordSectionKeySchema,
  type ReadinessKind,
} from '@foundry/domain';
import { z } from 'zod';

export const ReadinessSignalSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(ReadinessKinds),
  section: RecordSectionKeySchema,
  title: z.string().min(1),
  explanation: z.string().min(1),
  smallestAction: z.string().min(1),
});
export type ReadinessSignalContract = z.infer<typeof ReadinessSignalSchema>;
export type { ReadinessKind };

export const ChangeSummarySchema = z.object({
  title: z.string().min(1),
  explanation: z.string().min(1),
  occurredAt: z.coerce.date(),
  nextContinuation: z.string().min(1),
});
export type ChangeSummary = z.infer<typeof ChangeSummarySchema>;

export const JourneyOverviewSchema = z.object({
  projectId: ProjectIdSchema,
  journey: JourneySchema,
  stageLabel: z.string().min(1),
  stageStatus: JourneyStageStatusSchema,
  founderContext: z.string().nullable(),
  recommendedStep: JourneyStepSchema.nullable(),
  alternativeSteps: z.array(JourneyStepSchema),
  pendingProposals: z.array(ProposalSchema),
  changeSummary: ChangeSummarySchema.nullable(),
  activeSteps: z.array(JourneyStepSchema),
  deferredSteps: z.array(JourneyStepSchema),
  blockedSteps: z.array(JourneyStepSchema),
  readiness: z.array(ReadinessSignalSchema),
  activity: z.array(ActivityEventSchema),
});
export type JourneyOverview = z.infer<typeof JourneyOverviewSchema>;

export const JourneyMapStageSchema = z.object({
  stage: JourneyStageSchema,
  label: z.string().min(1),
  founderQuestion: z.string().min(1),
  primaryOutcome: z.string().min(1),
  status: JourneyStageStatusSchema,
  goal: z.string().nullable(),
  outcome: z.string().nullable(),
  steps: z.array(JourneyStepSchema),
  blockers: z.array(z.string()),
  revisitConsequence: z.string().min(1),
});
export type JourneyMapStage = z.infer<typeof JourneyMapStageSchema>;

export const JourneyMapSchema = z.object({
  projectId: ProjectIdSchema,
  journey: JourneySchema,
  stages: z.array(JourneyMapStageSchema),
});
export type JourneyMap = z.infer<typeof JourneyMapSchema>;

export const RecordSectionCardSchema = z.object({
  section: RecordSectionKeySchema,
  label: z.string().min(1),
  item: RecordItemSchema,
  smallestAction: z.string().min(1),
  staleReasons: z.array(z.string()),
});
export type RecordSectionCard = z.infer<typeof RecordSectionCardSchema>;

export const RecordSectionDetailSchema = z.object({
  section: RecordSectionKeySchema,
  label: z.string().min(1),
  item: RecordItemSchema,
  provenance: RecordProvenanceSchema,
  versionNumber: z.number().int().nullable(),
  linkedEvidence: z.array(z.object({ id: z.string(), summary: z.string() })),
  linkedDecisions: z.array(z.object({ id: z.string(), statement: z.string() })),
  staleReasons: z.array(z.string()),
  smallestAction: z.string().min(1),
  pendingProposal: ProposalSchema.nullable(),
});
export type RecordSectionDetail = z.infer<typeof RecordSectionDetailSchema>;

export const ProposalDetailSchema = z.object({
  proposal: ProposalSchema,
  changes: z.array(ProposalChangeSchema),
  affectedSections: z.array(RecordSectionKeySchema),
});
export type ProposalDetail = z.infer<typeof ProposalDetailSchema>;

export const CofounderTurnSchema = z.object({
  explanation: z.string().min(1),
  interactionType: CofounderInteractionTypeSchema,
  references: z.array(z.object({ kind: z.string(), id: z.string() })),
  facts: z
    .array(
      z.object({
        statement: z.string().min(1),
        references: z.array(z.object({ kind: z.string(), id: z.string() })),
      }),
    )
    .default([]),
  interpretation: z.string().default(''),
  assumptions: z.array(z.string()).default([]),
  recommendation: z.string().optional(),
  uncertainty: z.string(),
  blockedConditions: z.array(z.string()),
  activity: z.string(),
  proposalId: z.string().uuid().nullable(),
  stepId: z.string().uuid().nullable(),
  operation: CofounderOperationSchema.nullable(),
});
export type CofounderTurn = z.infer<typeof CofounderTurnSchema>;

export const RecordExportSchema = z.object({
  projectId: ProjectIdSchema,
  versionNumber: z.number().int().nullable(),
  exportedAt: z.coerce.date(),
  currentStage: JourneyStageSchema,
  sections: z.array(RecordSectionCardSchema),
  uncertainty: z.array(z.string()),
});
export type RecordExport = z.infer<typeof RecordExportSchema>;
