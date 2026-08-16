import { describe, expect, it } from 'vitest';

import { canTransitionAssumptionStatus, nextAssumptionStatuses } from './assumption-status.js';

describe('assumption status', () => {
  it('allows the documented happy path', () => {
    expect(canTransitionAssumptionStatus('untested', 'testing')).toBe(true);
    expect(canTransitionAssumptionStatus('testing', 'supported')).toBe(true);
    expect(canTransitionAssumptionStatus('supported', 'held')).toBe(true);
  });

  it('allows the documented contradiction path', () => {
    expect(canTransitionAssumptionStatus('testing', 'contradicted')).toBe(true);
    expect(canTransitionAssumptionStatus('contradicted', 'killed')).toBe(true);
  });

  it('allows a return to testing after the market changes', () => {
    expect(canTransitionAssumptionStatus('supported', 'testing')).toBe(true);
    expect(canTransitionAssumptionStatus('held', 'testing')).toBe(true);
    expect(canTransitionAssumptionStatus('contradicted', 'testing')).toBe(true);
  });

  it('rejects skipped and reverse transitions', () => {
    expect(canTransitionAssumptionStatus('untested', 'held')).toBe(false);
    expect(canTransitionAssumptionStatus('killed', 'testing')).toBe(false);
    expect(nextAssumptionStatuses('killed')).toEqual([]);
  });
});
