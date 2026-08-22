import { createHash, randomBytes } from 'node:crypto';

import {
  CofounderOperationIdSchema,
  ProjectIdSchema,
  UserIdSchema,
  WorkspaceIdSchema,
  type CofounderOperationId,
  type ProjectId,
  type UserId,
  type WorkspaceId,
} from '@foundry/domain';
import { z } from 'zod';

import type { Sql } from '../client.js';
import { requireRow } from '../require-row.js';
import { toPgTextArray } from '../rls.js';

const RowSchema = z.object({
  id: z.string().uuid(),
  token_hash: z.string(),
  operation_id: CofounderOperationIdSchema,
  project_id: ProjectIdSchema,
  workspace_id: WorkspaceIdSchema,
  actor_user_id: UserIdSchema,
  allowed_capabilities: z.array(z.string()),
  max_invocations: z.number().int(),
  invocation_count: z.number().int(),
  expires_at: z.coerce.date(),
  canceled: z.boolean(),
  created_at: z.coerce.date(),
});

type Row = z.infer<typeof RowSchema>;

export type CapabilityTokenRecord = {
  id: string;
  tokenHash: string;
  operationId: CofounderOperationId;
  projectId: ProjectId;
  workspaceId: WorkspaceId;
  actorUserId: UserId;
  allowedCapabilities: string[];
  maxInvocations: number;
  invocationCount: number;
  expiresAt: Date;
  canceled: boolean;
};

export function hashCapabilityToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function newCapabilityTokenSecret(): string {
  return randomBytes(32).toString('base64url');
}

function parse(row: Row): CapabilityTokenRecord {
  const parsed = RowSchema.parse(row);
  return {
    id: parsed.id,
    tokenHash: parsed.token_hash,
    operationId: parsed.operation_id,
    projectId: parsed.project_id,
    workspaceId: parsed.workspace_id,
    actorUserId: parsed.actor_user_id,
    allowedCapabilities: parsed.allowed_capabilities,
    maxInvocations: parsed.max_invocations,
    invocationCount: parsed.invocation_count,
    expiresAt: parsed.expires_at,
    canceled: parsed.canceled,
  };
}

export async function insertCapabilityToken(
  sql: Sql,
  input: {
    tokenHash: string;
    operationId: CofounderOperationId;
    projectId: ProjectId;
    workspaceId: WorkspaceId;
    actorUserId: UserId;
    allowedCapabilities: readonly string[];
    maxInvocations: number;
    expiresAt: Date;
  },
): Promise<CapabilityTokenRecord> {
  const rows = await sql<Row[]>`
    insert into capability_tokens (
      token_hash,
      operation_id,
      project_id,
      workspace_id,
      actor_user_id,
      allowed_capabilities,
      max_invocations,
      expires_at
    )
    values (
      ${input.tokenHash},
      ${input.operationId},
      ${input.projectId},
      ${input.workspaceId},
      ${input.actorUserId},
      ${toPgTextArray(input.allowedCapabilities)}::text[],
      ${input.maxInvocations},
      ${input.expiresAt}
    )
    returning *
  `;
  return parse(requireRow(rows, 'insertCapabilityToken'));
}

export async function getCapabilityTokenByHash(
  sql: Sql,
  tokenHash: string,
): Promise<CapabilityTokenRecord | null> {
  const rows = await sql<Row[]>`
    select * from capability_tokens where token_hash = ${tokenHash}
  `;
  const row = rows[0];
  return row === undefined ? null : parse(row);
}

export async function incrementCapabilityTokenUse(
  sql: Sql,
  tokenHash: string,
): Promise<CapabilityTokenRecord | null> {
  const rows = await sql<Row[]>`
    update capability_tokens
    set invocation_count = invocation_count + 1
    where token_hash = ${tokenHash}
      and canceled = false
      and expires_at > now()
      and invocation_count < max_invocations
    returning *
  `;
  const row = rows[0];
  return row === undefined ? null : parse(row);
}

export async function cancelCapabilityTokensForOperation(
  sql: Sql,
  operationId: CofounderOperationId,
): Promise<void> {
  await sql`
    update capability_tokens
    set canceled = true
    where operation_id = ${operationId} and canceled = false
  `;
}
