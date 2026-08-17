import { describe, expect, it } from 'vitest';

import { trpcHeaders } from './session-headers';

describe('trpcHeaders', () => {
  it('prefers an access key over a session cookie', () => {
    expect(trpcHeaders({ cookie: 'better-auth.session=abc', apiKey: 'foundry_test' })).toEqual({
      'x-api-key': 'foundry_test',
    });
  });

  it('omits headers when no credential is stored', () => {
    expect(trpcHeaders({})).toEqual({});
  });
});
