import { z } from 'zod';

import { BeachheadIdSchema, DmuIdSchema, PackRevisionIdSchema } from '../ids.js';
import { InstantSchema } from '../value-objects/primitives.js';

const DmuRoleSchema = z.string().nullable().default(null);

export const DmuSchema = z.object({
  id: DmuIdSchema,
  packRevisionId: PackRevisionIdSchema,
  beachheadId: BeachheadIdSchema,
  user: DmuRoleSchema,
  champion: DmuRoleSchema,
  buyer: DmuRoleSchema,
  approver: DmuRoleSchema,
  veto: DmuRoleSchema,
  procurement: DmuRoleSchema,
  createdAt: InstantSchema,
});
export type Dmu = z.infer<typeof DmuSchema>;
