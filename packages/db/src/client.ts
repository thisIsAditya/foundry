import postgres from 'postgres';

import { getDatabaseUrl } from './env.js';

export type PoolSql = postgres.Sql;
export type TransactionSql = postgres.TransactionSql;
export type Sql = PoolSql | TransactionSql;

export function createSql(connectionString: string, max = 10): PoolSql {
  return postgres(connectionString, {
    max,
    idle_timeout: 20,
    connect_timeout: 10,
  });
}

export function createSqlFromEnv(): PoolSql {
  return createSql(getDatabaseUrl());
}
