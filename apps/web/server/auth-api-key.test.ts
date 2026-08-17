import { insertUser } from '@foundry/db';
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { POST } from '../app/api/auth/verify-access-key/route';
import { getAuth } from '../lib/auth';
import { sql } from './test/harness';

describe('admin API key round trip', () => {
  it('creates, verifies, and resolves a session from x-api-key', async () => {
    const user = await insertUser(sql, {
      name: 'Local Admin',
      email: `admin-${randomUUID()}@example.com`,
      role: 'admin',
    });

    const created = await getAuth().api.createApiKey({
      body: {
        userId: user.id,
        name: 'contract-test',
      },
    });
    const key = 'key' in created && typeof created.key === 'string' ? created.key : undefined;
    expect(key).toBeDefined();
    if (key === undefined) {
      throw new Error('expected raw API key');
    }

    const response = await POST(
      new Request('http://localhost/api/auth/verify-access-key', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ key }),
      }),
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      valid: true,
      displayName: 'Local Admin',
    });

    const session = await getAuth().api.getSession({
      headers: new Headers({ 'x-api-key': key }),
    });
    expect(session?.user.id).toBe(user.id);
  });

  it('rejects a founder-role key on verify-access-key', async () => {
    const user = await insertUser(sql, {
      name: 'Founder',
      email: `founder-${randomUUID()}@example.com`,
      role: 'founder',
    });
    const created = await getAuth().api.createApiKey({
      body: {
        userId: user.id,
        name: 'should-fail',
      },
    });
    const key = 'key' in created && typeof created.key === 'string' ? created.key : undefined;
    expect(key).toBeDefined();

    const response = await POST(
      new Request('http://localhost/api/auth/verify-access-key', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ key }),
      }),
    );
    expect(response.status).toBe(401);
  });
});
