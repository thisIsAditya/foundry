import { describe, expect, it } from 'vitest';

import { resolveCapabilityId, CAPABILITY_IDS } from './registry.js';

describe('capability registry', () => {
  it('resolves versioned and unversioned names to the typed V5 set', () => {
    expect(resolveCapabilityId('venture.readCurrentState@1')).toBe('venture.readCurrentState@1');
    expect(resolveCapabilityId('proposal.createDraft')).toBe('proposal.createDraft@1');
    expect(resolveCapabilityId('artifact.createDraft')).toBeNull();
    expect(CAPABILITY_IDS).not.toContain('artifact.createDraft@1');
  });
});
