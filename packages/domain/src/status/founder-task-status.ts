import { z } from 'zod';

import { canTransition, nextStates } from './transition.js';

export const FounderTaskStatuses = [
  'proposed',
  'active',
  'completed',
  'deferred',
  'skipped',
] as const;
export const FounderTaskStatusSchema = z.enum(FounderTaskStatuses);
export type FounderTaskStatus = z.infer<typeof FounderTaskStatusSchema>;

const allowed: Readonly<Record<FounderTaskStatus, readonly FounderTaskStatus[]>> = {
  proposed: ['active', 'deferred', 'skipped'],
  active: ['completed', 'deferred', 'skipped'],
  completed: [],
  deferred: ['active', 'skipped'],
  skipped: [],
};

export function canTransitionFounderTaskStatus(
  from: FounderTaskStatus,
  to: FounderTaskStatus,
): boolean {
  return canTransition(allowed, from, to);
}

export function nextFounderTaskStatuses(from: FounderTaskStatus): readonly FounderTaskStatus[] {
  return nextStates(allowed, from);
}
