import { createSql, type PoolSql } from '@foundry/db';

import { getEnv } from './env';

const globalForSql = globalThis as typeof globalThis & { foundrySql?: PoolSql };

export function getSql(): PoolSql {
  globalForSql.foundrySql ??= createSql(getEnv().DATABASE_URL);
  return globalForSql.foundrySql;
}
