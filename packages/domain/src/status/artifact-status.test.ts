import { describe, expect, it } from 'vitest';

import { canTransitionArtifactStatus } from './artifact-status.js';

describe('artifact status', () => {
  it('allows requested to generating to current', () => {
    expect(canTransitionArtifactStatus('requested', 'generating')).toBe(true);
    expect(canTransitionArtifactStatus('generating', 'current')).toBe(true);
  });

  it('allows failure from requested or generating', () => {
    expect(canTransitionArtifactStatus('requested', 'failed')).toBe(true);
    expect(canTransitionArtifactStatus('generating', 'failed')).toBe(true);
  });

  it('marks current artifacts stale or superseded', () => {
    expect(canTransitionArtifactStatus('current', 'stale')).toBe(true);
    expect(canTransitionArtifactStatus('current', 'superseded')).toBe(true);
    expect(canTransitionArtifactStatus('stale', 'current')).toBe(false);
  });
});
