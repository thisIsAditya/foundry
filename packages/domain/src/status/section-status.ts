import { z } from 'zod';

export const SectionStatuses = [
  'not_started',
  'draft',
  'evidence_required',
  'review_required',
  'accepted',
  'stale',
  'blocked',
  'superseded',
] as const;

export const SectionStatusSchema = z.enum(SectionStatuses);
export type SectionStatus = z.infer<typeof SectionStatusSchema>;
