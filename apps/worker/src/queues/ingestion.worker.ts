import { infra } from '@foundry/config/infra';
import { updateSourceStatus, withWorkspaceScope, type PoolSql } from '@foundry/db';
import { SourceIdSchema, WorkspaceIdSchema } from '@foundry/domain';
import { Worker, type ConnectionOptions } from 'bullmq';

import { processIngestionJob } from '../ingestion/process.js';
import type { ObjectStore } from '../storage/object-store.js';

export type IngestionWorkerDeps = {
  sql: PoolSql;
  connection: ConnectionOptions;
  objectStore: ObjectStore;
  clamdHost?: string;
  clamdPort?: number;
  queueName?: string;
};

export function startIngestionWorker(deps: IngestionWorkerDeps): Worker {
  const queueName = deps.queueName ?? infra.queues.ingestion;
  const worker = new Worker(
    queueName,
    async (job) => {
      await processIngestionJob(job.data, {
        sql: deps.sql,
        objectStore: deps.objectStore,
        ...(deps.clamdHost === undefined
          ? {}
          : {
              malware: {
                clamdHost: deps.clamdHost,
                ...(deps.clamdPort === undefined ? {} : { clamdPort: deps.clamdPort }),
              },
            }),
      });
    },
    {
      connection: deps.connection,
      concurrency: infra.ingestion.concurrency,
    },
  );

  worker.on('failed', (job, error) => {
    if (job === undefined) {
      return;
    }
    const attempts = job.opts.attempts ?? infra.ingestion.attempts;
    if (job.attemptsMade < attempts) {
      return;
    }
    const sourceId = SourceIdSchema.safeParse(job.data?.sourceId);
    const workspaceId = WorkspaceIdSchema.safeParse(job.data?.workspaceId);
    if (!sourceId.success || !workspaceId.success) {
      return;
    }
    void withWorkspaceScope(deps.sql, [workspaceId.data], async (tx) => {
      await updateSourceStatus(tx, sourceId.data, 'failed', 'ingestion_failed');
    }).catch(() => {
      void error;
    });
  });

  return worker;
}
