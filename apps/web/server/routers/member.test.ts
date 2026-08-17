import { insertUser } from '@foundry/db';
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { appRouter } from './_app';
import { createTestContext } from '../test/context';
import { sql } from '../test/harness';

describe('member procedures', () => {
  it('invites a member and updates their role idempotently', async () => {
    const owner = await insertUser(sql, {
      name: 'Owner',
      email: `owner-${randomUUID()}@example.com`,
    });
    const invitee = await insertUser(sql, {
      name: 'Invitee',
      email: `invitee-${randomUUID()}@example.com`,
    });
    const workspace = await appRouter
      .createCaller(await createTestContext(sql, owner))
      .workspace.create({ name: 'Acme', idempotencyKey: randomUUID() });
    const caller = appRouter.createCaller(await createTestContext(sql, owner));

    const invited = await caller.member.invite({
      workspaceId: workspace.id,
      email: invitee.email,
      role: 'member',
      idempotencyKey: randomUUID(),
    });
    expect(invited.role).toBe('member');

    const updateKey = randomUUID();
    const updated = await caller.member.updateRole({
      workspaceId: workspace.id,
      membershipId: invited.id,
      role: 'admin',
      idempotencyKey: updateKey,
    });
    expect(updated.role).toBe('admin');

    const updatedAgain = await caller.member.updateRole({
      workspaceId: workspace.id,
      membershipId: invited.id,
      role: 'admin',
      idempotencyKey: updateKey,
    });
    expect(updatedAgain).toEqual(updated);
  });
});
