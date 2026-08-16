import { z } from 'zod';

import {
  AgentRunIdSchema,
  ApprovalRequestIdSchema,
  ToolCallIdSchema,
  ToolDefinitionIdSchema,
} from '../ids.js';
import { ToolCallStatusSchema } from '../status/execution-status.js';
import { InstantSchema } from '../value-objects/primitives.js';

export const ToolCallSchema = z.object({
  id: ToolCallIdSchema,
  agentRunId: AgentRunIdSchema,
  toolDefinitionId: ToolDefinitionIdSchema,
  status: ToolCallStatusSchema,
  input: z.unknown(),
  output: z.unknown().nullable().default(null),
  approvalRequestId: ApprovalRequestIdSchema.nullable().default(null),
  idempotencyKey: z.string().nullable().default(null),
  createdAt: InstantSchema,
  finishedAt: InstantSchema.nullable().default(null),
});
export type ToolCall = z.infer<typeof ToolCallSchema>;
