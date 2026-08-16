import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { runner as migrate } from 'node-pg-migrate';

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), '../migrations');

export async function migrateUp(databaseUrl: string): Promise<void> {
  await migrate({
    databaseUrl,
    dir: migrationsDir,
    direction: 'up',
    migrationsTable: 'pgmigrations',
    verbose: false,
    log: () => undefined,
    checkOrder: true,
  });
}
