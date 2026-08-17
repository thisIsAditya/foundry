import type { RiskClass } from '@foundry/domain';

/**
 * Sidecar risk classification for tool names used in `toolAllowlist` (08 §11, plan §Slice 2).
 * Keys match the agent_definitions.capabilities_json.toolAllowlist entries seeded in migrations.
 */
export const TOOL_RISK_CLASSES: Record<string, RiskClass> = {
  market_calculator: 'compute',
  unit_economics_calculator: 'compute',
  sensitivity_calculator: 'compute',
  reconciliation_checker: 'compute',
  mvbp_scope_check: 'compute',
  'builder_prompt.generate': 'draft',
  'landing.draft': 'draft',
  'payment_link.draft': 'draft',
  'email.draft': 'draft',
  'calendar.draft': 'draft',
  'invoice.draft': 'draft',
  'legal_checklist.draft': 'draft',
  'ops.migration_proposal': 'draft',
  'filing.submit': 'forbidden',
  'side_effect.request': 'side_effect',
  academic_search: 'read',
  market_report_search: 'read',
};
