import { z } from 'zod';

const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
});

export type DbEnv = z.infer<typeof EnvSchema>;

export function parseDbEnv(source: Record<string, string | undefined> = process.env): DbEnv {
  return EnvSchema.parse({
    DATABASE_URL: source.DATABASE_URL,
  });
}

export const defaultLocalDatabaseUrl = 'postgres://foundry:foundry@localhost:5432/foundry';
export const defaultTestDatabaseUrl = 'postgres://foundry:foundry@localhost:5432/foundry_test';

export function getDatabaseUrl(): string {
  return parseDbEnv().DATABASE_URL;
}

export function getTestDatabaseUrl(
  source: Record<string, string | undefined> = process.env,
): string {
  return source.TEST_DATABASE_URL ?? defaultTestDatabaseUrl;
}
