import { afterAll, afterEach, beforeAll } from 'vitest';

import { createSql, getTestDatabaseUrl, migrateUp, type PoolSql } from '@foundry/db';

const maintenanceDatabaseUrl = 'postgres://foundry:foundry@localhost:5432/foundry';

export let sql: PoolSql;

async function ensureTestDatabase(): Promise<void> {
  const admin = createSql(maintenanceDatabaseUrl, 1);
  try {
    const rows = await admin<{ datname: string }[]>`
      select datname from pg_database where datname = 'foundry_test'
    `;
    if (rows[0] === undefined) {
      await admin.unsafe('create database foundry_test');
    }
  } finally {
    await admin.end({ timeout: 5 });
  }

  const bootstrap = createSql(getTestDatabaseUrl(), 1);
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
  await sql`
    truncate table
      content_blocks,
      documents,
      source_snapshots,
      sources,
      domain_events,
      notification_endpoints,
      project_memberships,
      projects,
      workspace_memberships,
      workspaces,
      api_keys,
      verifications,
      accounts,
      sessions,
      users
    cascade
  `;
});

afterAll(async () => {
  await sql.end({ timeout: 5 });
});
