export {
  ContentBlockSchema,
  ProjectSchema,
  SourceSchema,
  WorkspaceSchema,
  type ContentBlock,
  type Project,
  type Source,
  type Workspace,
} from '@foundry/domain';
export {
  DeskSummarySchema,
  GateAProgressSchema,
  OverviewSummarySchema,
  type DeskSummary,
  type GateAProgress,
  type OverviewSummary,
} from './desk-summary.js';
export { AiJobSummarySchema, type AiJobSummary } from './ai-job-summary.js';
export { toAiJobSummary } from './to-ai-job-summary.js';
export {
  BusinessModelSectionCardSchema,
  type BusinessModelSectionCard,
} from './business-model-section.js';
export {
  ChangeSummarySchema,
  CofounderTurnSchema,
  JourneyMapSchema,
  JourneyMapStageSchema,
  JourneyOverviewSchema,
  ProposalDetailSchema,
  ReadinessSignalSchema,
  RecordExportSchema,
  RecordSectionCardSchema,
  RecordSectionDetailSchema,
  type ChangeSummary,
  type CofounderTurn,
  type JourneyMap,
  type JourneyMapStage,
  type JourneyOverview,
  type ProposalDetail,
  type ReadinessKind,
  type ReadinessSignalContract,
  type RecordExport,
  type RecordSectionCard,
  type RecordSectionDetail,
} from './journey.js';
