import {
  McpTransportSchema,
  ProjectIdSchema,
  ProviderAuthModeSchema,
  ProviderConnectionIdSchema,
  ProviderFamilySchema,
  SprintIdSchema,
  UserMcpServerIdSchema,
  WorkspaceIdSchema,
} from '@foundry/domain';
import { z } from 'zod';

import { IdempotencyKeySchema } from './idempotency.js';

export const AnswerClarificationInputSchema = z.object({
  projectId: ProjectIdSchema,
  questionId: z.string().min(1),
  answer: z.string().min(1),
  idempotencyKey: IdempotencyKeySchema,
});
export type AnswerClarificationInput = z.infer<typeof AnswerClarificationInputSchema>;

export const ConnectProviderInputSchema = z.object({
  workspaceId: WorkspaceIdSchema,
  family: ProviderFamilySchema,
  authMode: ProviderAuthModeSchema,
  credential: z.string().min(1).optional(),
  endpointOrRegion: z.string().min(1).optional(),
  modelId: z.string().min(1).optional(),
  idempotencyKey: IdempotencyKeySchema,
});
export type ConnectProviderInput = z.infer<typeof ConnectProviderInputSchema>;

export const ListProviderConnectionsInputSchema = z.object({
  workspaceId: WorkspaceIdSchema,
});
export type ListProviderConnectionsInput = z.infer<typeof ListProviderConnectionsInputSchema>;

export const ProviderConnectionSummarySchema = z.object({
  id: ProviderConnectionIdSchema,
  workspaceId: WorkspaceIdSchema.nullable(),
  providerFamily: ProviderFamilySchema,
  authMode: ProviderAuthModeSchema,
  endpointOrRegion: z.string().nullable(),
  healthStatus: z.string(),
  lastValidatedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  hasCredential: z.boolean(),
});
export type ProviderConnectionSummary = z.infer<typeof ProviderConnectionSummarySchema>;

export const AddMcpServerInputSchema = z.object({
  name: z.string().min(1).max(80),
  transport: McpTransportSchema,
  url: z.url(),
  headerSecret: z.string().min(1).optional(),
  idempotencyKey: IdempotencyKeySchema,
});
export type AddMcpServerInput = z.infer<typeof AddMcpServerInputSchema>;

export const McpServerIdInputSchema = z.object({
  mcpServerId: UserMcpServerIdSchema,
  idempotencyKey: IdempotencyKeySchema,
});
export type McpServerIdInput = z.infer<typeof McpServerIdInputSchema>;

export const ToggleMcpServerInputSchema = z.object({
  mcpServerId: UserMcpServerIdSchema,
  enabled: z.boolean(),
  idempotencyKey: IdempotencyKeySchema,
});
export type ToggleMcpServerInput = z.infer<typeof ToggleMcpServerInputSchema>;

export const PreviewSprintInputSchema = z.object({
  projectId: ProjectIdSchema,
  objectiveHint: z.string().min(1).optional(),
  idempotencyKey: IdempotencyKeySchema,
});
export type PreviewSprintInput = z.infer<typeof PreviewSprintInputSchema>;

export const ApproveSprintPlanInputSchema = z.object({
  sprintId: SprintIdSchema,
  expectedContractHash: z.string().min(1),
  idempotencyKey: IdempotencyKeySchema,
});
export type ApproveSprintPlanInput = z.infer<typeof ApproveSprintPlanInputSchema>;

export const GetSprintInputSchema = z.object({
  sprintId: SprintIdSchema,
});
export type GetSprintInput = z.infer<typeof GetSprintInputSchema>;

export const GetSprintActivityInputSchema = z.object({
  sprintId: SprintIdSchema,
  cursor: z.number().int().nonnegative().optional(),
});
export type GetSprintActivityInput = z.infer<typeof GetSprintActivityInputSchema>;
