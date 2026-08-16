import { describe, expect, it } from 'vitest';

import { canTransitionApprovalStatus } from './approval-status.js';

describe('approval status', () => {
  it('allows pending to approved to executed', () => {
    expect(canTransitionApprovalStatus('pending', 'approved')).toBe(true);
    expect(canTransitionApprovalStatus('approved', 'executed')).toBe(true);
  });

  it('allows pending to rejected or expired', () => {
    expect(canTransitionApprovalStatus('pending', 'rejected')).toBe(true);
    expect(canTransitionApprovalStatus('pending', 'expired')).toBe(true);
  });

  it('treats execution failure as distinct from approval failure', () => {
    expect(canTransitionApprovalStatus('approved', 'execution_failed')).toBe(true);
    expect(canTransitionApprovalStatus('pending', 'execution_failed')).toBe(false);
    expect(canTransitionApprovalStatus('execution_failed', 'rejected')).toBe(false);
  });
});
