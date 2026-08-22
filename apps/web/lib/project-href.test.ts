import { describe, expect, it } from 'vitest';

import {
  projectCofounderHref,
  projectDecisionsHref,
  projectEvidenceHref,
  projectHref,
  projectJourneyHref,
  projectModelHref,
  projectPanelHref,
} from './project-href';

describe('project hrefs', () => {
  it('builds founder destinations instead of drawer query strings', () => {
    expect(projectHref('aaaa')).toBe('/p/aaaa');
    expect(projectJourneyHref('aaaa')).toBe('/p/aaaa/journey');
    expect(projectJourneyHref('aaaa', 'step-1')).toBe('/p/aaaa/journey/step-1');
    expect(projectModelHref('aaaa', 'problem')).toBe('/p/aaaa/model/problem');
    expect(projectEvidenceHref('aaaa')).toBe('/p/aaaa/evidence');
    expect(projectDecisionsHref('aaaa')).toBe('/p/aaaa/decisions');
    expect(projectCofounderHref('aaaa')).toBe('/p/aaaa/co-founder');
    expect(projectPanelHref('aaaa', 'plan', { section: 'problem' })).toBe('/p/aaaa/model/problem');
    expect(projectPanelHref('aaaa', 'work')).toBe('/p/aaaa/journey');
    expect(projectPanelHref('aaaa', 'research')).toBe('/p/aaaa/evidence');
  });
});
