import type { UserId, WorkspaceId } from '@foundry/domain';

import type { PoolSql, TransactionSql } from './client.js';

export const appRlsRole = 'foundry_app';

export function toPgTextArray(ids: readonly string[]): string {
  return `{${ids.join(',')}}`;
}

export type TenantScope = {
  workspaceIds: readonly WorkspaceId[];
  userId?: UserId;
};

async function applyTenantConfig(tx: TransactionSql, scope: TenantScope): Promise<void> {
  // Docker's POSTGRES_USER is a superuser and bypasses FORCE RLS; foundry_app does not (09 §6).
  await tx.unsafe(`set local role ${appRlsRole}`);
  await tx`select set_config('app.current_workspace_ids', ${toPgTextArray(scope.workspaceIds)}, true)`;
  if (scope.userId !== undefined) {
    await tx`select set_config('app.current_user_id', ${scope.userId}, true)`;
  }
}

export async function withWorkspaceScope<T>(
  sql: PoolSql,
  workspaceIds: readonly WorkspaceId[],
  fn: (tx: TransactionSql) => Promise<T>,
  userId?: UserId,
): Promise<T> {
  let result!: T;
  await sql.begin(async (tx) => {
    await applyTenantConfig(tx, userId === undefined ? { workspaceIds } : { workspaceIds, userId });
    result = await fn(tx);
  });
  return result;
}

export async function withUserScope<T>(
  sql: PoolSql,
  userId: UserId,
  fn: (tx: TransactionSql) => Promise<T>,
): Promise<T> {
  let result!: T;
  await sql.begin(async (tx) => {
    await applyTenantConfig(tx, { workspaceIds: [], userId });
    result = await fn(tx);
  });
  return result;
}
