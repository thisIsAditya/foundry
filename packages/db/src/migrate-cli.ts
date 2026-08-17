import { getDatabaseUrl } from './env.js';
import { migrateUp } from './migrate.js';

async function main(): Promise<void> {
  await migrateUp(getDatabaseUrl());
}

try {
  await main();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
