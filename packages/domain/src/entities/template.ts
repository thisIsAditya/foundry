import { z } from 'zod';

import { TemplateIdSchema } from '../ids.js';
import { InstantSchema } from '../value-objects/primitives.js';

export const TemplateSchema = z.object({
  id: TemplateIdSchema,
  artifactType: z.string().min(1),
  version: z.number().int().positive(),
  definition: z.unknown(),
  createdAt: InstantSchema,
});
export type Template = z.infer<typeof TemplateSchema>;
