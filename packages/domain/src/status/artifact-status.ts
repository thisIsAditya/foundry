import { z } from 'zod';

import { canTransition, nextStates } from './transition.js';

export const ArtifactStatuses = [
  'requested',
  'generating',
  'current',
  'failed',
  'stale',
  'superseded',
] as const;

export const ArtifactStatusSchema = z.enum(ArtifactStatuses);
export type ArtifactStatus = z.infer<typeof ArtifactStatusSchema>;

const allowed: Readonly<Record<ArtifactStatus, readonly ArtifactStatus[]>> = {
  requested: ['generating', 'failed'],
  generating: ['current', 'failed'],
  current: ['stale', 'superseded'],
  failed: [],
  stale: [],
  superseded: [],
};

export function canTransitionArtifactStatus(from: ArtifactStatus, to: ArtifactStatus): boolean {
  return canTransition(allowed, from, to);
}

export function nextArtifactStatuses(from: ArtifactStatus): readonly ArtifactStatus[] {
  return nextStates(allowed, from);
}
