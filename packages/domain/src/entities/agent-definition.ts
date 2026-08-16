import { z } from 'zod';

import { AgentDefinitionIdSchema } from '../ids.js';
import { InstantSchema } from '../value-objects/primitives.js';

export const AgentDefinitionSchema = z.object({
  id: AgentDefinitionIdSchema,
  name: z.string().min(1),
  version: z.number().int().positive(),
  instructionsText: z.string().min(1),
  capabilities: z.unknown(),
  policyDefaults: z.unknown(),
  createdAt: InstantSchema,
});
export type AgentDefinition = z.infer<typeof AgentDefinitionSchema>;
