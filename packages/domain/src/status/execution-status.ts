import { z } from 'zod';

export const SprintStatuses = [
  'draft',
  'contracted',
  'running',
  'paused',
  'stalled',
  'closed',
  'failed',
] as const;
export const SprintStatusSchema = z.enum(SprintStatuses);
export type SprintStatus = z.infer<typeof SprintStatusSchema>;

export const AgentRunStatuses = ['running', 'completed', 'failed'] as const;
export const AgentRunStatusSchema = z.enum(AgentRunStatuses);
export type AgentRunStatus = z.infer<typeof AgentRunStatusSchema>;

export const ProposedChangeStatuses = ['pending', 'accepted', 'rejected'] as const;
export const ProposedChangeStatusSchema = z.enum(ProposedChangeStatuses);
export type ProposedChangeStatus = z.infer<typeof ProposedChangeStatusSchema>;

export const GateTypes = ['gate_a', 'gate_b', 'gate_c'] as const;
export const GateTypeSchema = z.enum(GateTypes);
export type GateType = z.infer<typeof GateTypeSchema>;

export const GateResults = ['passed', 'failed', 'waived', 'deferred'] as const;
export const GateResultSchema = z.enum(GateResults);
export type GateResult = z.infer<typeof GateResultSchema>;

export const BudgetEntryTypes = ['reservation', 'usage', 'refund'] as const;
export const BudgetEntryTypeSchema = z.enum(BudgetEntryTypes);
export type BudgetEntryType = z.infer<typeof BudgetEntryTypeSchema>;

export const UsageResourceTypes = ['model', 'tool', 'storage', 'rendering'] as const;
export const UsageResourceTypeSchema = z.enum(UsageResourceTypes);
export type UsageResourceType = z.infer<typeof UsageResourceTypeSchema>;

export const ToolCallStatuses = ['proposed', 'approved', 'executed', 'blocked', 'failed'] as const;
export const ToolCallStatusSchema = z.enum(ToolCallStatuses);
export type ToolCallStatus = z.infer<typeof ToolCallStatusSchema>;

export const NotificationChannels = ['push', 'email', 'in_app'] as const;
export const NotificationChannelSchema = z.enum(NotificationChannels);
export type NotificationChannel = z.infer<typeof NotificationChannelSchema>;
