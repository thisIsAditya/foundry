import {
  runSprint,
  SprintJobDataSchema,
  type SprintJobData,
  type SprintOutcome,
  type StreamBus,
} from '@foundry/agent-runtime';
import {
  getProjectById,
  getSprintById,
  insertGate,
  insertSprintProgressEvent,
  updateSprintStatus,
  withWorkspaceScope,
  type PoolSql,
} from '@foundry/db';
import { AppError } from '@foundry/observability';

import { loadPackSnapshot } from '../pack-snapshot.js';

export type SprintProcessDeps = {
  sql: PoolSql;
  streamBus: StreamBus;
};

export async function processSprintJob(
  data: SprintJobData,
  deps: SprintProcessDeps,
): Promise<SprintOutcome> {
  const job = SprintJobDataSchema.parse(data);
  const workspaceIds = [job.workspaceId];

  return runSprint(job, {
    async loadSprint() {
      const sprint = await withWorkspaceScope(deps.sql, workspaceIds, async (tx) =>
        getSprintById(tx, job.sprintId),
      );
      if (sprint === null || sprint.projectId !== job.projectId) {
        throw new AppError({
          code: 'not_found',
          explanation: 'Sprint not found for this job.',
          nextAction: 'Re-preview and approve the sprint.',
          correlationId: job.correlationId,
        });
      }
      return sprint;
    },
    async loadSnapshot() {
      return withWorkspaceScope(deps.sql, workspaceIds, async (tx) => {
        const project = await getProjectById(tx, job.projectId);
        if (project === null) {
          throw new AppError({
            code: 'not_found',
            explanation: 'Project not found for this sprint.',
            nextAction: 'Re-preview and approve the sprint.',
            correlationId: job.correlationId,
          });
        }
        return loadPackSnapshot(tx, { ...project, currentPackRevisionId: job.packRevisionId });
      });
    },
    async publish(event) {
      await deps.streamBus.publish(job.projectId, event);
    },
    async saveProgress(eventType, payload) {
      await withWorkspaceScope(deps.sql, workspaceIds, async (tx) => {
        await insertSprintProgressEvent(tx, {
          sprintId: job.sprintId,
          eventType,
          payload,
        });
      });
    },
    async markRunning() {
      await withWorkspaceScope(deps.sql, workspaceIds, async (tx) => {
        await updateSprintStatus(tx, job.sprintId, 'running');
      });
    },
    async saveGate(evaluation) {
      await withWorkspaceScope(deps.sql, workspaceIds, async (tx) => {
        await insertGate(tx, {
          projectId: job.projectId,
          gateType: 'gate_a',
          ruleVersion: evaluation.ruleVersion,
          inputs: {
            countedInterviewIds: evaluation.countedInterviewIds,
            checks: evaluation.checks,
          },
          result: evaluation.result,
        });
      });
    },
    async close(status, reason) {
      await withWorkspaceScope(deps.sql, workspaceIds, async (tx) => {
        await updateSprintStatus(tx, job.sprintId, status, reason);
      });
    },
  });
}
