import { describe, expect, it } from 'vitest';

import { createSecretBox } from './envelope.js';

describe('secret box', () => {
  it('round-trips a provider key and never stores plaintext', () => {
    const box = createSecretBox('0'.repeat(64));
    const sealed = box.encrypt('sk-ant-secret');
    expect(sealed.startsWith('v1.')).toBe(true);
    expect(sealed.includes('sk-ant-secret')).toBe(false);
    expect(box.decrypt(sealed)).toBe('sk-ant-secret');
  });
});
