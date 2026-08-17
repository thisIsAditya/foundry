import { getDatabaseUrl } from './env.js';
import { runMigrations, type MigrationDirection } from './migrate.js';

const direction: MigrationDirection = process.argv.includes('down') ? 'down' : 'up';

async function main(): Promise<void> {
  await runMigrations(getDatabaseUrl(), direction, { verbose: true });
}

try {
  await main();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
