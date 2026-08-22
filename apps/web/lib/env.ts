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
  AWS_SESSION_TOKEN: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  AWS_S3_ACCESS_KEY_ID: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  AWS_S3_SECRET_ACCESS_KEY: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  FOUNDRY_SECRETS_KEY: z.preprocess(emptyToUndefined, z.string().min(32).optional()),
  ANTHROPIC_API_KEY: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  OPENAI_API_KEY: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  AI_GATEWAY_API_KEY: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  BEDROCK_AUTO_CONNECT: z.preprocess(emptyToUndefined, z.enum(['true', 'false']).optional()),
  BEDROCK_MODEL_ID: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  OLLAMA_BASE_URL: z.preprocess(emptyToUndefined, z.url().optional()),
  OLLAMA_MODEL: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  ALLOW_MCP_LOOPBACK: z.preprocess(emptyToUndefined, z.enum(['true', 'false']).optional()),
  FOUNDRY_COFOUNDER_WORKER: z.preprocess(emptyToUndefined, z.enum(['true', 'false']).optional()),
  FOUNDRY_AI: z.preprocess(emptyToUndefined, z.enum(['off', 'direct', 'harness']).optional()),
  FOUNDRY_HARNESS_URL: z.preprocess(emptyToUndefined, z.url().optional()),
  FOUNDRY_HARNESS_TOKEN: z.preprocess(emptyToUndefined, z.string().min(32).optional()),
  FOUNDRY_CAPABILITY_INVOKE_URL: z.preprocess(emptyToUndefined, z.url().optional()),
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
      BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3210',
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
      AWS_SESSION_TOKEN: process.env.AWS_SESSION_TOKEN,
      AWS_S3_ACCESS_KEY_ID: process.env.AWS_S3_ACCESS_KEY_ID,
      AWS_S3_SECRET_ACCESS_KEY: process.env.AWS_S3_SECRET_ACCESS_KEY,
      FOUNDRY_SECRETS_KEY: process.env.FOUNDRY_SECRETS_KEY,
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      AI_GATEWAY_API_KEY: process.env.AI_GATEWAY_API_KEY,
      BEDROCK_AUTO_CONNECT: process.env.BEDROCK_AUTO_CONNECT,
      BEDROCK_MODEL_ID: process.env.BEDROCK_MODEL_ID,
      OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL,
      OLLAMA_MODEL: process.env.OLLAMA_MODEL,
      ALLOW_MCP_LOOPBACK: process.env.ALLOW_MCP_LOOPBACK,
      FOUNDRY_COFOUNDER_WORKER: process.env.FOUNDRY_COFOUNDER_WORKER,
      FOUNDRY_AI: process.env.FOUNDRY_AI,
      FOUNDRY_HARNESS_URL: process.env.FOUNDRY_HARNESS_URL,
      FOUNDRY_HARNESS_TOKEN: process.env.FOUNDRY_HARNESS_TOKEN,
      FOUNDRY_CAPABILITY_INVOKE_URL: process.env.FOUNDRY_CAPABILITY_INVOKE_URL,
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
