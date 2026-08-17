import { SprintJobDataSchema, type SprintJobData } from '@foundry/agent-runtime';
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
export type { SprintJobData };

export type JobQueue = {
  enqueueIngestion(data: IngestionJobData): Promise<void>;
  enqueueSprint(data: SprintJobData): Promise<void>;
};

export type MemoryJobQueue = JobQueue & {
  readonly jobs: IngestionJobData[];
  readonly sprintJobs: SprintJobData[];
};

export function createMemoryJobQueue(): MemoryJobQueue {
  const jobs: IngestionJobData[] = [];
  const sprintJobs: SprintJobData[] = [];
  return {
    jobs,
    sprintJobs,
    async enqueueIngestion(data) {
      if (jobs.some((job) => job.sourceId === data.sourceId)) {
        return;
      }
      jobs.push(data);
    },
    async enqueueSprint(data) {
      if (sprintJobs.some((job) => job.sprintId === data.sprintId)) {
        return;
      }
      SprintJobDataSchema.parse(data);
      sprintJobs.push(data);
    },
  };
}

export function createBullmqJobQueue(redisUrl: string): JobQueue {
  const connection = { url: redisUrl, maxRetriesPerRequest: null };
  const ingestion = new Queue(infra.queues.ingestion, {
    connection,
    defaultJobOptions: {
      attempts: infra.ingestion.attempts,
      backoff: { type: 'exponential', delay: infra.ingestion.backoffMs },
      removeOnComplete: 1000,
      removeOnFail: 5000,
    },
  });
  const sprint = new Queue(infra.queues.sprint, {
    connection,
    defaultJobOptions: {
      attempts: infra.sprintQueue.attempts,
      removeOnComplete: 1000,
      removeOnFail: 5000,
    },
  });

  return {
    async enqueueIngestion(data) {
      try {
        await ingestion.add('ingest', data, { jobId: `ingestion-${data.sourceId}` });
      } catch (error) {
        if (error instanceof Error && /already exists/i.test(error.message)) {
          return;
        }
        throw error;
      }
    },
    async enqueueSprint(data) {
      try {
        await sprint.add('run', data, { jobId: `sprint-${data.sprintId}` });
      } catch (error) {
        if (error instanceof Error && /already exists/i.test(error.message)) {
          return;
        }
        throw error;
      }
    },
  };
}
