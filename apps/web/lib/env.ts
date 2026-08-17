import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

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
  AWS_REGION: z.preprocess(emptyToUndefined, z.string().min(1).optional()).default('ap-south-1'),
  AWS_S3_UPLOADS_BUCKET: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  AWS_S3_ARTIFACTS_BUCKET: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  AWS_S3_ENDPOINT: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  AWS_S3_FORCE_PATH_STYLE: z.preprocess(emptyToUndefined, z.enum(['true', 'false']).optional()),
  AWS_ACCESS_KEY_ID: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  AWS_SECRET_ACCESS_KEY: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  FOUNDRY_SECRETS_KEY: z.preprocess(emptyToUndefined, z.string().min(32).optional()),
  ANTHROPIC_API_KEY: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  OPENAI_API_KEY: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  AI_GATEWAY_API_KEY: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  OLLAMA_BASE_URL: z.preprocess(emptyToUndefined, z.url().optional()),
  OLLAMA_MODEL: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  ALLOW_MCP_LOOPBACK: z.preprocess(emptyToUndefined, z.enum(['true', 'false']).optional()),
});

export type Env = z.infer<typeof EnvSchema>;

function loadLocalEnvFiles(): void {
  const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../..');
  for (const file of [join(repoRoot, '.env.local'), join(repoRoot, '.env')]) {
    if (existsSync(file)) {
      process.loadEnvFile(file);
    }
  }
}

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
      AWS_REGION: process.env.AWS_REGION ?? 'ap-south-1',
      AWS_S3_UPLOADS_BUCKET: process.env.AWS_S3_UPLOADS_BUCKET,
      AWS_S3_ARTIFACTS_BUCKET: process.env.AWS_S3_ARTIFACTS_BUCKET,
      AWS_S3_ENDPOINT: process.env.AWS_S3_ENDPOINT,
      AWS_S3_FORCE_PATH_STYLE: process.env.AWS_S3_FORCE_PATH_STYLE,
      AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
      AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
      FOUNDRY_SECRETS_KEY: process.env.FOUNDRY_SECRETS_KEY,
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      AI_GATEWAY_API_KEY: process.env.AI_GATEWAY_API_KEY,
      OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL,
      OLLAMA_MODEL: process.env.OLLAMA_MODEL,
      ALLOW_MCP_LOOPBACK: process.env.ALLOW_MCP_LOOPBACK,
    };
  }
  return process.env;
}

let cached: Env | undefined;

export function getEnv(): Env {
  loadLocalEnvFiles();
  cached ??= EnvSchema.parse(readProcessEnv());
  return cached;
}
