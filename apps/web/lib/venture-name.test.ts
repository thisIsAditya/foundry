import { describe, expect, it } from 'vitest';

import { ventureNameFromPitch } from './venture-name';

describe('ventureNameFromPitch', () => {
  it('uses the first line and truncates long names', () => {
    expect(ventureNameFromPitch('Cafe books\nOwners lose two hours.')).toBe('Cafe books');
    expect(ventureNameFromPitch('   ')).toBe('Untitled venture');
    expect(ventureNameFromPitch('A'.repeat(80)).length).toBe(58);
  });
});
