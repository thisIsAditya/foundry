import { describe, expect, it } from 'vitest';

import { AppError, isAppError } from './errors.js';

describe('AppError', () => {
  it('carries the plan/13 §7 vocabulary fields', () => {
    const error = new AppError({
      code: 'unauthorized',
      explanation: 'Sign in to continue.',
      nextAction: 'Authenticate and retry.',
      correlationId: '11111111-1111-4111-8111-111111111111',
    });

    expect(isAppError(error)).toBe(true);
    expect(error.code).toBe('unauthorized');
    expect(error.retryable).toBe(false);
    expect(error.nextAction).toBe('Authenticate and retry.');
    expect(error.correlationId).toBe('11111111-1111-4111-8111-111111111111');
  });
});
