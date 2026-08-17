import { describe, expect, it } from 'vitest';

import { sslConfigFromDatabaseUrl } from './ssl.js';

describe('sslConfigFromDatabaseUrl', () => {
  it('leaves local Compose URLs unencrypted', () => {
    expect(
      sslConfigFromDatabaseUrl('postgres://foundry:foundry@localhost:5432/foundry'),
    ).toBeUndefined();
  });

  it('enables TLS verification when sslmode is require', () => {
    expect(
      sslConfigFromDatabaseUrl('postgres://foundry:x@db.example:5432/foundry?sslmode=require'),
    ).toEqual({ rejectUnauthorized: true });
  });
});
