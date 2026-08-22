import { z } from 'zod';

import {
  CofounderOperationIdSchema,
  ProjectIdSchema,
  UserIdSchema,
  WorkspaceIdSchema,
} from '../ids.js';
import { CofounderOperationStateSchema, CofounderRuntimeKindSchema } from '../proposal/status.js';
import { InstantSchema } from '../value-objects/primitives.js';

export const CofounderOperationSchema = z.object({
  id: CofounderOperationIdSchema,
  projectId: ProjectIdSchema,
  workspaceId: WorkspaceIdSchema,
  actorUserId: UserIdSchema,
  runtimeKind: CofounderRuntimeKindSchema,
  state: CofounderOperationStateSchema,
  inputRef: z.unknown().nullable().default(null),
  timeoutMs: z.number().int().positive().nullable().default(null),
  canceledAt: InstantSchema.nullable().default(null),
  idempotencyKey: z.string().uuid(),
  correlationId: z.string().uuid().nullable().default(null),
  usage: z.unknown().default({}),
  recovery: z.unknown().default({}),
  createdAt: InstantSchema,
  updatedAt: InstantSchema,
});
export type CofounderOperation = z.infer<typeof CofounderOperationSchema>;
