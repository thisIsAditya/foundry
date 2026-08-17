import {
  ApprovalActionTypeSchema,
  ApprovalRequestIdSchema,
  ApprovalStatusSchema,
  BeachheadIdSchema,
  IntegrationConnectionIdSchema,
  IntegrationProviderSchema,
  MetricDefinitionIdSchema,
  PackRevisionIdSchema,
  PackSectionKeySchema,
  PersonaIdSchema,
  ProjectIdSchema,
  SprintIdSchema,
  WorkspaceIdSchema,
  WorkspaceMembershipIdSchema,
  WorkspaceRoleSchema,
} from '@foundry/domain';
import { z } from 'zod';

import { IdempotencyKeySchema } from './idempotency.js';

export const GetPackSectionInputSchema = z.object({
  projectId: ProjectIdSchema,
  section: PackSectionKeySchema,
});
export type GetPackSectionInput = z.infer<typeof GetPackSectionInputSchema>;

export const GetPackDiffInputSchema = z.object({
  projectId: ProjectIdSchema,
  fromRevision: PackRevisionIdSchema,
  toRevision: PackRevisionIdSchema,
});
export type GetPackDiffInput = z.infer<typeof GetPackDiffInputSchema>;

export const AcceptRevisionInputSchema = z.object({
  projectId: ProjectIdSchema,
  revisionId: PackRevisionIdSchema,
  expectedRevision: PackRevisionIdSchema,
  idempotencyKey: IdempotencyKeySchema,
});
export type AcceptRevisionInput = z.infer<typeof AcceptRevisionInputSchema>;

export const RejectRevisionInputSchema = z.object({
  projectId: ProjectIdSchema,
  revisionId: PackRevisionIdSchema,
  reason: z.string().min(1),
  idempotencyKey: IdempotencyKeySchema,
});
export type RejectRevisionInput = z.infer<typeof RejectRevisionInputSchema>;

export const AddFounderAssertionInputSchema = z.object({
  projectId: ProjectIdSchema,
  section: PackSectionKeySchema,
  claim: z.string().min(1),
  idempotencyKey: IdempotencyKeySchema,
});
export type AddFounderAssertionInput = z.infer<typeof AddFounderAssertionInputSchema>;

export const UpsertPackSectionInputSchema = z.object({
  projectId: ProjectIdSchema,
  section: PackSectionKeySchema,
  body: z.unknown(),
  idempotencyKey: IdempotencyKeySchema,
});
export type UpsertPackSectionInput = z.infer<typeof UpsertPackSectionInputSchema>;

export const UpsertBeachheadInputSchema = z.object({
  projectId: ProjectIdSchema,
  segmentDefinition: z.string().min(1),
  personaId: PersonaIdSchema.optional(),
  idempotencyKey: IdempotencyKeySchema,
});
export type UpsertBeachheadInput = z.infer<typeof UpsertBeachheadInputSchema>;

export const UpsertDmuInputSchema = z.object({
  projectId: ProjectIdSchema,
  beachheadId: BeachheadIdSchema,
  user: z.string().min(1).optional(),
  champion: z.string().min(1).optional(),
  buyer: z.string().min(1).optional(),
  approver: z.string().min(1).optional(),
  veto: z.string().min(1).optional(),
  procurement: z.string().min(1).optional(),
  idempotencyKey: IdempotencyKeySchema,
});
export type UpsertDmuInput = z.infer<typeof UpsertDmuInputSchema>;

export const ListApprovalsInputSchema = z.object({
  projectId: ProjectIdSchema,
  status: ApprovalStatusSchema.optional(),
});
export type ListApprovalsInput = z.infer<typeof ListApprovalsInputSchema>;

export const GetApprovalInputSchema = z.object({
  projectId: ProjectIdSchema,
  approvalId: ApprovalRequestIdSchema,
});
export type GetApprovalInput = z.infer<typeof GetApprovalInputSchema>;

export const DecideApprovalInputSchema = z.object({
  projectId: ProjectIdSchema,
  approvalId: ApprovalRequestIdSchema,
  expectedPayloadHash: z.string().min(1),
  idempotencyKey: IdempotencyKeySchema,
});
export type DecideApprovalInput = z.infer<typeof DecideApprovalInputSchema>;

export const RequestApprovalInputSchema = z.object({
  projectId: ProjectIdSchema,
  actionType: ApprovalActionTypeSchema,
  payload: z.unknown(),
  founderOverride: z.boolean().optional(),
  idempotencyKey: IdempotencyKeySchema,
});
export type RequestApprovalInput = z.infer<typeof RequestApprovalInputSchema>;

export const RecordDecisionInputSchema = z.object({
  projectId: ProjectIdSchema,
  options: z.unknown(),
  chosen: z.unknown(),
  rationale: z.string().min(1).optional(),
  evidenceRefs: z.unknown().optional(),
  idempotencyKey: IdempotencyKeySchema,
});
export type RecordDecisionInput = z.infer<typeof RecordDecisionInputSchema>;

export const ListDecisionsInputSchema = z.object({
  projectId: ProjectIdSchema,
});
export type ListDecisionsInput = z.infer<typeof ListDecisionsInputSchema>;

export const EvaluateGateInputSchema = z.object({
  projectId: ProjectIdSchema,
  gateType: z.enum(['gate_c']),
  idempotencyKey: IdempotencyKeySchema,
});
export type EvaluateGateInput = z.infer<typeof EvaluateGateInputSchema>;

export const ListMetricsInputSchema = z.object({
  projectId: ProjectIdSchema,
});
export type ListMetricsInput = z.infer<typeof ListMetricsInputSchema>;

export const DefineMetricInputSchema = z.object({
  projectId: ProjectIdSchema,
  name: z.string().min(1),
  unit: z.string().min(1),
  calculationSpec: z.unknown(),
  idempotencyKey: IdempotencyKeySchema,
});
export type DefineMetricInput = z.infer<typeof DefineMetricInputSchema>;

export const RecordMetricObservationInputSchema = z.object({
  projectId: ProjectIdSchema,
  metricId: MetricDefinitionIdSchema,
  value: z.string().min(1),
  idempotencyKey: IdempotencyKeySchema,
});
export type RecordMetricObservationInput = z.infer<typeof RecordMetricObservationInputSchema>;

export const ListIntegrationsInputSchema = z.object({
  workspaceId: WorkspaceIdSchema,
});
export type ListIntegrationsInput = z.infer<typeof ListIntegrationsInputSchema>;

export const ConnectIntegrationInputSchema = z.object({
  workspaceId: WorkspaceIdSchema,
  provider: IntegrationProviderSchema,
  credential: z.string().min(1),
  scope: z.unknown().optional(),
  idempotencyKey: IdempotencyKeySchema,
});
export type ConnectIntegrationInput = z.infer<typeof ConnectIntegrationInputSchema>;

export const RevokeIntegrationInputSchema = z.object({
  workspaceId: WorkspaceIdSchema,
  integrationId: IntegrationConnectionIdSchema,
  idempotencyKey: IdempotencyKeySchema,
});
export type RevokeIntegrationInput = z.infer<typeof RevokeIntegrationInputSchema>;

export const IntegrationSummarySchema = z.object({
  id: IntegrationConnectionIdSchema,
  workspaceId: WorkspaceIdSchema,
  provider: IntegrationProviderSchema,
  revokedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  connected: z.boolean(),
});
export type IntegrationSummary = z.infer<typeof IntegrationSummarySchema>;

export const ListMembersInputSchema = z.object({
  workspaceId: WorkspaceIdSchema,
});
export type ListMembersInput = z.infer<typeof ListMembersInputSchema>;

export const InviteMemberInputSchema = z.object({
  workspaceId: WorkspaceIdSchema,
  email: z.email(),
  role: WorkspaceRoleSchema,
  idempotencyKey: IdempotencyKeySchema,
});
export type InviteMemberInput = z.infer<typeof InviteMemberInputSchema>;

export const UpdateMemberRoleInputSchema = z.object({
  workspaceId: WorkspaceIdSchema,
  membershipId: WorkspaceMembershipIdSchema,
  role: WorkspaceRoleSchema,
  idempotencyKey: IdempotencyKeySchema,
});
export type UpdateMemberRoleInput = z.infer<typeof UpdateMemberRoleInputSchema>;

export const ControlSprintInputSchema = z.object({
  sprintId: SprintIdSchema,
  idempotencyKey: IdempotencyKeySchema,
});
export type ControlSprintInput = z.infer<typeof ControlSprintInputSchema>;
