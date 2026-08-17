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
