import { z } from 'zod';

import {
  DocumentIdSchema,
  IntegrationConnectionIdSchema,
  ProjectIdSchema,
  ProviderConnectionIdSchema,
  WorkspaceIdSchema,
} from '../ids.js';
import { WorkspaceRoleSchema } from '../status/workspace-status.js';

export const AccessScopeSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('workspace'), workspaceId: WorkspaceIdSchema }),
  z.object({ kind: z.literal('project'), projectId: ProjectIdSchema }),
  z.object({
    kind: z.literal('member_role'),
    workspaceId: WorkspaceIdSchema,
    role: WorkspaceRoleSchema,
  }),
  z.object({ kind: z.literal('document'), documentId: DocumentIdSchema }),
  z.object({ kind: z.literal('connection'), connectionId: ProviderConnectionIdSchema }),
  z.object({
    kind: z.literal('integration'),
    connectionId: IntegrationConnectionIdSchema,
  }),
]);
export type AccessScope = z.infer<typeof AccessScopeSchema>;
