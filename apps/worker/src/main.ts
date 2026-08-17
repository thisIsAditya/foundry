import {
  createRedisStreamBus,
  createSecretBox,
  type ProviderSecrets,
} from '@foundry/agent-runtime';
import { createSql } from '@foundry/db';
import { initObservability } from '@foundry/observability/otel';
import { Redis } from 'ioredis';

import { getEnv } from './env.js';
import { startHealthServer } from './health.js';
import { startIngestionWorker } from './queues/ingestion.worker.js';
import { startNotificationWorker } from './queues/notification.worker.js';
import { startRenderWorker } from './queues/render.worker.js';
import { startSprintWorker } from './queues/sprint.worker.js';
import { registerShutdown } from './shutdown.js';
import { createS3ObjectStore } from './storage/s3-object-store.js';

async function main(): Promise<void> {
  const env = getEnv();
  const otlpEndpoint = env.OTEL_EXPORTER_OTLP_ENDPOINT;
  await initObservability({
    serviceName: 'foundry-worker',
    ...(otlpEndpoint === undefined ? {} : { otlpEndpoint }),
  });

  const sql = createSql(env.DATABASE_URL);
  const redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
  const objectStore = createS3ObjectStore(env);
  const streamBus = createRedisStreamBus(env.REDIS_URL);
  const health = startHealthServer({ port: env.PORT, sql, redis });
  const secretKey =
    env.FOUNDRY_SECRETS_KEY ??
    env.BETTER_AUTH_SECRET ??
    'foundry-worker-local-only-placeholder-key';
  const secretBox = createSecretBox(secretKey);
  const secrets: ProviderSecrets = {
    ...(env.ANTHROPIC_API_KEY === undefined ? {} : { anthropicApiKey: env.ANTHROPIC_API_KEY }),
    ...(env.OPENAI_API_KEY === undefined ? {} : { openaiApiKey: env.OPENAI_API_KEY }),
    ...(env.AI_GATEWAY_API_KEY === undefined ? {} : { gatewayApiKey: env.AI_GATEWAY_API_KEY }),
  };
  const ingestion = startIngestionWorker({
    sql,
    connection: redis,
    objectStore,
    ...(env.CLAMD_HOST === undefined ? {} : { clamdHost: env.CLAMD_HOST }),
    ...(env.CLAMD_PORT === undefined ? {} : { clamdPort: env.CLAMD_PORT }),
  });
  const sprint = startSprintWorker({
    sql,
    connection: redis,
    streamBus,
    secretBox,
    secrets,
  });
  const render = startRenderWorker({
    sql,
    connection: redis,
    objectStore,
  });
  const notification = startNotificationWorker({
    sql,
    connection: redis,
  });
  registerShutdown({ workers: [ingestion, sprint, render, notification], sql, redis, health });
}

void main();
