import { randomUUID } from 'node:crypto';

import {
  getApprovalRequestById,
  insertApprovalRequest,
  insertProject,
  insertUser,
  insertWorkspace,
} from '@foundry/db';
import { describe, expect, it } from 'vitest';

import { sql } from '../test/harness.js';
import { processNotificationJob } from './process.js';

describe('notification processor', () => {
  it('executes an approved request once and writes a weekly digest', async () => {
    const owner = await insertUser(sql, {
      name: 'Owner',
      email: `notify-${randomUUID()}@example.com`,
    });
    const workspace = await insertWorkspace(sql, {
      name: 'Acme',
      ownerUserId: owner.id,
    });
    const project = await insertProject(sql, {
      workspaceId: workspace.id,
      name: 'Cafe OS',
    });
    const approval = await insertApprovalRequest(sql, {
      projectId: project.id,
      actionType: 'email.send',
      payload: { to: 'a@example.com' },
      payloadHash: 'abc123',
      requestedBy: owner.id,
      expiresAt: new Date(Date.now() + 60_000),
    });
    await sql`
      update approval_requests set status = 'approved', decided_by_user_id = ${owner.id}
      where id = ${approval.id}
    `;

    const correlationId = randomUUID();
    await processNotificationJob(
      {
        kind: 'execute_approval',
        workspaceId: workspace.id,
        projectId: project.id,
        approvalId: approval.id,
        correlationId,
      },
      sql,
    );
    expect((await getApprovalRequestById(sql, approval.id))?.status).toBe('executed');

    await processNotificationJob(
      {
        kind: 'execute_approval',
        workspaceId: workspace.id,
        projectId: project.id,
        approvalId: approval.id,
        correlationId,
      },
      sql,
    );

    await processNotificationJob(
      {
        kind: 'weekly_digest',
        correlationId,
      },
      sql,
    );

    const events = await sql<
      { event_type: string; payload_json: { pendingApprovalCount: number } }[]
    >`
      select event_type, payload_json from domain_events order by id
    `;
    expect(events.filter((row) => row.event_type === 'notification.execute_approval')).toHaveLength(
      1,
    );
    const digest = events.find((row) => row.event_type === 'notification.weekly_digest');
    expect(digest?.payload_json.pendingApprovalCount).toBe(0);
  });
});
