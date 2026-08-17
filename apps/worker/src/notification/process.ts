import {
  getApprovalRequestById,
  getProjectById,
  insertDomainEvent,
  listApprovalRequestsByProjectId,
  listProjects,
  updateApprovalRequestDecision,
  withWorkspaceScope,
  type PoolSql,
} from '@foundry/db';
import type { Project } from '@foundry/domain';
import { AppError } from '@foundry/observability';

import type { NotificationJobData } from './job.js';

async function writeProjectNotification(
  sql: PoolSql,
  data: NotificationJobData,
  project: Project,
): Promise<void> {
  await withWorkspaceScope(sql, [project.workspaceId], async (tx) => {
    const pending = await listApprovalRequestsByProjectId(tx, project.id, 'pending');
    await insertDomainEvent(tx, {
      eventType: `notification.${data.kind}`,
      workspaceId: project.workspaceId,
      projectId: project.id,
      actorType: 'system',
      actorId: 'notification-worker',
      correlationId: data.correlationId,
      payload: {
        kind: data.kind,
        projectName: project.name,
        pendingApprovalCount: pending.length,
        nextActions: pending.map((item) => item.actionType),
      },
    });
  });
}

export async function processNotificationJob(
  data: NotificationJobData,
  sql: PoolSql,
): Promise<void> {
  if (data.kind !== 'execute_approval') {
    if (data.projectId === undefined) {
      const projects = await listProjects(sql);
      for (const project of projects) {
        await writeProjectNotification(sql, data, project);
      }
      return;
    }
    const project = await getProjectById(sql, data.projectId);
    if (project === null) {
      throw new AppError({
        code: 'not_found',
        explanation: 'Project not found for digest.',
        nextAction: 'Ignore if the project was deleted.',
      });
    }
    await writeProjectNotification(sql, data, project);
    return;
  }

  const workspaceId = data.workspaceId;
  const approvalId = data.approvalId;
  if (workspaceId === undefined || approvalId === undefined) {
    throw new AppError({
      code: 'invalid_input',
      explanation: 'execute_approval requires workspaceId and approvalId.',
      nextAction: 'Re-enqueue the job with the approval id.',
    });
  }

  await withWorkspaceScope(sql, [workspaceId], async (tx) => {
    const existing = await getApprovalRequestById(tx, approvalId);
    if (existing === null) {
      throw new AppError({
        code: 'not_found',
        explanation: 'Approval not found for execution.',
        nextAction: 'Ignore if the request was deleted.',
      });
    }
    if (existing.status === 'executed') {
      return;
    }
    if (existing.status !== 'approved') {
      throw new AppError({
        code: 'invalid_input',
        explanation: `Cannot execute an approval in status ${existing.status}.`,
        nextAction: 'Approve the request first.',
      });
    }
    await updateApprovalRequestDecision(tx, existing.id, 'executed', existing.decidedByUserId);
    await insertDomainEvent(tx, {
      eventType: 'notification.execute_approval',
      workspaceId,
      projectId: existing.projectId,
      actorType: 'system',
      actorId: 'notification-worker',
      correlationId: data.correlationId,
      payload: {
        kind: data.kind,
        approvalId: existing.id,
        actionType: existing.actionType,
      },
    });
  });
}
