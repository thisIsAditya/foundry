import { describe, expect, it } from 'vitest';

import { V5_EVAL_FIXTURES } from './fixtures.js';

describe('V5 eval fixtures', () => {
  it('covers the required founder and co-founder failure scenarios', () => {
    expect(V5_EVAL_FIXTURES.map((item) => item.id)).toEqual([
      'sparse-new-idea',
      'stale-assumptions',
      'contradictory-sources',
      'manual-interview',
      'three-interview-bundle',
      'research-with-citations',
      'research-no-result',
      'duplicate-import',
    ]);
    expect(V5_EVAL_FIXTURES.every((item) => item.expect.consentInferredTrue !== true)).toBe(true);
  });
});
