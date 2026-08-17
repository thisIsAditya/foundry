import { z } from 'zod';

export const BusinessModelSectionKeys = [
  'context',
  'problem',
  'beachhead',
  'persona_dmu',
  'alternatives_competitors',
  'evidence_ledger',
  'assumptions_experiments',
  'market_model',
  'business_model_money_rules',
  'pricing_unit_economics',
  'willingness_to_pay',
  'mvbp_kill_lines',
  'gtm_first_100',
  'team_cost_runway',
  'legal_compliance',
  'launch_operate',
  'gates_decisions_artifacts',
] as const;
export const BusinessModelSectionKeySchema = z.enum(BusinessModelSectionKeys);
export type BusinessModelSectionKey = z.infer<typeof BusinessModelSectionKeySchema>;

export const BusinessModelSectionStatuses = [
  'draft',
  'assumption_heavy',
  'researching',
  'needs_founder',
  'supported',
  'stale',
  'blocked',
  'accepted',
] as const;
export const BusinessModelSectionStatusSchema = z.enum(BusinessModelSectionStatuses);
export type BusinessModelSectionStatus = z.infer<typeof BusinessModelSectionStatusSchema>;

export const PackSectionKeyToBusinessModelSectionKey: Readonly<
  Record<'mvbp' | 'gtm' | 'org_cost' | 'legal' | 'launch', BusinessModelSectionKey>
> = {
  mvbp: 'mvbp_kill_lines',
  gtm: 'gtm_first_100',
  org_cost: 'team_cost_runway',
  legal: 'legal_compliance',
  launch: 'launch_operate',
};
