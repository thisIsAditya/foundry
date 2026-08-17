import { z } from 'zod';

function brandedUuid<Brand extends string>(brand: Brand) {
  return z.uuid().brand(brand);
}

export const UserIdSchema = brandedUuid('UserId');
export type UserId = z.infer<typeof UserIdSchema>;

export const WorkspaceIdSchema = brandedUuid('WorkspaceId');
export type WorkspaceId = z.infer<typeof WorkspaceIdSchema>;

export const WorkspaceMembershipIdSchema = brandedUuid('WorkspaceMembershipId');
export type WorkspaceMembershipId = z.infer<typeof WorkspaceMembershipIdSchema>;

export const ProjectIdSchema = brandedUuid('ProjectId');
export type ProjectId = z.infer<typeof ProjectIdSchema>;

export const ProjectMembershipIdSchema = brandedUuid('ProjectMembershipId');
export type ProjectMembershipId = z.infer<typeof ProjectMembershipIdSchema>;

export const WorkspacePolicyIdSchema = brandedUuid('WorkspacePolicyId');
export type WorkspacePolicyId = z.infer<typeof WorkspacePolicyIdSchema>;

export const NotificationEndpointIdSchema = brandedUuid('NotificationEndpointId');
export type NotificationEndpointId = z.infer<typeof NotificationEndpointIdSchema>;

export const PackRevisionIdSchema = brandedUuid('PackRevisionId');
export type PackRevisionId = z.infer<typeof PackRevisionIdSchema>;

export const PackSectionIdSchema = brandedUuid('PackSectionId');
export type PackSectionId = z.infer<typeof PackSectionIdSchema>;

export const PhaseIdSchema = brandedUuid('PhaseId');
export type PhaseId = z.infer<typeof PhaseIdSchema>;

export const ProblemIdSchema = brandedUuid('ProblemId');
export type ProblemId = z.infer<typeof ProblemIdSchema>;

export const BeachheadIdSchema = brandedUuid('BeachheadId');
export type BeachheadId = z.infer<typeof BeachheadIdSchema>;

export const PersonaIdSchema = brandedUuid('PersonaId');
export type PersonaId = z.infer<typeof PersonaIdSchema>;

export const DmuIdSchema = brandedUuid('DmuId');
export type DmuId = z.infer<typeof DmuIdSchema>;

export const AlternativeIdSchema = brandedUuid('AlternativeId');
export type AlternativeId = z.infer<typeof AlternativeIdSchema>;

export const CompetitorIdSchema = brandedUuid('CompetitorId');
export type CompetitorId = z.infer<typeof CompetitorIdSchema>;

export const WedgeIdSchema = brandedUuid('WedgeId');
export type WedgeId = z.infer<typeof WedgeIdSchema>;

export const MarketModelIdSchema = brandedUuid('MarketModelId');
export type MarketModelId = z.infer<typeof MarketModelIdSchema>;

export const BusinessModelIdSchema = brandedUuid('BusinessModelId');
export type BusinessModelId = z.infer<typeof BusinessModelIdSchema>;

export const MoneyRulesIdSchema = brandedUuid('MoneyRulesId');
export type MoneyRulesId = z.infer<typeof MoneyRulesIdSchema>;

export const UnitEconomicsModelIdSchema = brandedUuid('UnitEconomicsModelId');
export type UnitEconomicsModelId = z.infer<typeof UnitEconomicsModelIdSchema>;

export const OfferIdSchema = brandedUuid('OfferId');
export type OfferId = z.infer<typeof OfferIdSchema>;

export const SourceIdSchema = brandedUuid('SourceId');
export type SourceId = z.infer<typeof SourceIdSchema>;

export const SourceSnapshotIdSchema = brandedUuid('SourceSnapshotId');
export type SourceSnapshotId = z.infer<typeof SourceSnapshotIdSchema>;

export const DocumentIdSchema = brandedUuid('DocumentId');
export type DocumentId = z.infer<typeof DocumentIdSchema>;

export const ContentBlockIdSchema = brandedUuid('ContentBlockId');
export type ContentBlockId = z.infer<typeof ContentBlockIdSchema>;

export const CitationIdSchema = brandedUuid('CitationId');
export type CitationId = z.infer<typeof CitationIdSchema>;

export const EvidenceItemIdSchema = brandedUuid('EvidenceItemId');
export type EvidenceItemId = z.infer<typeof EvidenceItemIdSchema>;

export const InterviewIdSchema = brandedUuid('InterviewId');
export type InterviewId = z.infer<typeof InterviewIdSchema>;

export const QuoteIdSchema = brandedUuid('QuoteId');
export type QuoteId = z.infer<typeof QuoteIdSchema>;

export const AssumptionIdSchema = brandedUuid('AssumptionId');
export type AssumptionId = z.infer<typeof AssumptionIdSchema>;

export const ExperimentIdSchema = brandedUuid('ExperimentId');
export type ExperimentId = z.infer<typeof ExperimentIdSchema>;

export const WtpEventIdSchema = brandedUuid('WtpEventId');
export type WtpEventId = z.infer<typeof WtpEventIdSchema>;

export const MetricDefinitionIdSchema = brandedUuid('MetricDefinitionId');
export type MetricDefinitionId = z.infer<typeof MetricDefinitionIdSchema>;

export const MetricObservationIdSchema = brandedUuid('MetricObservationId');
export type MetricObservationId = z.infer<typeof MetricObservationIdSchema>;

export const SprintIdSchema = brandedUuid('SprintId');
export type SprintId = z.infer<typeof SprintIdSchema>;

export const SprintContractIdSchema = brandedUuid('SprintContractId');
export type SprintContractId = z.infer<typeof SprintContractIdSchema>;

export const TaskLedgerIdSchema = brandedUuid('TaskLedgerId');
export type TaskLedgerId = z.infer<typeof TaskLedgerIdSchema>;

export const ProgressLedgerEntryIdSchema = brandedUuid('ProgressLedgerEntryId');
export type ProgressLedgerEntryId = z.infer<typeof ProgressLedgerEntryIdSchema>;

export const AgentDefinitionIdSchema = brandedUuid('AgentDefinitionId');
export type AgentDefinitionId = z.infer<typeof AgentDefinitionIdSchema>;

export const AgentRunIdSchema = brandedUuid('AgentRunId');
export type AgentRunId = z.infer<typeof AgentRunIdSchema>;

export const ProposedChangeIdSchema = brandedUuid('ProposedChangeId');
export type ProposedChangeId = z.infer<typeof ProposedChangeIdSchema>;

export const DecisionIdSchema = brandedUuid('DecisionId');
export type DecisionId = z.infer<typeof DecisionIdSchema>;

export const GateIdSchema = brandedUuid('GateId');
export type GateId = z.infer<typeof GateIdSchema>;

export const ApprovalRequestIdSchema = brandedUuid('ApprovalRequestId');
export type ApprovalRequestId = z.infer<typeof ApprovalRequestIdSchema>;

export const PolicyIdSchema = brandedUuid('PolicyId');
export type PolicyId = z.infer<typeof PolicyIdSchema>;

export const BudgetLedgerEntryIdSchema = brandedUuid('BudgetLedgerEntryId');
export type BudgetLedgerEntryId = z.infer<typeof BudgetLedgerEntryIdSchema>;

export const UsageRecordIdSchema = brandedUuid('UsageRecordId');
export type UsageRecordId = z.infer<typeof UsageRecordIdSchema>;

export const ArtifactIdSchema = brandedUuid('ArtifactId');
export type ArtifactId = z.infer<typeof ArtifactIdSchema>;

export const ArtifactVersionIdSchema = brandedUuid('ArtifactVersionId');
export type ArtifactVersionId = z.infer<typeof ArtifactVersionIdSchema>;

export const RenderJobIdSchema = brandedUuid('RenderJobId');
export type RenderJobId = z.infer<typeof RenderJobIdSchema>;

export const TemplateIdSchema = brandedUuid('TemplateId');
export type TemplateId = z.infer<typeof TemplateIdSchema>;

export const ProviderConnectionIdSchema = brandedUuid('ProviderConnectionId');
export type ProviderConnectionId = z.infer<typeof ProviderConnectionIdSchema>;

export const ModelProfileIdSchema = brandedUuid('ModelProfileId');
export type ModelProfileId = z.infer<typeof ModelProfileIdSchema>;

export const IntegrationConnectionIdSchema = brandedUuid('IntegrationConnectionId');
export type IntegrationConnectionId = z.infer<typeof IntegrationConnectionIdSchema>;

export const UserMcpServerIdSchema = brandedUuid('UserMcpServerId');
export type UserMcpServerId = z.infer<typeof UserMcpServerIdSchema>;

export const ToolDefinitionIdSchema = brandedUuid('ToolDefinitionId');
export type ToolDefinitionId = z.infer<typeof ToolDefinitionIdSchema>;

export const ToolCallIdSchema = brandedUuid('ToolCallId');
export type ToolCallId = z.infer<typeof ToolCallIdSchema>;

export const ConversationMessageIdSchema = brandedUuid('ConversationMessageId');
export type ConversationMessageId = z.infer<typeof ConversationMessageIdSchema>;

export const ConversationSummaryIdSchema = brandedUuid('ConversationSummaryId');
export type ConversationSummaryId = z.infer<typeof ConversationSummaryIdSchema>;

export const FounderPreferenceIdSchema = brandedUuid('FounderPreferenceId');
export type FounderPreferenceId = z.infer<typeof FounderPreferenceIdSchema>;

export const FounderTaskIdSchema = brandedUuid('FounderTaskId');
export type FounderTaskId = z.infer<typeof FounderTaskIdSchema>;

export const ResearchFindingIdSchema = brandedUuid('ResearchFindingId');
export type ResearchFindingId = z.infer<typeof ResearchFindingIdSchema>;

export const PlanScoreIdSchema = brandedUuid('PlanScoreId');
export type PlanScoreId = z.infer<typeof PlanScoreIdSchema>;
