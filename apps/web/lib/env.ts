import { z } from 'zod';

const emptyToUndefined = (value: unknown) => (value === '' ? undefined : value);

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  BETTER_AUTH_URL: z.url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  GOOGLE_CLIENT_ID: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  GOOGLE_CLIENT_SECRET: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  SENTRY_DSN: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
});

export type Env = z.infer<typeof EnvSchema>;

function readProcessEnv(): Record<string, string | undefined> {
  const phase = process.env.NEXT_PHASE;
  if (phase === 'phase-production-build' || phase === 'phase-production-compile') {
    return {
      NODE_ENV: process.env.NODE_ENV ?? 'production',
      DATABASE_URL: process.env.DATABASE_URL ?? 'postgres://build:build@localhost:5432/build',
      REDIS_URL: process.env.REDIS_URL,
      BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
      BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ?? 'build-placeholder-secret-32bytes!!',
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
      OTEL_EXPORTER_OTLP_ENDPOINT: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
      SENTRY_DSN: process.env.SENTRY_DSN,
    };
  }
  return process.env;
}

let cached: Env | undefined;

export function getEnv(): Env {
  cached ??= EnvSchema.parse(readProcessEnv());
  return cached;
}
