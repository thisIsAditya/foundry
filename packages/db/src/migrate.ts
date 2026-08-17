import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { runner as migrate } from 'node-pg-migrate';

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), '../migrations');

export type MigrationDirection = 'up' | 'down';

export async function runMigrations(
  databaseUrl: string,
  direction: MigrationDirection,
  options: { verbose?: boolean } = {},
): Promise<void> {
  const verbose = options.verbose === true;
  await migrate({
    databaseUrl,
    dir: migrationsDir,
    direction,
    migrationsTable: 'pgmigrations',
    verbose,
    log: verbose ? console.log : () => undefined,
    checkOrder: true,
  });
}

export async function migrateUp(
  databaseUrl: string,
  options: { verbose?: boolean } = {},
): Promise<void> {
  await runMigrations(databaseUrl, 'up', options);
}
