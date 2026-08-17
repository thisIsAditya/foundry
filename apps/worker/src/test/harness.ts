import { afterAll, afterEach, beforeAll } from 'vitest';

import {
  createSql,
  getTestDatabaseUrl,
  migrateUp,
  truncateAppTables,
  type PoolSql,
} from '@foundry/db';

const maintenanceDatabaseUrl = 'postgres://foundry:foundry@localhost:5432/foundry';

export let sql: PoolSql;

function testDatabaseName(url: string): string {
  const name = new URL(url).pathname.replace(/^\//, '');
  if (!/^foundry_test(?:_[a-z0-9]+)?$/.test(name)) {
    throw new Error(`Refusing to create test database ${name}`);
  }
  return name;
}

async function ensureTestDatabase(): Promise<void> {
  const testUrl = getTestDatabaseUrl();
  const databaseName = testDatabaseName(testUrl);
  const admin = createSql(maintenanceDatabaseUrl, 1);
  try {
    const rows = await admin<{ datname: string }[]>`
      select datname from pg_database where datname = ${databaseName}
    `;
    if (rows[0] === undefined) {
      await admin.unsafe(`create database ${databaseName}`);
    }
  } finally {
    await admin.end({ timeout: 5 });
  }

  const bootstrap = createSql(testUrl, 1);
  try {
    await bootstrap.unsafe('create extension if not exists pgcrypto');
  } finally {
    await bootstrap.end({ timeout: 5 });
  }
}

beforeAll(async () => {
  await ensureTestDatabase();
  await migrateUp(getTestDatabaseUrl());
  sql = createSql(getTestDatabaseUrl());
});

afterEach(async () => {
  await truncateAppTables(sql);
});

afterAll(async () => {
  await sql.end({ timeout: 5 });
});
