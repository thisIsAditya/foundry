import { infra } from '@foundry/config/infra';
import { z } from 'zod';

const emptyToUndefined = (value: unknown) => (value === '' ? undefined : value);

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  HOSTNAME: z.string().min(1).default('0.0.0.0'),
  PORT: z
    .string()
    .optional()
    .transform((value) =>
      value === undefined || value === '' ? infra.workerHealthPort : Number(value),
    )
    .pipe(z.number().int().positive()),
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
  BETTER_AUTH_SECRET: z.preprocess(emptyToUndefined, z.string().min(32).optional()),
  FOUNDRY_SECRETS_KEY: z.preprocess(emptyToUndefined, z.string().min(32).optional()),
  ANTHROPIC_API_KEY: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  OPENAI_API_KEY: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  AI_GATEWAY_API_KEY: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  BEDROCK_MODEL_ID: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  CLAMD_HOST: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  CLAMD_PORT: z
    .string()
    .optional()
    .transform((value) => (value === undefined || value === '' ? undefined : Number(value)))
    .pipe(z.number().int().positive().optional()),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
});

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | undefined;

export function getEnv(): Env {
  cached ??= EnvSchema.parse(process.env);
  return cached;
}
