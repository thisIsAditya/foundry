import { limits } from '@foundry/config/limits';
import { infra } from '@foundry/config/infra';
import type { PoolSql } from '@foundry/db';
import { Queue, Worker, type ConnectionOptions } from 'bullmq';

import { NotificationJobDataSchema } from '../notification/job.js';
import { processNotificationJob } from '../notification/process.js';

export type NotificationWorkerDeps = {
  sql: PoolSql;
  connection: ConnectionOptions;
  queueName?: string;
};

const WEEKLY_DIGEST_TICK_CORRELATION_ID = '00000000-0000-4000-8000-000000000001';

export function startNotificationWorker(deps: NotificationWorkerDeps): Worker {
  const queueName = deps.queueName ?? infra.queues.notification;
  if (queueName === infra.queues.notification) {
    const queue = new Queue(queueName, { connection: deps.connection });
    void queue.add(
      'weekly_digest',
      { kind: 'weekly_digest', correlationId: WEEKLY_DIGEST_TICK_CORRELATION_ID },
      {
        jobId: 'weekly-digest-tick',
        repeat: { pattern: limits.notification.weeklyDigestCron },
      },
    );
  }
  return new Worker(
    queueName,
    async (job) => {
      await processNotificationJob(NotificationJobDataSchema.parse(job.data), deps.sql);
    },
    {
      connection: deps.connection,
      concurrency: infra.notificationQueue.concurrency,
    },
  );
}
