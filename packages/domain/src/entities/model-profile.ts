import { z } from 'zod';

import { ModelProfileIdSchema, ProviderConnectionIdSchema } from '../ids.js';

export const ModelProfileSchema = z.object({
  id: ModelProfileIdSchema,
  providerConnectionId: ProviderConnectionIdSchema,
  taskClass: z.string().min(1),
  modelId: z.string().min(1),
  costPolicy: z.unknown(),
});
export type ModelProfile = z.infer<typeof ModelProfileSchema>;
