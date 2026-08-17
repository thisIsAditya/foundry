import { describe, expect, it } from 'vitest';

import {
  artifactStatusPresentation,
  businessModelSectionStatusPresentation,
  productJobStatusPresentation,
  sectionStatusPresentation,
} from './status.js';

describe('status presentation', () => {
  it('maps domain statuses to a shared label, icon, and color token', () => {
    expect(sectionStatusPresentation('stale').label).toBe('Stale');
    expect(sectionStatusPresentation('evidence_required').colorToken).toBe('statusWarning');
    expect(sectionStatusPresentation('stale').icon).toBe('↻');
    expect(artifactStatusPresentation('generating').label).toBe('Generating');
    expect(businessModelSectionStatusPresentation('assumption_heavy').label).toBe(
      'Assumption-heavy',
    );
    expect(productJobStatusPresentation('needs_founder').label).toBe('Needs you');
  });
});
