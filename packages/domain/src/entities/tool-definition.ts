import { z } from 'zod';

import { ToolDefinitionIdSchema } from '../ids.js';
import { InstantSchema } from '../value-objects/primitives.js';
import { RiskClassSchema } from '../value-objects/risk-class.js';

export const ToolDefinitionSchema = z.object({
  id: ToolDefinitionIdSchema,
  name: z.string().min(1),
  version: z.number().int().positive(),
  riskClass: RiskClassSchema,
  inputSchema: z.unknown(),
  outputSchema: z.unknown(),
  createdAt: InstantSchema,
});
export type ToolDefinition = z.infer<typeof ToolDefinitionSchema>;
