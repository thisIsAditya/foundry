import type { Tool } from 'ai';

import {
  marketCalculatorTool,
  reconciliationCheckerTool,
  sensitivityCalculatorTool,
  unitEconomicsCalculatorTool,
} from './calculators.js';
import {
  builderPromptGenerateTool,
  calendarDraftTool,
  emailDraftTool,
  filingSubmitTool,
  invoiceDraftTool,
  landingDraftTool,
  legalChecklistDraftTool,
  mvbpScopeCheckTool,
  opsMigrationProposalTool,
  paymentLinkDraftTool,
  sideEffectRequestTool,
} from './launch.js';

export {
  marketCalculatorTool,
  reconciliationCheckerTool,
  sensitivityCalculatorTool,
  unitEconomicsCalculatorTool,
} from './calculators.js';
export {
  builderPromptGenerateTool,
  calendarDraftTool,
  emailDraftTool,
  filingSubmitTool,
  invoiceDraftTool,
  landingDraftTool,
  legalChecklistDraftTool,
  mvbpScopeCheckTool,
  opsMigrationProposalTool,
  paymentLinkDraftTool,
  sideEffectRequestTool,
} from './launch.js';
export { TOOL_RISK_CLASSES } from './risk-classes.js';

/**
 * Every tool the runtime knows about, keyed by the name used in `toolAllowlist` and
 * `TOOL_RISK_CLASSES`. Callers must run this through `PolicyService.filterTools` before
 * handing it to `generateText` — this map is intentionally unfiltered.
 */
export const ALL_TOOLS: Record<string, Tool> = {
  market_calculator: marketCalculatorTool,
  unit_economics_calculator: unitEconomicsCalculatorTool,
  sensitivity_calculator: sensitivityCalculatorTool,
  reconciliation_checker: reconciliationCheckerTool,
  mvbp_scope_check: mvbpScopeCheckTool,
  'builder_prompt.generate': builderPromptGenerateTool,
  'landing.draft': landingDraftTool,
  'payment_link.draft': paymentLinkDraftTool,
  'email.draft': emailDraftTool,
  'calendar.draft': calendarDraftTool,
  'invoice.draft': invoiceDraftTool,
  'legal_checklist.draft': legalChecklistDraftTool,
  'ops.migration_proposal': opsMigrationProposalTool,
  'filing.submit': filingSubmitTool,
  'side_effect.request': sideEffectRequestTool,
};
