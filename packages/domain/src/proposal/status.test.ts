import { describe, expect, it } from 'vitest';

import {
  canReviewProposal,
  canTransitionCofounderOperationState,
  canTransitionProposalStatus,
  isCancelableCofounderOperationState,
  isTerminalCofounderOperationState,
  proposalStatusFromOutcomes,
} from './status.js';

describe('proposal review', () => {
  it('accepts a full accept set and a mixed set as partial', () => {
    expect(proposalStatusFromOutcomes(['accept', 'accept'])).toBe('accepted');
    expect(proposalStatusFromOutcomes(['accept', 'keep_current'])).toBe('partially_accepted');
    expect(proposalStatusFromOutcomes(['keep_current', 'keep_current'])).toBe('rejected');
    expect(proposalStatusFromOutcomes(['modify'])).toBe('accepted');
  });

  it('allows review of awaiting proposals and forbids mutating an accepted one', () => {
    expect(canReviewProposal('awaiting_founder')).toBe(true);
    expect(canReviewProposal('accepted')).toBe(false);
    expect(canTransitionProposalStatus('awaiting_founder', 'accepted')).toBe(true);
    expect(canTransitionProposalStatus('accepted', 'awaiting_founder')).toBe(false);
    expect(canTransitionProposalStatus('rejected', 'accepted')).toBe(false);
  });

  it('allows queued work to run or cancel and forbids resurrecting a terminal operation', () => {
    expect(canTransitionCofounderOperationState('queued', 'running')).toBe(true);
    expect(canTransitionCofounderOperationState('running', 'awaiting_founder')).toBe(true);
    expect(canTransitionCofounderOperationState('running', 'completed')).toBe(true);
    expect(canTransitionCofounderOperationState('completed', 'running')).toBe(false);
    expect(canTransitionCofounderOperationState('canceled', 'completed')).toBe(false);
    expect(isTerminalCofounderOperationState('failed')).toBe(true);
    expect(isTerminalCofounderOperationState('awaiting_founder')).toBe(false);
    expect(isCancelableCofounderOperationState('awaiting_founder')).toBe(true);
    expect(isCancelableCofounderOperationState('running')).toBe(true);
    expect(isCancelableCofounderOperationState('completed')).toBe(false);
  });
});
