import {
  cancelCapabilityTokensForOperation,
  hashCapabilityToken,
  insertCapabilityToken,
  newCapabilityTokenSecret,
  type Sql,
} from '@foundry/db';
import type { CofounderOperationId, ProjectId, UserId, WorkspaceId } from '@foundry/domain';

const TOKEN_TTL_MS = 15 * 60 * 1000;

export async function issueCapabilityToken(
  sql: Sql,
  input: {
    operationId: CofounderOperationId;
    projectId: ProjectId;
    workspaceId: WorkspaceId;
    actorUserId: UserId;
    allowedCapabilities: readonly string[];
    maxInvocations: number;
  },
): Promise<string> {
  const token = newCapabilityTokenSecret();
  await insertCapabilityToken(sql, {
    tokenHash: hashCapabilityToken(token),
    operationId: input.operationId,
    projectId: input.projectId,
    workspaceId: input.workspaceId,
    actorUserId: input.actorUserId,
    allowedCapabilities: input.allowedCapabilities,
    maxInvocations: input.maxInvocations,
    expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
  });
  return token;
}

export { cancelCapabilityTokensForOperation, hashCapabilityToken };
