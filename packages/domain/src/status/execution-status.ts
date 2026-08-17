import { z } from 'zod';

import { canTransition, nextStates } from './transition.js';

export const SprintStatuses = [
  'draft',
  'contracted',
  'running',
  'paused',
  'stalled',
  'closed',
  'failed',
  'proposed',
  'queued',
  'needs_founder',
  'needs_approval',
  'complete',
  'blocked',
  'canceled',
  'expired',
] as const;
export const SprintStatusSchema = z.enum(SprintStatuses);
export type SprintStatus = z.infer<typeof SprintStatusSchema>;

export const AiJobOwners = ['co_founder', 'ai', 'founder'] as const;
export const AiJobOwnerSchema = z.enum(AiJobOwners);
export type AiJobOwner = z.infer<typeof AiJobOwnerSchema>;

export const AiJobKinds = ['research', 'draft', 'analysis', 'clarification', 'synthesis'] as const;
export const AiJobKindSchema = z.enum(AiJobKinds);
export type AiJobKind = z.infer<typeof AiJobKindSchema>;

const sprintAllowed: Readonly<Record<SprintStatus, readonly SprintStatus[]>> = {
  draft: ['contracted', 'proposed', 'canceled'],
  contracted: ['running', 'queued', 'canceled'],
  running: ['paused', 'stalled', 'closed', 'failed', 'needs_founder', 'needs_approval', 'complete'],
  paused: ['running', 'canceled'],
  stalled: ['running', 'needs_founder', 'failed', 'canceled'],
  closed: [],
  failed: [],
  proposed: ['queued', 'canceled'],
  queued: ['running', 'canceled', 'expired'],
  needs_founder: ['running', 'paused', 'canceled', 'blocked'],
  needs_approval: ['running', 'complete', 'canceled', 'blocked'],
  complete: [],
  blocked: ['running', 'canceled'],
  canceled: [],
  expired: [],
};

export function canTransitionSprintStatus(from: SprintStatus, to: SprintStatus): boolean {
  return canTransition(sprintAllowed, from, to);
}

export function nextSprintStatuses(from: SprintStatus): readonly SprintStatus[] {
  return nextStates(sprintAllowed, from);
}

export const ProductJobStatuses = [
  'proposed',
  'queued',
  'running',
  'needs_founder',
  'needs_approval',
  'complete',
  'blocked',
  'failed',
  'canceled',
  'expired',
] as const;
export const ProductJobStatusSchema = z.enum(ProductJobStatuses);
export type ProductJobStatus = z.infer<typeof ProductJobStatusSchema>;

export function toProductJobStatus(status: SprintStatus): ProductJobStatus {
  switch (status) {
    case 'draft':
      return 'proposed';
    case 'contracted':
      return 'queued';
    case 'running':
      return 'running';
    case 'paused':
    case 'stalled':
      return 'needs_founder';
    case 'needs_founder':
      return 'needs_founder';
    case 'needs_approval':
      return 'needs_approval';
    case 'closed':
    case 'complete':
      return 'complete';
    case 'blocked':
      return 'blocked';
    case 'failed':
      return 'failed';
    case 'proposed':
      return 'proposed';
    case 'queued':
      return 'queued';
    case 'canceled':
      return 'canceled';
    case 'expired':
      return 'expired';
  }
}

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
