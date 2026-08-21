import { describe, expect, it } from 'vitest';

import { probeMcpServer } from './mcp-bridge.js';
import { createSecretBox } from '../secrets/envelope.js';

describe('mcp-bridge probe', () => {
  it('lists tools from a fixture client and stamps side_effect', async () => {
    const box = createSecretBox('0'.repeat(64));
    const result = await probeMcpServer(
      {
        name: 'fixture',
        transport: 'http',
        url: 'http://127.0.0.1:9/mcp',
        headersEncrypted: null,
      },
      {
        box,
        allowLoopback: true,
        factory: async () => ({
          async tools() {
            return { search: { description: 'Find docs', riskClass: 'read' } };
          },
          async close() {
            return;
          },
        }),
      },
    );
    expect(result.healthStatus).toBe('ok');
    expect(result.tools.mcp_fixture_search?.riskClass).toBe('side_effect');
  });

  it('stamps read when the server is probed with readOnly set', async () => {
    const box = createSecretBox('0'.repeat(64));
    const result = await probeMcpServer(
      {
        name: 'fixture',
        transport: 'http',
        url: 'http://127.0.0.1:9/mcp',
        headersEncrypted: null,
        readOnly: true,
      },
      {
        box,
        allowLoopback: true,
        factory: async () => ({
          async tools() {
            return { search: { description: 'Find docs', riskClass: 'read' } };
          },
          async close() {
            return;
          },
        }),
      },
    );
    expect(result.tools.mcp_fixture_search?.riskClass).toBe('read');
  });

  it('rejects a private URL before opening a client', async () => {
    const box = createSecretBox('0'.repeat(64));
    let opened = false;
    await expect(
      probeMcpServer(
        {
          name: 'internal',
          transport: 'http',
          url: 'http://127.0.0.1:9/mcp',
          headersEncrypted: null,
        },
        {
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
        },
      ),
    ).rejects.toMatchObject({ code: 'policy_forbidden' });
    expect(opened).toBe(false);
  });
});
