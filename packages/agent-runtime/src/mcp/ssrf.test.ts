import { describe, expect, it } from 'vitest';

import { assertPublicHttpUrl } from './ssrf.js';

describe('MCP SSRF guard', () => {
  it('rejects loopback, link-local, and private ranges', async () => {
    await expect(assertPublicHttpUrl('http://127.0.0.1:9/mcp')).rejects.toMatchObject({
      code: 'policy_forbidden',
    });
    await expect(
      assertPublicHttpUrl('http://169.254.169.254/latest/meta-data'),
    ).rejects.toMatchObject({
      code: 'policy_forbidden',
    });
    await expect(assertPublicHttpUrl('http://10.0.0.1/mcp')).rejects.toMatchObject({
      code: 'policy_forbidden',
    });
  });

  it('allows loopback only when the test fixture flag is set', async () => {
    const url = await assertPublicHttpUrl('http://127.0.0.1:9/mcp', { allowLoopback: true });
    expect(url.hostname).toBe('127.0.0.1');
  });
});
