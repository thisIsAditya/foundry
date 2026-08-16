import { z } from 'zod';

import { InstantSchema } from './primitives.js';

export const TimeWindowKinds = ['observed', 'forecast'] as const;
export const TimeWindowKindSchema = z.enum(TimeWindowKinds);
export type TimeWindowKind = z.infer<typeof TimeWindowKindSchema>;

export const TimeWindowSchema = z.object({
  start: InstantSchema,
  end: InstantSchema,
  timezone: z.string().min(1),
  kind: TimeWindowKindSchema,
});
export type TimeWindow = z.infer<typeof TimeWindowSchema>;
