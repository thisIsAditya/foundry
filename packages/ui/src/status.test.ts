import { describe, expect, it } from 'vitest';

import { artifactStatusPresentation, sectionStatusPresentation } from './status.js';

describe('status presentation', () => {
  it('maps domain statuses to a shared label and color token', () => {
    expect(sectionStatusPresentation('stale').label).toBe('Stale');
    expect(sectionStatusPresentation('evidence_required').colorToken).toBe('statusWarning');
    expect(artifactStatusPresentation('generating').label).toBe('Generating');
  });
});
