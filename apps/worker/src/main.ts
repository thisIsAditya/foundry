import { createRedisStreamBus } from '@foundry/agent-runtime';
import { createSql } from '@foundry/db';
import { initObservability } from '@foundry/observability';
import { Redis } from 'ioredis';

import { getEnv } from './env.js';
import { startHealthServer } from './health.js';
import { startIngestionWorker } from './queues/ingestion.worker.js';
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
  });
  const render = startRenderWorker({
    sql,
    connection: redis,
    objectStore,
  });
  registerShutdown({ workers: [ingestion, sprint, render], sql, redis, health });
}

void main();
