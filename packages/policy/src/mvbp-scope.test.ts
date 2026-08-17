import { describe, expect, it } from 'vitest';

import { evaluateMvbpScope } from './mvbp-scope.js';

describe('evaluateMvbpScope', () => {
  it('flags four or more features, a missing payment path, and a missing hypothesis', () => {
    const result = evaluateMvbpScope({
      hypothesis: '   ',
      featureCount: 4,
      paymentPath: null,
    });
    expect(result.result).toBe('failed');
    expect(result.checks.find((check) => check.id === 'feature_count')?.passed).toBe(false);
    expect(result.checks.find((check) => check.id === 'payment_path')?.passed).toBe(false);
    expect(result.checks.find((check) => check.id === 'hypothesis')?.passed).toBe(false);
  });

  it('passes a one-capability MVBP with a payment path', () => {
    const result = evaluateMvbpScope({
      hypothesis: 'Kitchen managers will pay to close books in 20 minutes.',
      featureCount: 1,
      paymentPath: 'Razorpay payment link',
    });
    expect(result.result).toBe('passed');
  });
});
