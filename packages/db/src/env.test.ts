import { describe, expect, it } from 'vitest';

import { defaultLocalDatabaseUrl, getDatabaseUrl, parseDbEnv } from './env.js';

describe('parseDbEnv', () => {
  it('requires DATABASE_URL on an explicit source', () => {
    expect(() => parseDbEnv({})).toThrow();
  });
});

describe('getDatabaseUrl', () => {
  it('uses the Compose default when DATABASE_URL is unset', () => {
    expect(getDatabaseUrl({})).toBe(defaultLocalDatabaseUrl);
  });

  it('keeps an explicit DATABASE_URL', () => {
    expect(getDatabaseUrl({ DATABASE_URL: 'postgres://app:secret@db:5432/app' })).toBe(
      'postgres://app:secret@db:5432/app',
    );
  });
});
