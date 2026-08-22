import { z } from 'zod';

import { canTransition, nextStates } from '../status/transition.js';

export const ProposalStatuses = [
  'draft',
  'awaiting_founder',
  'accepted',
  'partially_accepted',
  'rejected',
  'expired',
  'superseded',
] as const;
export const ProposalStatusSchema = z.enum(ProposalStatuses);
export type ProposalStatus = z.infer<typeof ProposalStatusSchema>;

export const ProposalChangeOutcomes = ['accept', 'modify', 'keep_current'] as const;
export const ProposalChangeOutcomeSchema = z.enum(ProposalChangeOutcomes);
export type ProposalChangeOutcome = z.infer<typeof ProposalChangeOutcomeSchema>;

export const CofounderInteractionTypes = [
  'ask',
  'inform',
  'recommend',
  'generate',
  'review',
  'change',
] as const;
export const CofounderInteractionTypeSchema = z.enum(CofounderInteractionTypes);
export type CofounderInteractionType = z.infer<typeof CofounderInteractionTypeSchema>;

export const CofounderOperationStates = [
  'queued',
  'running',
  'awaiting_founder',
  'completed',
  'failed',
  'canceled',
  'timed_out',
] as const;
export const CofounderOperationStateSchema = z.enum(CofounderOperationStates);
export type CofounderOperationState = z.infer<typeof CofounderOperationStateSchema>;

export const CofounderRuntimeKinds = ['direct', 'harness'] as const;
export const CofounderRuntimeKindSchema = z.enum(CofounderRuntimeKinds);
export type CofounderRuntimeKind = z.infer<typeof CofounderRuntimeKindSchema>;

const PROPOSAL_STATUS_TRANSITIONS: Readonly<Record<ProposalStatus, readonly ProposalStatus[]>> = {
  draft: ['awaiting_founder', 'expired', 'superseded', 'rejected'],
  awaiting_founder: ['accepted', 'partially_accepted', 'rejected', 'expired', 'superseded'],
  accepted: [],
  partially_accepted: ['accepted', 'superseded'],
  rejected: [],
  expired: ['superseded'],
  superseded: [],
};

export function canTransitionProposalStatus(from: ProposalStatus, to: ProposalStatus): boolean {
  return canTransition(PROPOSAL_STATUS_TRANSITIONS, from, to);
}

export function nextProposalStatuses(from: ProposalStatus): readonly ProposalStatus[] {
  return nextStates(PROPOSAL_STATUS_TRANSITIONS, from);
}

export function proposalStatusFromOutcomes(
  outcomes: readonly ProposalChangeOutcome[],
): ProposalStatus {
  if (outcomes.length === 0) {
    return 'rejected';
  }
  const accepted = outcomes.filter((item) => item === 'accept' || item === 'modify').length;
  if (accepted === 0) {
    return 'rejected';
  }
  if (accepted === outcomes.length) {
    return 'accepted';
  }
  return 'partially_accepted';
}

export function canReviewProposal(status: ProposalStatus): boolean {
  return status === 'draft' || status === 'awaiting_founder' || status === 'partially_accepted';
}

const COFOUNDER_OPERATION_TRANSITIONS: Readonly<
  Record<CofounderOperationState, readonly CofounderOperationState[]>
> = {
  queued: ['running', 'canceled', 'timed_out'],
  running: ['awaiting_founder', 'completed', 'failed', 'canceled', 'timed_out'],
  awaiting_founder: ['completed', 'canceled', 'failed'],
  completed: [],
  failed: [],
  canceled: [],
  timed_out: [],
};

export function canTransitionCofounderOperationState(
  from: CofounderOperationState,
  to: CofounderOperationState,
): boolean {
  return canTransition(COFOUNDER_OPERATION_TRANSITIONS, from, to);
}

export function nextCofounderOperationStates(
  from: CofounderOperationState,
): readonly CofounderOperationState[] {
  return nextStates(COFOUNDER_OPERATION_TRANSITIONS, from);
}

export function isTerminalCofounderOperationState(state: CofounderOperationState): boolean {
  return (
    state === 'completed' || state === 'failed' || state === 'canceled' || state === 'timed_out'
  );
}

export function isCancelableCofounderOperationState(state: CofounderOperationState): boolean {
  return state === 'queued' || state === 'running' || state === 'awaiting_founder';
}
