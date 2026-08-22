import { createRedisStreamBus } from '@foundry/agent-runtime';
import { createSql } from '@foundry/db';
import { initObservability } from '@foundry/observability/otel';
import { Redis } from 'ioredis';

import { getEnv } from './env.js';
import { startCofounderWorker } from './queues/cofounder.worker.js';
import { startHealthServer } from './health.js';
import { startIngestionWorker } from './queues/ingestion.worker.js';
import { startNotificationWorker } from './queues/notification.worker.js';
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
  const ingestion = startIngestionWorker({
    sql,
    connection: redis,
    objectStore,
    ...(env.CLAMD_HOST === undefined ? {} : { clamdHost: env.CLAMD_HOST }),
    ...(env.CLAMD_PORT === undefined ? {} : { clamdPort: env.CLAMD_PORT }),
  });
  const notification = startNotificationWorker({
    sql,
    connection: redis,
  });
  const cofounder = startCofounderWorker({
    sql,
    connection: redis,
    streamBus,
    redis,
    ...(env.FOUNDRY_AI === undefined ? {} : { aiMode: env.FOUNDRY_AI }),
    ...(env.FOUNDRY_HARNESS_URL !== undefined && env.FOUNDRY_HARNESS_TOKEN !== undefined
      ? { harness: { endpoint: env.FOUNDRY_HARNESS_URL, token: env.FOUNDRY_HARNESS_TOKEN } }
      : {}),
    ...(env.FOUNDRY_CAPABILITY_INVOKE_URL === undefined
      ? {}
      : { capabilityInvokeUrl: env.FOUNDRY_CAPABILITY_INVOKE_URL }),
  });
  const workers = [ingestion, cofounder, notification];
  registerShutdown({ workers, sql, redis, health });
}

void main();
