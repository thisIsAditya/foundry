import {
  SprintJobDataSchema,
  type ProviderSecrets,
  type SecretBox,
  type StreamBus,
} from '@foundry/agent-runtime';
import { infra } from '@foundry/config/infra';
import { updateSprintStatus, withWorkspaceScope, type PoolSql } from '@foundry/db';
import { Worker, type ConnectionOptions } from 'bullmq';

import { processSprintJob } from '../sprint/process.js';

export type SprintWorkerDeps = {
  sql: PoolSql;
  connection: ConnectionOptions;
  streamBus: StreamBus;
  secretBox: SecretBox;
  secrets: ProviderSecrets;
  queueName?: string;
};

export function startSprintWorker(deps: SprintWorkerDeps): Worker {
  const queueName = deps.queueName ?? infra.queues.sprint;
  const worker = new Worker(
    queueName,
    async (job) => {
      await processSprintJob(SprintJobDataSchema.parse(job.data), {
        sql: deps.sql,
        streamBus: deps.streamBus,
        secretBox: deps.secretBox,
        secrets: deps.secrets,
      });
    },
    {
      connection: deps.connection,
      concurrency: infra.sprintQueue.concurrency,
      lockDuration: infra.sprintQueue.lockDurationMs,
    },
  );

  worker.on('failed', (job, error) => {
    if (job === undefined) {
      return;
    }
    const parsed = SprintJobDataSchema.safeParse(job.data);
    if (!parsed.success) {
      return;
    }
    void withWorkspaceScope(deps.sql, [parsed.data.workspaceId], async (tx) => {
      await updateSprintStatus(tx, parsed.data.sprintId, 'failed', 'sprint_failed');
    }).catch(() => {
      void error;
    });
  });

  return worker;
}
