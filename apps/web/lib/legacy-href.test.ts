import { describe, expect, it } from 'vitest';

import { legacyAppDestination } from './legacy-href';

describe('legacyAppDestination', () => {
  it('sends workspace URLs to home', () => {
    expect(legacyAppDestination('/w/abc')).toBe('/home');
    expect(legacyAppDestination('/w/abc/settings')).toBe('/home');
  });

  it('maps deleted project routes onto panel query strings', () => {
    expect(legacyAppDestination('/p/aaaa/plan')).toBe('/p/aaaa?panel=plan');
    expect(legacyAppDestination('/p/aaaa/plan/problem')).toBe('/p/aaaa?panel=plan&section=problem');
    expect(legacyAppDestination('/p/aaaa/work', '?view=blocked')).toBe(
      '/p/aaaa?view=blocked&panel=work',
    );
    expect(legacyAppDestination('/p/aaaa/approvals')).toBe('/p/aaaa?panel=work&view=blocked');
    expect(legacyAppDestination('/p/aaaa/co-founder')).toBe('/p/aaaa');
    expect(legacyAppDestination('/p/aaaa/pack/mvbp')).toBe(
      '/p/aaaa?panel=plan&section=mvbp_kill_lines',
    );
  });

  it('leaves the project root alone', () => {
    expect(legacyAppDestination('/p/aaaa')).toBeNull();
    expect(legacyAppDestination('/p/aaaa', '?panel=plan')).toBeNull();
  });
});
