import { describe, expect, it } from 'vitest';

import { ACCESS_KEY_COOKIE, headersWithAccessKey } from './access-key';

describe('headersWithAccessKey', () => {
  it('copies the access-key cookie onto x-api-key', () => {
    const request = new Request('http://localhost/home', {
      headers: { cookie: `${ACCESS_KEY_COOKIE}=secret-key` },
    });
    expect(headersWithAccessKey(request).get('x-api-key')).toBe('secret-key');
  });

  it('leaves an existing x-api-key header in place', () => {
    const request = new Request('http://localhost/home', {
      headers: {
        'x-api-key': 'from-header',
        cookie: `${ACCESS_KEY_COOKIE}=from-cookie`,
      },
    });
    expect(headersWithAccessKey(request).get('x-api-key')).toBe('from-header');
  });
});
