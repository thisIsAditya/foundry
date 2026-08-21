import { UserMcpServerIdSchema, UserIdSchema, type UserMcpServer } from '@foundry/domain';
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { loadUserMcpTools } from './load-user-mcp-tools.js';
import { createSecretBox } from '../secrets/envelope.js';

function server(overrides: Partial<UserMcpServer>): UserMcpServer {
  return {
    id: UserMcpServerIdSchema.parse(randomUUID()),
    userId: UserIdSchema.parse(randomUUID()),
    name: 'fixture',
    transport: 'http',
    url: 'http://127.0.0.1:9/mcp',
    headersEncrypted: null,
    enabled: true,
    readOnly: false,
    healthStatus: 'ok',
    lastToolCount: null,
    lastValidatedAt: null,
    createdAt: new Date(),
    ...overrides,
  };
}

describe('loadUserMcpTools', () => {
  const box = createSecretBox('0'.repeat(64));

  it('loads and prefixes tools from enabled servers, tagging them side_effect', async () => {
    const loaded = await loadUserMcpTools([server({})], {
      box,
      allowLoopback: true,
      factory: async () => ({
        async tools() {
          return { search: { description: 'Find docs' } as never };
        },
        async close() {
          return;
        },
      }),
    });
    expect(Object.keys(loaded.tools)).toEqual(['mcp_fixture_search']);
    expect(loaded.riskClasses.mcp_fixture_search).toBe('side_effect');
  });

  it('tags tools read for a server the founder has opted in as readOnly', async () => {
    const loaded = await loadUserMcpTools([server({ readOnly: true })], {
      box,
      allowLoopback: true,
      factory: async () => ({
        async tools() {
          return { search: { description: 'Find docs' } as never };
        },
        async close() {
          return;
        },
      }),
    });
    expect(loaded.riskClasses.mcp_fixture_search).toBe('read');
  });

  it('skips disabled servers without opening a client', async () => {
    let opened = false;
    const loaded = await loadUserMcpTools([server({ enabled: false })], {
      box,
      allowLoopback: true,
      factory: async () => {
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
    });
    expect(opened).toBe(false);
    expect(loaded.tools).toEqual({});
  });

  it('skips a server blocked by the SSRF guard rather than throwing', async () => {
    let opened = false;
    const loaded = await loadUserMcpTools([server({ url: 'http://10.0.0.5/mcp' })], {
      box,
      factory: async () => {
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
    });
    expect(opened).toBe(false);
    expect(loaded.tools).toEqual({});
  });
});
