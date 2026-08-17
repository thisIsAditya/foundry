import { insertUser } from '@foundry/db';
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { appRouter } from './_app';
import { createTestContext } from '../test/context';
import { sql } from '../test/harness';

describe('integration procedures', () => {
  it('connects and revokes an integration idempotently', async () => {
    const user = await insertUser(sql, {
      name: 'Founder',
      email: `integration-${randomUUID()}@example.com`,
    });
    const workspace = await appRouter
      .createCaller(await createTestContext(sql, user))
      .workspace.create({ name: 'Acme', idempotencyKey: randomUUID() });
    const caller = appRouter.createCaller(await createTestContext(sql, user));

    const connected = await caller.integration.connect({
      workspaceId: workspace.id,
      provider: 'email',
      credential: 'super-secret',
      idempotencyKey: randomUUID(),
    });
    expect(connected.connected).toBe(true);

    const revokeKey = randomUUID();
    const revoked = await caller.integration.revoke({
      workspaceId: workspace.id,
      integrationId: connected.id,
      idempotencyKey: revokeKey,
    });
    expect(revoked.connected).toBe(false);

    const revokedAgain = await caller.integration.revoke({
      workspaceId: workspace.id,
      integrationId: connected.id,
      idempotencyKey: revokeKey,
    });
    expect(revokedAgain).toEqual(revoked);
  });
});
