import { z } from 'zod';

import {
  BeachheadIdSchema,
  EvidenceItemIdSchema,
  PackRevisionIdSchema,
  PersonaIdSchema,
} from '../ids.js';
import { InstantSchema } from '../value-objects/primitives.js';

export const PersonaSchema = z.object({
  id: PersonaIdSchema,
  packRevisionId: PackRevisionIdSchema,
  beachheadId: BeachheadIdSchema,
  profile: z.string().min(1),
  evidenceItemIds: z.array(EvidenceItemIdSchema),
  createdAt: InstantSchema,
});
export type Persona = z.infer<typeof PersonaSchema>;
