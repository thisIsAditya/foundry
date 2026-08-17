import { createSql, type PoolSql } from '@foundry/db';

import { getEnv } from './env';

let sql: PoolSql | undefined;

export function getSql(): PoolSql {
  sql ??= createSql(getEnv().DATABASE_URL);
  return sql;
}
