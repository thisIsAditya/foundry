import { z } from 'zod';

import { AgentRunIdSchema, ProposedChangeIdSchema } from '../ids.js';
import { ProposedChangeStatusSchema } from '../status/execution-status.js';
import { InstantSchema } from '../value-objects/primitives.js';

export const ProposedChangeSchema = z.object({
  id: ProposedChangeIdSchema,
  agentRunId: AgentRunIdSchema,
  targetSection: z.string().min(1),
  change: z.unknown(),
  status: ProposedChangeStatusSchema,
  createdAt: InstantSchema,
});
export type ProposedChange = z.infer<typeof ProposedChangeSchema>;
