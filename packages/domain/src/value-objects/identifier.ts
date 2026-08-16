import { z } from 'zod';

import { InstantSchema } from './primitives.js';

export const IdentifierSchema = z.object({
  id: z.uuid(),
  entityKind: z.string().min(1),
  createdAt: InstantSchema,
});
export type Identifier = z.infer<typeof IdentifierSchema>;
