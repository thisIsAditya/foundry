import { insertUser } from '@foundry/db';
import { hashApprovalPayload } from '../services/approval-service';
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { appRouter } from './_app';
import { createTestContext, memoryJobQueue } from '../test/context';
import { sql } from '../test/harness';

describe('MVBP, approvals, and Gate C', () => {
  it('blocks a four-feature MVBP and filing.submit, and requires the payload hash to approve', async () => {
    const user = await insertUser(sql, {
      name: 'Founder',
      email: `m8-${randomUUID()}@example.com`,
    });
    const workspace = await appRouter
      .createCaller(await createTestContext(sql, user))
      .workspace.create({ name: 'Acme', idempotencyKey: randomUUID() });
    const project = await appRouter
      .createCaller(await createTestContext(sql, user))
      .project.create({
        workspaceId: workspace.id,
        name: 'Cafe OS',
        idempotencyKey: randomUUID(),
      });
    const ctx = await createTestContext(sql, user);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.pack.upsertSection({
        projectId: project.id,
        section: 'mvbp',
        body: {
          hypothesis: 'Managers will pay to close books faster.',
          capability: 'Close books',
          featureCount: 4,
          paymentPath: 'Razorpay link',
          outOfScope: [],
          killLines: [],
        },
        idempotencyKey: randomUUID(),
      }),
    ).resolves.toMatchObject({ body: { featureCount: 4 } });

    const scoped = await caller.pack.upsertSection({
      projectId: project.id,
      section: 'mvbp',
      body: {
        hypothesis: 'Managers will pay to close books faster.',
        capability: 'Close books',
        featureCount: 1,
        paymentPath: 'Razorpay link',
        outOfScope: ['inventory'],
        killLines: [{ name: 'paid_pilots', threshold: '3', window: '30d' }],
      },
      idempotencyKey: randomUUID(),
    });
    expect(scoped.body).toMatchObject({ featureCount: 1 });

    await expect(
      caller.approval.request({
        projectId: project.id,
        actionType: 'filing.submit',
        payload: { form: 'spice' },
        idempotencyKey: randomUUID(),
      }),
    ).rejects.toMatchObject({ cause: { code: 'policy_forbidden' } });

    await expect(
      caller.approval.request({
        projectId: project.id,
        actionType: 'ads.spend',
        payload: { amount: '5000' },
        idempotencyKey: randomUUID(),
      }),
    ).resolves.toMatchObject({ status: 'pending' });

    const requested = await caller.approval.request({
      projectId: project.id,
      actionType: 'email.send',
      payload: { to: 'prospect@example.com', body: 'Pilot?' },
      idempotencyKey: randomUUID(),
    });
    expect(requested.status).toBe('pending');
    expect(requested.payloadHash).toBe(
      hashApprovalPayload({ to: 'prospect@example.com', body: 'Pilot?' }),
    );

    await expect(
      caller.approval.approve({
        projectId: project.id,
        approvalId: requested.id,
        expectedPayloadHash: 'deadbeef',
        idempotencyKey: randomUUID(),
      }),
    ).rejects.toMatchObject({ cause: { code: 'stale_revision' } });

    const approved = await caller.approval.approve({
      projectId: project.id,
      approvalId: requested.id,
      expectedPayloadHash: requested.payloadHash,
      idempotencyKey: randomUUID(),
    });
    expect(approved.status).toBe('approved');
    expect(memoryJobQueue(ctx).notificationJobs).toHaveLength(1);

    const keys = [
      'paying_strangers',
      'repeat_usage',
      'contribution_margin',
      'retention',
      'distribution',
    ] as const;
    for (const key of keys) {
      const metric = await caller.metric.define({
        projectId: project.id,
        name: key,
        unit: 'count',
        calculationSpec: { gateC: true, key, threshold: '1' },
        idempotencyKey: randomUUID(),
      });
      await caller.metric.recordObservation({
        projectId: project.id,
        metricId: metric.id,
        value: '2',
        idempotencyKey: randomUUID(),
      });
    }
    const gateC = await caller.gate.evaluate({
      projectId: project.id,
      gateType: 'gate_c',
      idempotencyKey: randomUUID(),
    });
    expect(gateC.evaluation.result).toBe('passed');
  });
});
