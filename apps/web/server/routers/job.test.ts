import { insertUser } from '@foundry/db';
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { appRouter } from './_app';
import { createTestContext } from '../test/context';
import { createClarificationTestModel } from '../test/mock-model';
import { sql } from '../test/harness';

describe('job procedures', () => {
  it('lists and reads the proposed baseline research job and replays settings updates', async () => {
    const user = await insertUser(sql, {
      name: 'Founder',
      email: `job-${randomUUID()}@example.com`,
    });
    const languageModel = createClarificationTestModel('What is the painful job to be done?');
    const workspace = await appRouter
      .createCaller(await createTestContext(sql, user))
      .workspace.create({ name: 'Acme', idempotencyKey: randomUUID() });
    const caller = appRouter.createCaller(await createTestContext(sql, user, { languageModel }));
    const project = await caller.project.create({
      workspaceId: workspace.id,
      name: 'Cafe books',
      geography: 'India',
      idempotencyKey: randomUUID(),
    });

    const listed = await caller.job.list({ projectId: project.id, view: 'kanban' });
    expect(listed.some((job) => job.jobKind === 'research')).toBe(true);
    const research = listed.find((job) => job.jobKind === 'research');
    if (research === undefined) {
      throw new Error('expected a research job');
    }
    const got = await caller.job.get({ projectId: project.id, jobId: research.id });
    expect(got.id).toBe(research.id);
    expect(got.status).toBe(research.status);

    const contract = await caller.sprint.getContract({ sprintId: research.id });
    const key = randomUUID();
    const updated = await caller.job.updateSettings({
      projectId: project.id,
      jobId: research.id,
      expectedVersion: contract.contractHash,
      patch: { whyNow: 'Score is still evidence-starved.' },
      idempotencyKey: key,
    });
    expect(updated.contract.whyNow).toBe('Score is still evidence-starved.');
    const replayed = await caller.job.updateSettings({
      projectId: project.id,
      jobId: research.id,
      expectedVersion: contract.contractHash,
      patch: { whyNow: 'Score is still evidence-starved.' },
      idempotencyKey: key,
    });
    expect(replayed.id).toBe(updated.id);
  });

  it('rejects job reads without a session', async () => {
    const caller = appRouter.createCaller(await createTestContext(sql, null));
    await expect(
      caller.job.list({
        projectId: '11111111-1111-4111-8111-111111111111',
        view: 'kanban',
      }),
    ).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
      cause: { code: 'unauthorized' },
    });
  });
});
