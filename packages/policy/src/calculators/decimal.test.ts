import { describe, expect, it } from 'vitest';

import { add, div, mul, parseDecimal, percentOf } from './decimal.js';

describe('decimal arithmetic', () => {
  it('multiplies and divides at four-decimal scale without floats', () => {
    expect(mul('19.99', '3')).toBe('59.97');
    expect(div('10', '4')).toBe('2.5');
    expect(add('0.1', '0.2')).toBe('0.3');
    expect(percentOf('100', '-20')).toBe('80');
  });

  it('rejects values beyond the configured scale', () => {
    expect(() => parseDecimal('1.12345')).toThrow(/scale/);
  });
});
