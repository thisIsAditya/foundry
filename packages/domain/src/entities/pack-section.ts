import { z } from 'zod';

import { PackRevisionIdSchema, PackSectionIdSchema } from '../ids.js';
import { PackSectionKeySchema } from '../status/launch-status.js';
import { InstantSchema } from '../value-objects/primitives.js';

export const KillLineSchema = z.object({
  name: z.string().min(1),
  threshold: z.string().min(1),
  window: z.string().min(1),
});
export type KillLine = z.infer<typeof KillLineSchema>;

export const MvbpSectionBodySchema = z.object({
  hypothesis: z.string(),
  capability: z.string(),
  timeBoxDays: z.number().int().positive().nullable().default(null),
  featureCount: z.number().int().nonnegative(),
  paymentPath: z.string().nullable().default(null),
  outOfScope: z.array(z.string()),
  killLines: z.array(KillLineSchema),
  founderAssertions: z.array(z.string()).default([]),
});
export type MvbpSectionBody = z.infer<typeof MvbpSectionBodySchema>;

export const GtmSectionBodySchema = z.object({
  firstHundredPlan: z.string(),
  channel: z.string(),
  adsFirst: z.boolean(),
  founderAssertions: z.array(z.string()).default([]),
});
export type GtmSectionBody = z.infer<typeof GtmSectionBodySchema>;

export const OrgCostSectionBodySchema = z.object({
  skills: z.array(z.string()),
  monthlyBurn: z.string(),
  runwayMonths: z.string(),
  founderAssertions: z.array(z.string()).default([]),
});
export type OrgCostSectionBody = z.infer<typeof OrgCostSectionBodySchema>;

export const LegalSectionBodySchema = z.object({
  jurisdiction: z.literal('IN'),
  watermark: z.literal(true),
  neverFiles: z.literal(true),
  items: z.array(
    z.object({
      id: z.string().min(1),
      question: z.string().min(1),
      status: z.enum(['open', 'draft', 'reviewed']),
    }),
  ),
  founderAssertions: z.array(z.string()).default([]),
});
export type LegalSectionBody = z.infer<typeof LegalSectionBodySchema>;

export const LaunchSectionBodySchema = z.object({
  checklist: z.array(
    z.object({
      id: z.string().min(1),
      label: z.string().min(1),
      done: z.boolean(),
    }),
  ),
  log: z.array(
    z.object({
      at: InstantSchema,
      note: z.string().min(1),
    }),
  ),
  founderAssertions: z.array(z.string()).default([]),
});
export type LaunchSectionBody = z.infer<typeof LaunchSectionBodySchema>;

export const PackSectionBodySchema = z.union([
  MvbpSectionBodySchema,
  GtmSectionBodySchema,
  OrgCostSectionBodySchema,
  LegalSectionBodySchema,
  LaunchSectionBodySchema,
]);
export type PackSectionBody = z.infer<typeof PackSectionBodySchema>;

export const PackSectionSchema = z.object({
  id: PackSectionIdSchema,
  packRevisionId: PackRevisionIdSchema,
  section: PackSectionKeySchema,
  body: PackSectionBodySchema,
  createdAt: InstantSchema,
});
export type PackSection = z.infer<typeof PackSectionSchema>;
