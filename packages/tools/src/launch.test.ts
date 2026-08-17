import { describe, expect, it } from 'vitest';

import { filingSubmitTool, mvbpScopeCheckTool } from './launch.js';

describe('launch tools', () => {
  it('exposes deterministic MVBP checks and a forbidden filing tool', () => {
    expect(mvbpScopeCheckTool.description).toMatch(/Instant-fail/);
    expect(filingSubmitTool.description).toMatch(/Always forbidden/);
  });
});
