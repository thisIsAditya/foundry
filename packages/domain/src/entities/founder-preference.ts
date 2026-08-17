import { z } from 'zod';

import {
  ConversationMessageIdSchema,
  FounderPreferenceIdSchema,
  ProjectIdSchema,
  WorkspaceIdSchema,
} from '../ids.js';
import { InstantSchema } from '../value-objects/primitives.js';
import { ConfidenceSchema } from '../value-objects/confidence.js';

export const FounderPreferenceScopeSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('project'), projectId: ProjectIdSchema }),
  z.object({ type: z.literal('workspace'), workspaceId: WorkspaceIdSchema }),
]);
export type FounderPreferenceScope = z.infer<typeof FounderPreferenceScopeSchema>;

export const FounderPreferenceSchema = z.object({
  id: FounderPreferenceIdSchema,
  scope: FounderPreferenceScopeSchema,
  key: z.string().min(1),
  value: z.unknown(),
  sourceMessageId: ConversationMessageIdSchema.nullable().default(null),
  confidence: ConfidenceSchema,
  founderConfirmed: z.boolean(),
  createdAt: InstantSchema,
  updatedAt: InstantSchema,
});
export type FounderPreference = z.infer<typeof FounderPreferenceSchema>;
