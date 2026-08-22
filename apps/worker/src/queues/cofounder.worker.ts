import { CofounderJobDataSchema } from '@foundry/cofounder-operations';
import { infra } from '@foundry/config/infra';
import type { StreamBus } from '@foundry/agent-runtime';
import type { PoolSql } from '@foundry/db';
import { Worker, type ConnectionOptions } from 'bullmq';
import type { Redis } from 'ioredis';

import { processCofounderJob } from '../cofounder/process.js';

export type CofounderWorkerDeps = {
  sql: PoolSql;
  connection: ConnectionOptions;
  streamBus: StreamBus;
  redis: Redis;
  harness: { endpoint: string; token: string };
  queueName?: string;
};

export function startCofounderWorker(deps: CofounderWorkerDeps): Worker {
  const queueName = deps.queueName ?? infra.queues.cofounder;
  return new Worker(
    queueName,
    async (job) => {
      await processCofounderJob(CofounderJobDataSchema.parse(job.data), {
        sql: deps.sql,
        streamBus: deps.streamBus,
        redis: deps.redis,
        harness: deps.harness,
      });
    },
    {
      connection: deps.connection,
      concurrency: infra.cofounderQueue.concurrency,
      lockDuration: infra.cofounderQueue.lockDurationMs,
    },
  );
}
