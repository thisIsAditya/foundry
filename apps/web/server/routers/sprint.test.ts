import { insertUser } from '@foundry/db';
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { appRouter } from './_app';
import { createTestContext, memoryJobQueue } from '../test/context';
import { sql } from '../test/harness';

describe('sprint procedures', () => {
  it('previews a sprint and enqueues it on approve', async () => {
    const user = await insertUser(sql, {
      name: 'Founder',
      email: `sprint-${randomUUID()}@example.com`,
    });
    const workspace = await appRouter
      .createCaller(await createTestContext(sql, user))
      .workspace.create({ name: 'Acme', idempotencyKey: randomUUID() });
    const ctx = await createTestContext(sql, user);
    const caller = appRouter.createCaller(ctx);
    const project = await caller.project.create({
      workspaceId: workspace.id,
      name: 'Venture',
      idempotencyKey: randomUUID(),
    });

    const previewed = await caller.sprint.preview({
      projectId: project.id,
      idempotencyKey: randomUUID(),
    });
    expect(previewed.sprint.status).toBe('draft');
    expect(previewed.contractHash).toHaveLength(64);

    const listed = await caller.sprint.listByProject({ projectId: project.id });
    expect(listed).toEqual([expect.objectContaining({ id: previewed.sprint.id, status: 'draft' })]);

    const desk = await caller.project.getDeskSummary({ projectId: project.id });
    expect(desk.currentSprint).toEqual({
      id: previewed.sprint.id,
      status: 'draft',
      contractHash: previewed.contractHash,
    });

    const approved = await caller.sprint.approvePlan({
      sprintId: previewed.sprint.id,
      expectedContractHash: previewed.contractHash,
      idempotencyKey: randomUUID(),
    });
    expect(approved.status).toBe('contracted');
    expect(memoryJobQueue(ctx).sprintJobs).toEqual([
      expect.objectContaining({
        sprintId: previewed.sprint.id,
        projectId: project.id,
        workspaceId: workspace.id,
      }),
    ]);

    const deskAfterApproval = await caller.project.getDeskSummary({ projectId: project.id });
    expect(deskAfterApproval.currentSprint?.status).toBe('contracted');

    const pauseKey = randomUUID();
    const paused = await caller.sprint.pause({
      sprintId: previewed.sprint.id,
      idempotencyKey: pauseKey,
    });
    expect(paused.status).toBe('paused');
    const pausedAgain = await caller.sprint.pause({
      sprintId: previewed.sprint.id,
      idempotencyKey: pauseKey,
    });
    expect(pausedAgain).toEqual(paused);

    const resumed = await caller.sprint.resume({
      sprintId: previewed.sprint.id,
      idempotencyKey: randomUUID(),
    });
    expect(resumed.status).toBe('running');

    const stopped = await caller.sprint.stop({
      sprintId: previewed.sprint.id,
      idempotencyKey: randomUUID(),
    });
    expect(stopped.status).toBe('closed');
  });
});
