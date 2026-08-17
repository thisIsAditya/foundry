import { insertUser, insertWorkspace, insertWorkspaceMembership } from '@foundry/db';
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { appRouter } from './_app';
import { createTestContext } from '../test/context';
import { sql } from '../test/harness';

describe('workspace procedures', () => {
  it('creates and lists a workspace for the signed-in user', async () => {
    const user = await insertUser(sql, {
      name: 'Founder',
      email: `founder-${randomUUID()}@example.com`,
    });
    const caller = appRouter.createCaller(await createTestContext(sql, user));
    const created = await caller.workspace.create({
      name: 'Acme',
      idempotencyKey: randomUUID(),
    });
    expect(created.name).toBe('Acme');
    expect(created.ownerUserId).toBe(user.id);

    const listed = await appRouter
      .createCaller(await createTestContext(sql, user))
      .workspace.list();
    expect(listed.map((workspace) => workspace.id)).toEqual([created.id]);
  });

  it('returns the same workspace for a repeated idempotency key', async () => {
    const user = await insertUser(sql, {
      name: 'Founder',
      email: `idem-${randomUUID()}@example.com`,
    });
    const ctx = await createTestContext(sql, user);
    const caller = appRouter.createCaller(ctx);
    const idempotencyKey = randomUUID();
    const first = await caller.workspace.create({ name: 'Once', idempotencyKey });
    const second = await caller.workspace.create({ name: 'Once', idempotencyKey });
    expect(second.id).toBe(first.id);
  });

  it('rejects unauthenticated list and create', async () => {
    const caller = appRouter.createCaller(await createTestContext(sql, null));
    await expect(caller.workspace.list()).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
      cause: { code: 'unauthorized' },
    });
    await expect(
      caller.workspace.create({ name: 'Nope', idempotencyKey: randomUUID() }),
    ).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
      cause: { code: 'unauthorized' },
    });
  });

  it('does not list another user workspace', async () => {
    const owner = await insertUser(sql, {
      name: 'Owner',
      email: `owner-${randomUUID()}@example.com`,
    });
    const other = await insertUser(sql, {
      name: 'Other',
      email: `other-${randomUUID()}@example.com`,
    });
    const workspace = await insertWorkspace(sql, {
      name: 'Hidden',
      ownerUserId: owner.id,
    });
    await insertWorkspaceMembership(sql, {
      workspaceId: workspace.id,
      userId: owner.id,
      role: 'owner',
    });

    const listed = await appRouter
      .createCaller(await createTestContext(sql, other))
      .workspace.list();
    expect(listed).toEqual([]);
  });
});
