import { z } from 'zod';

import { ProviderConnectionIdSchema, UserIdSchema, WorkspaceIdSchema } from '../ids.js';
import { DataClassificationSchema } from '../status/evidence-status.js';
import {
  ProviderAuthModeSchema,
  ProviderFamilySchema,
  ProviderHealthStatusSchema,
} from '../status/output-status.js';
import { DecimalStringSchema, InstantSchema } from '../value-objects/primitives.js';

export const ProviderConnectionSchema = z.object({
  id: ProviderConnectionIdSchema,
  workspaceId: WorkspaceIdSchema.nullable().default(null),
  userId: UserIdSchema.nullable().default(null),
  providerFamily: ProviderFamilySchema,
  authMode: ProviderAuthModeSchema,
  credentialRefEncrypted: z.string().nullable().default(null),
  endpointOrRegion: z.string().nullable().default(null),
  allowedModels: z.unknown().nullable().default(null),
  allowedDataClassifications: z.array(DataClassificationSchema).nullable().default(null),
  fallbackPolicy: z.unknown().nullable().default(null),
  spendLimitUsd: DecimalStringSchema.nullable().default(null),
  healthStatus: ProviderHealthStatusSchema,
  lastValidatedAt: InstantSchema.nullable().default(null),
  createdAt: InstantSchema,
});
export type ProviderConnection = z.infer<typeof ProviderConnectionSchema>;
