import type { WorkspaceId } from '@foundry/domain';

import type { PoolSql, TransactionSql } from './client.js';

export const appRlsRole = 'foundry_app';

export function toPgTextArray(ids: readonly string[]): string {
  return `{${ids.join(',')}}`;
}

export async function withWorkspaceScope<T>(
  sql: PoolSql,
  workspaceIds: readonly WorkspaceId[],
  fn: (tx: TransactionSql) => Promise<T>,
): Promise<T> {
  let result!: T;
  await sql.begin(async (tx) => {
    // Docker's POSTGRES_USER is a superuser and bypasses FORCE RLS; foundry_app does not (09 §6).
    await tx.unsafe(`set local role ${appRlsRole}`);
    await tx`select set_config('app.current_workspace_ids', ${toPgTextArray(workspaceIds)}, true)`;
    result = await fn(tx);
  });
  return result;
}
