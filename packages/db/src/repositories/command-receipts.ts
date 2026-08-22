import type { ProjectId, WorkspaceId } from '@foundry/domain';

import type { Sql } from '../client.js';
import { jsonParam } from '../json.js';

export type InsertCommandReceipt = {
  workspaceId: WorkspaceId;
  projectId?: ProjectId | null;
  actorId: string;
  command: string;
  idempotencyKey: string;
  result: unknown;
};

export async function getCommandReceipt(
  sql: Sql,
  actorId: string,
  command: string,
  idempotencyKey: string,
): Promise<unknown | null> {
  const rows = await sql<{ result_json: unknown }[]>`
    select result_json from command_receipts
    where actor_id = ${actorId} and command = ${command} and idempotency_key = ${idempotencyKey}
  `;
  return rows[0]?.result_json ?? null;
}

export async function insertCommandReceipt(sql: Sql, input: InsertCommandReceipt): Promise<void> {
  await sql`
    insert into command_receipts (
      workspace_id,
      project_id,
      actor_id,
      command,
      idempotency_key,
      result_json
    )
    values (
      ${input.workspaceId},
      ${input.projectId ?? null},
      ${input.actorId},
      ${input.command},
      ${input.idempotencyKey},
      ${jsonParam(sql, input.result)}
    )
    on conflict (actor_id, command, idempotency_key) do nothing
  `;
}
