import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { z } from 'zod';

const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
});

export type DbEnv = z.infer<typeof EnvSchema>;

export const defaultLocalDatabaseUrl = 'postgres://foundry:foundry@localhost:5432/foundry';
export const defaultTestDatabaseUrl = 'postgres://foundry:foundry@localhost:5432/foundry_test';

function loadLocalEnvFiles(): void {
  const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../..');
  for (const file of [join(repoRoot, '.env.local'), join(repoRoot, '.env')]) {
    if (existsSync(file)) {
      process.loadEnvFile(file);
    }
  }
}

export function parseDbEnv(source: Record<string, string | undefined> = process.env): DbEnv {
  return EnvSchema.parse({
    DATABASE_URL: source.DATABASE_URL,
  });
}

export function getDatabaseUrl(source: Record<string, string | undefined> = process.env): string {
  if (source === process.env) {
    loadLocalEnvFiles();
  }
  const url = source.DATABASE_URL;
  return parseDbEnv({
    DATABASE_URL: url === undefined || url === '' ? defaultLocalDatabaseUrl : url,
  }).DATABASE_URL;
}

export function getTestDatabaseUrl(
  source: Record<string, string | undefined> = process.env,
): string {
  return source.TEST_DATABASE_URL ?? defaultTestDatabaseUrl;
}
