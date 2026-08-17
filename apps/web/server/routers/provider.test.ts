import { insertUser, insertWorkspace, insertWorkspaceMembership } from '@foundry/db';
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { appRouter } from './_app';
import { createTestContext } from '../test/context';
import { sql } from '../test/harness';

describe('provider procedures', () => {
  it('connects with an injected probe and never lists ciphertext', async () => {
    const user = await insertUser(sql, {
      name: 'Founder',
      email: `prov-${randomUUID()}@example.com`,
    });
    const workspace = await appRouter
      .createCaller(await createTestContext(sql, user))
      .workspace.create({ name: 'Acme', idempotencyKey: randomUUID() });
    const ctx = await createTestContext(sql, user);
    const caller = appRouter.createCaller(ctx);
    const secret = `sk-live-${randomUUID()}`;

    const connected = await caller.provider.connect({
      workspaceId: workspace.id,
      family: 'anthropic',
      authMode: 'api_key',
      credential: secret,
      idempotencyKey: randomUUID(),
    });
    expect(connected.hasCredential).toBe(true);
    expect(connected.healthStatus).toBe('ok');
    expect(JSON.stringify(connected)).not.toContain(secret);
    expect(connected).not.toHaveProperty('credentialRefEncrypted');

    const listed = await caller.provider.listConnections({ workspaceId: workspace.id });
    expect(listed).toHaveLength(1);
    expect(JSON.stringify(listed)).not.toContain(secret);
    expect(listed[0]).not.toHaveProperty('credentialRefEncrypted');
    expect(listed[0]?.hasCredential).toBe(true);
  });

  it('forbids a viewer from connecting a provider', async () => {
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
      caller.provider.connect({
        workspaceId: workspace.id,
        family: 'anthropic',
        authMode: 'platform_env',
        idempotencyKey: randomUUID(),
      }),
    ).rejects.toMatchObject({
      code: 'FORBIDDEN',
      cause: { code: 'policy_forbidden' },
    });

    const listed = await caller.provider.listConnections({ workspaceId: workspace.id });
    expect(listed).toEqual([]);
  });
});
