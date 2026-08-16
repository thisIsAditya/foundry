import { z } from 'zod';

import { AgentRunIdSchema, UsageRecordIdSchema, WorkspaceIdSchema } from '../ids.js';
import { UsageResourceTypeSchema } from '../status/execution-status.js';
import { DecimalStringSchema, InstantSchema } from '../value-objects/primitives.js';

export const UsageRecordSchema = z.object({
  id: UsageRecordIdSchema,
  agentRunId: AgentRunIdSchema.nullable().default(null),
  workspaceId: WorkspaceIdSchema,
  provider: z.string().min(1),
  resourceType: UsageResourceTypeSchema,
  quantity: DecimalStringSchema,
  costUsd: DecimalStringSchema,
  createdAt: InstantSchema,
});
export type UsageRecord = z.infer<typeof UsageRecordSchema>;
