import { z } from 'zod';

import { AgentDefinitionIdSchema, AgentRunIdSchema, SprintIdSchema } from '../ids.js';
import { AgentRunStatusSchema } from '../status/execution-status.js';
import { DecimalStringSchema, InstantSchema } from '../value-objects/primitives.js';

export const AgentRunSchema = z.object({
  id: AgentRunIdSchema,
  sprintId: SprintIdSchema.nullable().default(null),
  agentDefinitionId: AgentDefinitionIdSchema,
  modelProfile: z.string().min(1),
  provider: z.string().min(1),
  modelId: z.string().min(1),
  inputTokens: z.number().int().nonnegative().nullable().default(null),
  outputTokens: z.number().int().nonnegative().nullable().default(null),
  costUsd: DecimalStringSchema.nullable().default(null),
  startedAt: InstantSchema,
  finishedAt: InstantSchema.nullable().default(null),
  status: AgentRunStatusSchema,
});
export type AgentRun = z.infer<typeof AgentRunSchema>;
