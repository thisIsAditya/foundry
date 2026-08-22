import { z } from 'zod';

import {
  CapabilityInvocationIdSchema,
  CofounderOperationIdSchema,
  ProjectIdSchema,
  UserIdSchema,
  WorkspaceIdSchema,
} from '../ids.js';
import { RiskClassSchema } from '../value-objects/risk-class.js';
import { InstantSchema } from '../value-objects/primitives.js';

export const CapabilityInvocationSchema = z.object({
  id: CapabilityInvocationIdSchema,
  operationId: CofounderOperationIdSchema,
  projectId: ProjectIdSchema,
  workspaceId: WorkspaceIdSchema,
  capabilityName: z.string().min(1),
  capabilityVersion: z.string().min(1),
  riskClass: RiskClassSchema,
  actorUserId: UserIdSchema,
  idempotencyKey: z.string().uuid().nullable().default(null),
  durationMs: z.number().int().nonnegative().nullable().default(null),
  safeError: z.string().nullable().default(null),
  safeResultSummary: z.string().nullable().default(null),
  createdAt: InstantSchema,
});
export type CapabilityInvocation = z.infer<typeof CapabilityInvocationSchema>;
