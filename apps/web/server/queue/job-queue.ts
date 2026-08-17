import { infra } from '@foundry/config/infra';
import { ProjectIdSchema, SourceIdSchema, WorkspaceIdSchema } from '@foundry/domain';
import { Queue } from 'bullmq';
import { z } from 'zod';

export const IngestionJobDataSchema = z.object({
  sourceId: SourceIdSchema,
  projectId: ProjectIdSchema,
  workspaceId: WorkspaceIdSchema,
  correlationId: z.string().min(1),
});
export type IngestionJobData = z.infer<typeof IngestionJobDataSchema>;

export type JobQueue = {
  enqueueIngestion(data: IngestionJobData): Promise<void>;
};

export function createMemoryJobQueue(): JobQueue & { readonly jobs: IngestionJobData[] } {
  const jobs: IngestionJobData[] = [];
  return {
    jobs,
    async enqueueIngestion(data) {
      if (jobs.some((job) => job.sourceId === data.sourceId)) {
        return;
      }
      jobs.push(data);
    },
  };
}

export function createBullmqJobQueue(redisUrl: string): JobQueue {
  const queue = new Queue(infra.queues.ingestion, {
    connection: { url: redisUrl, maxRetriesPerRequest: null },
    defaultJobOptions: {
      attempts: infra.ingestion.attempts,
      backoff: { type: 'exponential', delay: infra.ingestion.backoffMs },
      removeOnComplete: 1000,
      removeOnFail: 5000,
    },
  });

  return {
    async enqueueIngestion(data) {
      try {
        await queue.add('ingest', data, { jobId: `ingestion-${data.sourceId}` });
      } catch (error) {
        if (error instanceof Error && /already exists/i.test(error.message)) {
          return;
        }
        throw error;
      }
    },
  };
}
