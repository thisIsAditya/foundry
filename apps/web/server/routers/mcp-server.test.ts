import { insertUser } from '@foundry/db';
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { appRouter } from './_app';
import { createTestContext } from '../test/context';
import { sql } from '../test/harness';

describe('mcpServer procedures', () => {
  it('adds a server against a fixture client', async () => {
    const user = await insertUser(sql, {
      name: 'Founder',
      email: `mcp-${randomUUID()}@example.com`,
    });
    const caller = appRouter.createCaller(await createTestContext(sql, user));
    const added = await caller.mcpServer.add({
      name: 'fixture',
      transport: 'http',
      url: `http://127.0.0.1:9/mcp-${randomUUID()}`,
      idempotencyKey: randomUUID(),
    });
    expect(added.healthStatus).toBe('ok');
    expect(added.tools?.some((tool) => tool.name.includes('search'))).toBe(true);

    const listed = await caller.mcpServer.list();
    expect(listed).toHaveLength(1);
    expect(listed[0]).not.toHaveProperty('headersEncrypted');

    const toggleKey = randomUUID();
    const toggled = await caller.mcpServer.toggle({
      mcpServerId: added.id,
      enabled: false,
      idempotencyKey: toggleKey,
    });
    expect(toggled.enabled).toBe(false);
    const toggledAgain = await caller.mcpServer.toggle({
      mcpServerId: added.id,
      enabled: false,
      idempotencyKey: toggleKey,
    });
    expect(toggledAgain).toEqual(toggled);

    const removeKey = randomUUID();
    const removed = await caller.mcpServer.remove({
      mcpServerId: added.id,
      idempotencyKey: removeKey,
    });
    expect(removed).toEqual({ ok: true });
    const removedAgain = await caller.mcpServer.remove({
      mcpServerId: added.id,
      idempotencyKey: removeKey,
    });
    expect(removedAgain).toEqual({ ok: true });

    expect(await caller.mcpServer.list()).toHaveLength(0);
  });

  it('rejects a private URL before opening a client', async () => {
    const user = await insertUser(sql, {
      name: 'Founder',
      email: `ssrf-${randomUUID()}@example.com`,
    });
    let opened = false;
    const caller = appRouter.createCaller(
      await createTestContext(sql, user, {
        allowMcpLoopback: false,
        mcpFactory: async () => {
          opened = true;
          return {
            async tools() {
              return {};
            },
            async close() {
              return;
            },
          };
        },
      }),
    );
    await expect(
      caller.mcpServer.add({
        name: 'internal',
        transport: 'http',
        url: 'http://127.0.0.1:9/mcp',
        idempotencyKey: randomUUID(),
      }),
    ).rejects.toMatchObject({
      code: 'FORBIDDEN',
      cause: { code: 'policy_forbidden' },
    });
    expect(opened).toBe(false);
  });
});
