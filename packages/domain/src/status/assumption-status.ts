import { z } from 'zod';

import { canTransition, nextStates } from './transition.js';

export const AssumptionStatuses = [
  'untested',
  'testing',
  'supported',
  'held',
  'contradicted',
  'killed',
] as const;

export const AssumptionStatusSchema = z.enum(AssumptionStatuses);
export type AssumptionStatus = z.infer<typeof AssumptionStatusSchema>;

const allowed: Readonly<Record<AssumptionStatus, readonly AssumptionStatus[]>> = {
  untested: ['testing'],
  testing: ['supported', 'contradicted'],
  supported: ['held', 'testing'],
  held: ['testing'],
  contradicted: ['killed', 'testing'],
  killed: [],
};

export function canTransitionAssumptionStatus(
  from: AssumptionStatus,
  to: AssumptionStatus,
): boolean {
  return canTransition(allowed, from, to);
}

export function nextAssumptionStatuses(from: AssumptionStatus): readonly AssumptionStatus[] {
  return nextStates(allowed, from);
}
