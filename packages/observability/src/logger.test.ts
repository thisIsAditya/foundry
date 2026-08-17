import { Writable } from 'node:stream';

import { describe, expect, it } from 'vitest';

import { createLogger } from './logger.js';

describe('logger redaction', () => {
  it('redacts sensitive field names regardless of case', async () => {
    const lines: string[] = [];
    const stream = new Writable({
      write(chunk, _encoding, callback) {
        lines.push(String(chunk));
        callback();
      },
    });
    const logger = createLogger('test', stream);
    logger.info({ apiKey: 'sk-live', refreshToken: 'abc', nested: { Password: 'x' } }, 'probe');

    await new Promise((resolve) => setTimeout(resolve, 10));
    const payload = lines.join('');
    expect(payload).not.toContain('sk-live');
    expect(payload).not.toContain('abc');
    expect(payload).toContain('[Redacted]');
  });
});
