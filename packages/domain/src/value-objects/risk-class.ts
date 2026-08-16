import { z } from 'zod';

export const RiskClasses = ['read', 'compute', 'draft', 'side_effect', 'forbidden'] as const;
export const RiskClassSchema = z.enum(RiskClasses);
export type RiskClass = z.infer<typeof RiskClassSchema>;
