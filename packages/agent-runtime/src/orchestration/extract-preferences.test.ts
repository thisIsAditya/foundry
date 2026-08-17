import { describe, expect, it } from 'vitest';

import { extractPreferencesFromText } from './extract-preferences.js';

describe('extractPreferencesFromText', () => {
  it('extracts geography and budget keywords without a model call', () => {
    const found = extractPreferencesFromText(
      'We are bootstrapped in Pune and prefer concise updates.',
    );
    expect(found.map((item) => item.key).sort()).toEqual(
      ['budget', 'communication_style', 'geography'].sort(),
    );
  });
});
