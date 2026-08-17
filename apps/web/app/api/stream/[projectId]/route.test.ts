import { insertProject, insertWorkspace, insertWorkspaceMembership, insertUser } from '@foundry/db';
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { ACCESS_KEY_COOKIE } from '../../../../lib/access-key';
import { getAuth } from '../../../../lib/auth';
import { sql } from '../../../../server/test/harness';
import { GET } from './route';

describe('project stream auth', () => {
  it('authenticates from the foundry.access-key cookie alone', async () => {
    const owner = await insertUser(sql, {
      name: 'Local Admin',
      email: `stream-admin-${randomUUID()}@example.com`,
      role: 'admin',
    });
    const workspace = await insertWorkspace(sql, { name: 'Acme', ownerUserId: owner.id });
    await insertWorkspaceMembership(sql, {
      workspaceId: workspace.id,
      userId: owner.id,
      role: 'owner',
    });
    const project = await insertProject(sql, { workspaceId: workspace.id, name: 'Venture' });

    const created = await getAuth().api.createApiKey({
      body: { userId: owner.id, name: 'stream-test' },
    });
    const key = 'key' in created && typeof created.key === 'string' ? created.key : undefined;
    expect(key).toBeDefined();
    if (key === undefined) {
      throw new Error('expected raw API key');
    }

    const response = await GET(
      new Request(`http://localhost/api/stream/${project.id}`, {
        headers: { cookie: `${ACCESS_KEY_COOKIE}=${key}` },
      }),
      { params: Promise.resolve({ projectId: project.id }) },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('text/event-stream');
    await response.body?.cancel();
  });

  it('rejects a request with no session at all', async () => {
    const owner = await insertUser(sql, {
      name: 'Owner',
      email: `stream-owner-${randomUUID()}@example.com`,
    });
    const workspace = await insertWorkspace(sql, { name: 'Acme', ownerUserId: owner.id });
    await insertWorkspaceMembership(sql, {
      workspaceId: workspace.id,
      userId: owner.id,
      role: 'owner',
    });
    const project = await insertProject(sql, { workspaceId: workspace.id, name: 'Venture' });

    const response = await GET(new Request(`http://localhost/api/stream/${project.id}`), {
      params: Promise.resolve({ projectId: project.id }),
    });

    expect(response.status).toBe(401);
  });
});
