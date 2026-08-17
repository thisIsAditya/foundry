import { RenderJobDataSchema } from '@foundry/artifacts';
import { infra } from '@foundry/config/infra';
import {
  getLatestRenderJobByVersionId,
  updateArtifactVersionStatus,
  updateRenderJobStatus,
  withWorkspaceScope,
  type PoolSql,
} from '@foundry/db';
import { ArtifactVersionIdSchema, WorkspaceIdSchema } from '@foundry/domain';
import { Worker, type ConnectionOptions } from 'bullmq';

import { processRenderJob } from '../render/process.js';
import type { ObjectStore } from '../storage/object-store.js';

export type RenderWorkerDeps = {
  sql: PoolSql;
  connection: ConnectionOptions;
  objectStore: ObjectStore;
  queueName?: string;
};

export function startRenderWorker(deps: RenderWorkerDeps): Worker {
  const queueName = deps.queueName ?? infra.queues.render;
  const worker = new Worker(
    queueName,
    async (job) => {
      await processRenderJob(RenderJobDataSchema.parse(job.data), {
        sql: deps.sql,
        objectStore: deps.objectStore,
      });
    },
    {
      connection: deps.connection,
      concurrency: infra.renderQueue.concurrency,
    },
  );

  worker.on('failed', (job, error) => {
    if (job === undefined) {
      return;
    }
    const attempts = job.opts.attempts ?? infra.renderQueue.attempts;
    if (job.attemptsMade < attempts) {
      return;
    }
    const parsed = RenderJobDataSchema.safeParse(job.data);
    const versionId = ArtifactVersionIdSchema.safeParse(job.data?.artifactVersionId);
    const workspaceId = WorkspaceIdSchema.safeParse(job.data?.workspaceId);
    if (!versionId.success || !workspaceId.success) {
      return;
    }
    void withWorkspaceScope(deps.sql, [workspaceId.data], async (tx) => {
      await updateArtifactVersionStatus(tx, versionId.data, 'failed');
      if (parsed.success) {
        const renderJob = await getLatestRenderJobByVersionId(tx, parsed.data.artifactVersionId);
        if (renderJob !== null) {
          await updateRenderJobStatus(
            tx,
            renderJob.id,
            'failed',
            error instanceof Error ? error.message : 'render_failed',
          );
        }
      }
    }).catch(() => {
      void error;
    });
  });

  return worker;
}
