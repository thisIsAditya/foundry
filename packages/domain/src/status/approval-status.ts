import { z } from 'zod';

import { canTransition, nextStates } from './transition.js';

export const ApprovalStatuses = [
  'pending',
  'approved',
  'executed',
  'rejected',
  'expired',
  'execution_failed',
] as const;

export const ApprovalStatusSchema = z.enum(ApprovalStatuses);
export type ApprovalStatus = z.infer<typeof ApprovalStatusSchema>;

const allowed: Readonly<Record<ApprovalStatus, readonly ApprovalStatus[]>> = {
  pending: ['approved', 'rejected', 'expired'],
  approved: ['executed', 'execution_failed'],
  executed: [],
  rejected: [],
  expired: [],
  execution_failed: [],
};

export function canTransitionApprovalStatus(from: ApprovalStatus, to: ApprovalStatus): boolean {
  return canTransition(allowed, from, to);
}

export function nextApprovalStatuses(from: ApprovalStatus): readonly ApprovalStatus[] {
  return nextStates(allowed, from);
}
