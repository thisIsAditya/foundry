import { describe, expect, it } from 'vitest';

import { legacyAppDestination } from './legacy-href';

describe('legacyAppDestination', () => {
  it('sends workspace URLs to home', () => {
    expect(legacyAppDestination('/w/abc')).toBe('/home');
    expect(legacyAppDestination('/w/abc/settings')).toBe('/home');
  });

  it('maps deleted drawer routes onto founder destinations', () => {
    expect(legacyAppDestination('/p/aaaa/plan')).toBe('/p/aaaa/model');
    expect(legacyAppDestination('/p/aaaa/plan/problem')).toBe('/p/aaaa/model/problem');
    expect(legacyAppDestination('/p/aaaa/work', '?view=blocked')).toBe('/p/aaaa/journey');
    expect(legacyAppDestination('/p/aaaa/approvals')).toBe('/p/aaaa/decisions');
    expect(legacyAppDestination('/p/aaaa/pack/mvbp')).toBe(
      '/p/aaaa/model/next_validation_experiment',
    );
    expect(legacyAppDestination('/p/aaaa', '?panel=plan&section=problem')).toBe(
      '/p/aaaa/model/problem',
    );
    expect(legacyAppDestination('/p/aaaa', '?panel=research')).toBe('/p/aaaa/evidence');
    expect(legacyAppDestination('/p/aaaa/co-founder')).toBe('/p/aaaa');
  });

  it('leaves the new founder destinations alone', () => {
    expect(legacyAppDestination('/p/aaaa')).toBeNull();
    expect(legacyAppDestination('/p/aaaa/journey')).toBeNull();
    expect(legacyAppDestination('/p/aaaa', '?panel=settings')).toBeNull();
  });
});
