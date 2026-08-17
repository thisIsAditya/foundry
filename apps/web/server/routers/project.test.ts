import { insertUser, insertWorkspace, insertWorkspaceMembership } from '@foundry/db';
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { appRouter } from './_app';
import { createTestContext, memoryStreamBus } from '../test/context';
import { createClarificationTestModel } from '../test/mock-model';
import { sql } from '../test/harness';

describe('project procedures', () => {
  it('creates and lists a project in a workspace the user belongs to', async () => {
    const user = await insertUser(sql, {
      name: 'Founder',
      email: `proj-${randomUUID()}@example.com`,
    });
    const createdWorkspace = await appRouter
      .createCaller(await createTestContext(sql, user))
      .workspace.create({ name: 'Acme', idempotencyKey: randomUUID() });
    const caller = appRouter.createCaller(await createTestContext(sql, user));
    const created = await caller.project.create({
      workspaceId: createdWorkspace.id,
      name: 'Venture',
      geography: 'IN',
      objective: 'bootstrap',
      idempotencyKey: randomUUID(),
    });
    expect(created.name).toBe('Venture');
    expect(created.workspaceId).toBe(createdWorkspace.id);
    expect(created.founderObjective).toBe('bootstrap');
    expect(created.currentPhase).toBe('diagnose');

    const listed = await caller.project.list({ workspaceId: createdWorkspace.id });
    expect(listed.map((project) => project.id)).toEqual([created.id]);

    const desk = await caller.project.getDeskSummary({ projectId: created.id });
    expect(desk.phase).toBe('diagnose');
    expect(desk.moneyRulesSet).toBe(false);
    expect(desk.nextAction).toBe('Set canonical MoneyRules.');
    expect(desk.overview.runningAiWork).toEqual([]);
    expect(
      desk.overview.overallScore === null || typeof desk.overview.overallScore === 'number',
    ).toBe(true);
  });

  it('answers a clarification through a mocked model and publishes text_delta', async () => {
    const user = await insertUser(sql, {
      name: 'Founder',
      email: `ans-${randomUUID()}@example.com`,
    });
    const workspace = await appRouter
      .createCaller(await createTestContext(sql, user))
      .workspace.create({ name: 'Acme', idempotencyKey: randomUUID() });
    const languageModel = createClarificationTestModel('What is the painful job to be done?');
    const ctx = await createTestContext(sql, user, { languageModel });
    const caller = appRouter.createCaller(ctx);
    const project = await caller.project.create({
      workspaceId: workspace.id,
      name: 'Venture',
      idempotencyKey: randomUUID(),
    });

    const answered = await caller.project.answerClarification({
      projectId: project.id,
      questionId: 'problem',
      answer: 'Owners lose two hours closing the books.',
      idempotencyKey: randomUUID(),
    });
    expect(answered.text).toContain('painful job');
    expect(
      memoryStreamBus(ctx).entries.some(
        (entry) => entry.event.type === 'text_delta' && entry.event.delta.includes('painful'),
      ),
    ).toBe(true);
  });

  it('rejects project create without a session', async () => {
    const caller = appRouter.createCaller(await createTestContext(sql, null));
    await expect(
      caller.project.create({
        workspaceId: '11111111-1111-4111-8111-111111111111',
        name: 'Nope',
        idempotencyKey: randomUUID(),
      }),
    ).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
      cause: { code: 'unauthorized' },
    });
  });

  it('forbids a viewer from creating a project', async () => {
    const owner = await insertUser(sql, {
      name: 'Owner',
      email: `owner-${randomUUID()}@example.com`,
    });
    const viewer = await insertUser(sql, {
      name: 'Viewer',
      email: `viewer-${randomUUID()}@example.com`,
    });
    const workspace = await insertWorkspace(sql, {
      name: 'Acme',
      ownerUserId: owner.id,
    });
    await insertWorkspaceMembership(sql, {
      workspaceId: workspace.id,
      userId: owner.id,
      role: 'owner',
    });
    await insertWorkspaceMembership(sql, {
      workspaceId: workspace.id,
      userId: viewer.id,
      role: 'viewer',
    });

    const caller = appRouter.createCaller(await createTestContext(sql, viewer));
    await expect(
      caller.project.create({
        workspaceId: workspace.id,
        name: 'Blocked',
        idempotencyKey: randomUUID(),
      }),
    ).rejects.toMatchObject({
      code: 'FORBIDDEN',
      cause: { code: 'policy_forbidden' },
    });

    const listed = await caller.project.list({ workspaceId: workspace.id });
    expect(listed).toEqual([]);
  });
});
