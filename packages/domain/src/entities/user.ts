import { z } from 'zod';

import { UserIdSchema } from '../ids.js';
import { PlatformRoleSchema } from '../status/workspace-status.js';
import { InstantSchema } from '../value-objects/primitives.js';

export const UserSchema = z.object({
  id: UserIdSchema,
  name: z.string().min(1),
  email: z.email(),
  emailVerified: z.boolean(),
  image: z.string().nullable().default(null),
  role: PlatformRoleSchema,
  timezone: z.string().min(1),
  locale: z.string().min(1),
  createdAt: InstantSchema,
  updatedAt: InstantSchema,
});
export type User = z.infer<typeof UserSchema>;
