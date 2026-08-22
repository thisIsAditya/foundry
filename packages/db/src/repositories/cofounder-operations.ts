import {
  CofounderOperationSchema,
  CofounderOperationStateSchema,
  CofounderRuntimeKindSchema,
  ProjectIdSchema,
  UserIdSchema,
  WorkspaceIdSchema,
  type CofounderOperation,
  type CofounderOperationId,
  type CofounderOperationState,
  type CofounderRuntimeKind,
  type ProjectId,
  type UserId,
  type WorkspaceId,
} from '@foundry/domain';
import { z } from 'zod';

import type { Sql } from '../client.js';
import { jsonParam } from '../json.js';
import { requireRow } from '../require-row.js';

const RowSchema = z.object({
  id: z.string().uuid(),
  project_id: ProjectIdSchema,
  workspace_id: WorkspaceIdSchema,
  actor_user_id: UserIdSchema,
  runtime_kind: CofounderRuntimeKindSchema,
  state: CofounderOperationStateSchema,
  input_ref: z.unknown().nullable(),
  timeout_ms: z.number().int().nullable(),
  canceled_at: z.coerce.date().nullable(),
  idempotency_key: z.string().uuid(),
  correlation_id: z.string().uuid().nullable(),
  usage_json: z.unknown(),
  recovery_json: z.unknown(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

type Row = z.infer<typeof RowSchema>;

export type InsertCofounderOperation = {
  projectId: ProjectId;
  workspaceId: WorkspaceId;
  actorUserId: UserId;
  runtimeKind?: CofounderRuntimeKind;
  state?: CofounderOperationState;
  inputRef?: unknown;
  timeoutMs?: number | null;
  idempotencyKey: string;
  correlationId?: string | null;
};

export function toCofounderOperation(row: Row): CofounderOperation {
  return CofounderOperationSchema.parse({
    id: row.id,
    projectId: row.project_id,
    workspaceId: row.workspace_id,
    actorUserId: row.actor_user_id,
    runtimeKind: row.runtime_kind,
    state: row.state,
    inputRef: row.input_ref,
    timeoutMs: row.timeout_ms,
    canceledAt: row.canceled_at,
    idempotencyKey: row.idempotency_key,
    correlationId: row.correlation_id,
    usage: row.usage_json,
    recovery: row.recovery_json,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function parse(row: Row): CofounderOperation {
  return toCofounderOperation(RowSchema.parse(row));
}

export async function insertCofounderOperation(
  sql: Sql,
  input: InsertCofounderOperation,
): Promise<CofounderOperation> {
  const rows = await sql<Row[]>`
    insert into cofounder_operations (
      project_id,
      workspace_id,
      actor_user_id,
      runtime_kind,
      state,
      input_ref,
      timeout_ms,
      idempotency_key,
      correlation_id
    )
    values (
      ${input.projectId},
      ${input.workspaceId},
      ${input.actorUserId},
      ${input.runtimeKind ?? 'direct'},
      ${input.state ?? 'queued'},
      ${input.inputRef === undefined ? null : jsonParam(sql, input.inputRef)},
      ${input.timeoutMs ?? null},
      ${input.idempotencyKey},
      ${input.correlationId ?? null}
    )
    returning *
  `;
  return parse(requireRow(rows, 'insertCofounderOperation'));
}

export async function getCofounderOperationByIdempotency(
  sql: Sql,
  projectId: ProjectId,
  idempotencyKey: string,
): Promise<CofounderOperation | null> {
  const rows = await sql<Row[]>`
    select * from cofounder_operations
    where project_id = ${projectId} and idempotency_key = ${idempotencyKey}
  `;
  const row = rows[0];
  return row === undefined ? null : parse(row);
}

export async function getCofounderOperationById(
  sql: Sql,
  id: CofounderOperationId,
): Promise<CofounderOperation | null> {
  const rows = await sql<Row[]>`
    select * from cofounder_operations where id = ${id}
  `;
  const row = rows[0];
  return row === undefined ? null : parse(row);
}

export async function claimQueuedCofounderOperation(
  sql: Sql,
  id: CofounderOperationId,
): Promise<CofounderOperation | null> {
  const rows = await sql<Row[]>`
    update cofounder_operations
    set state = 'running', updated_at = now()
    where id = ${id} and state = 'queued'
    returning *
  `;
  const row = rows[0];
  return row === undefined ? null : parse(row);
}

export async function cancelActiveCofounderOperation(
  sql: Sql,
  id: CofounderOperationId,
): Promise<CofounderOperation | null> {
  const rows = await sql<Row[]>`
    update cofounder_operations
    set
      state = 'canceled',
      canceled_at = now(),
      updated_at = now()
    where id = ${id}
      and state in ('queued', 'running', 'awaiting_founder')
    returning *
  `;
  const row = rows[0];
  return row === undefined ? null : parse(row);
}

export async function updateCofounderOperationState(
  sql: Sql,
  id: CofounderOperationId,
  input: {
    state: CofounderOperationState;
    usage?: unknown;
    recovery?: unknown;
    canceledAt?: Date | null;
  },
): Promise<CofounderOperation> {
  const rows = await sql<Row[]>`
    update cofounder_operations
    set
      state = ${input.state},
      usage_json = coalesce(${input.usage === undefined ? null : jsonParam(sql, input.usage)}, usage_json),
      recovery_json = coalesce(
        ${input.recovery === undefined ? null : jsonParam(sql, input.recovery)},
        recovery_json
      ),
      canceled_at = coalesce(${input.canceledAt ?? null}, canceled_at),
      updated_at = now()
    where id = ${id}
    returning *
  `;
  return parse(requireRow(rows, 'updateCofounderOperationState'));
}

export async function insertCapabilityInvocation(
  sql: Sql,
  input: {
    operationId: CofounderOperationId;
    projectId: ProjectId;
    workspaceId: WorkspaceId;
    capabilityName: string;
    capabilityVersion: string;
    riskClass: string;
    actorUserId: UserId;
    idempotencyKey?: string | null;
    durationMs?: number | null;
    safeError?: string | null;
    safeResultSummary?: string | null;
  },
): Promise<void> {
  await sql`
    insert into capability_invocations (
      operation_id,
      project_id,
      workspace_id,
      capability_name,
      capability_version,
      risk_class,
      actor_user_id,
      idempotency_key,
      duration_ms,
      safe_error,
      safe_result_summary
    )
    values (
      ${input.operationId},
      ${input.projectId},
      ${input.workspaceId},
      ${input.capabilityName},
      ${input.capabilityVersion},
      ${input.riskClass},
      ${input.actorUserId},
      ${input.idempotencyKey ?? null},
      ${input.durationMs ?? null},
      ${input.safeError ?? null},
      ${input.safeResultSummary ?? null}
    )
  `;
}
