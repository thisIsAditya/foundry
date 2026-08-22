import { insertUser, insertWorkspace, insertWorkspaceMembership } from '@foundry/db';
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { appRouter } from './_app';
import { createTestContext } from '../test/context';
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

    const listed = await caller.project.list({ workspaceId: createdWorkspace.id });
    expect(listed.map((project) => project.id)).toEqual([created.id]);

    const overview = await caller.journey.getOverview({ projectId: created.id });
    expect(overview.journey.currentStage).toBe('problem');
    expect(overview.recommendedStep).not.toBeNull();
  });

  it('inserts a problem statement when founderPitch is long enough', async () => {
    const user = await insertUser(sql, {
      name: 'Founder',
      email: `pitch-${randomUUID()}@example.com`,
    });
    const workspace = await appRouter
      .createCaller(await createTestContext(sql, user))
      .workspace.create({ name: 'Acme', idempotencyKey: randomUUID() });
    const caller = appRouter.createCaller(await createTestContext(sql, user));
    const pitch = 'Cafe owners lose two hours every night closing the books by hand.';
    const created = await caller.project.create({
      workspaceId: workspace.id,
      name: 'Cafe books',
      geography: 'IN',
      founderPitch: pitch,
      idempotencyKey: randomUUID(),
    });
    const sections = await caller.record.listSections({ projectId: created.id });
    const idea = sections.find((item) => item.section === 'idea_founder_context');
    expect(idea?.item.content.summary).toContain(pitch);
    expect(idea?.item.provenance).toBe('founder_input');
    const overview = await caller.journey.getOverview({ projectId: created.id });
    expect(overview.journey.currentStage).toBe('problem');
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
