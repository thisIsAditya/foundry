import { SprintJobDataSchema, type SprintJobData } from '@foundry/agent-runtime';
import { RenderJobDataSchema, type RenderJobData } from '@foundry/artifacts';
import { infra } from '@foundry/config/infra';
import {
  ApprovalRequestIdSchema,
  ProjectIdSchema,
  SourceIdSchema,
  WorkspaceIdSchema,
} from '@foundry/domain';
import { Queue } from 'bullmq';
import { z } from 'zod';

export const IngestionJobDataSchema = z.object({
  sourceId: SourceIdSchema,
  projectId: ProjectIdSchema,
  workspaceId: WorkspaceIdSchema,
  correlationId: z.string().min(1),
});
export type IngestionJobData = z.infer<typeof IngestionJobDataSchema>;
export type { SprintJobData, RenderJobData };

export const NotificationJobDataSchema = z.object({
  kind: z.enum([
    'execute_approval',
    'weekly_digest',
    'compliance_reminder',
    'research_completed',
    'job_needs_founder',
    'revision_ready',
    'job_failed_or_blocked',
    'founder_task_due',
    'score_changed_materially',
    'budget_threshold_reached',
  ]),
  projectId: ProjectIdSchema,
  workspaceId: WorkspaceIdSchema,
  correlationId: z.string().min(1),
  approvalId: ApprovalRequestIdSchema.optional(),
});
export type NotificationJobData = z.infer<typeof NotificationJobDataSchema>;

export type JobQueue = {
  enqueueIngestion(data: IngestionJobData): Promise<void>;
  enqueueSprint(data: SprintJobData): Promise<void>;
  enqueueRender(data: RenderJobData): Promise<void>;
  enqueueNotification(data: NotificationJobData): Promise<void>;
};

export type MemoryJobQueue = JobQueue & {
  readonly jobs: IngestionJobData[];
  readonly sprintJobs: SprintJobData[];
  readonly renderJobs: RenderJobData[];
  readonly notificationJobs: NotificationJobData[];
};

export function createMemoryJobQueue(): MemoryJobQueue {
  const jobs: IngestionJobData[] = [];
  const sprintJobs: SprintJobData[] = [];
  const renderJobs: RenderJobData[] = [];
  const notificationJobs: NotificationJobData[] = [];
  return {
    jobs,
    sprintJobs,
    renderJobs,
    notificationJobs,
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
    async enqueueRender(data) {
      if (renderJobs.some((job) => job.artifactVersionId === data.artifactVersionId)) {
        return;
      }
      RenderJobDataSchema.parse(data);
      renderJobs.push(data);
    },
    async enqueueNotification(data) {
      NotificationJobDataSchema.parse(data);
      notificationJobs.push(data);
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
  const render = new Queue(infra.queues.render, {
    connection,
    defaultJobOptions: {
      attempts: infra.renderQueue.attempts,
      backoff: { type: 'exponential', delay: infra.renderQueue.backoffMs },
      removeOnComplete: 1000,
      removeOnFail: 5000,
    },
  });
  const notification = new Queue(infra.queues.notification, {
    connection,
    defaultJobOptions: {
      attempts: infra.notificationQueue.attempts,
      backoff: { type: 'exponential', delay: infra.notificationQueue.backoffMs },
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
    async enqueueRender(data) {
      try {
        await render.add('render', data, { jobId: `render-${data.artifactVersionId}` });
      } catch (error) {
        if (error instanceof Error && /already exists/i.test(error.message)) {
          return;
        }
        throw error;
      }
    },
    async enqueueNotification(data) {
      const suffix = data.approvalId ?? `${data.kind}-${data.projectId}-${data.correlationId}`;
      try {
        await notification.add(data.kind, data, { jobId: `notification-${suffix}` });
      } catch (error) {
        if (error instanceof Error && /already exists/i.test(error.message)) {
          return;
        }
        throw error;
      }
    },
  };
}
