import type { RiskClass } from '@foundry/domain';

/**
 * Ceilings for a single `FoundryAgent` run. Defaults come from `limits.agent` (per effort
 * tier / sprint worker); a workspace can override them via `WorkspacePolicy.tool`
 * (`readWorkspaceBudgetOverrides`), per backend requirements §7 ("founder can override
 * context-window size, maximum spend, maximum duration").
 */
export type RunBudget = {
  maxSteps: number;
  maxDurationMs: number;
  maxUsd: number;
  maxToolRiskClass: RiskClass;
  contextTokenCeiling: number;
};

/** How `contextTokenCeiling` is split across the three broad kinds of context content, so the
 * `ContextCompressor` knows how aggressively to trim each slice. */
export type ContextBudgetSplit = {
  messagesTokens: number;
  planFactsTokens: number;
  evidenceTokens: number;
};

/** Cumulative spend tracked across the steps of a single run. */
export type RunSpend = {
  steps: number;
  elapsedMs: number;
  usd: number;
  inputTokens: number;
  outputTokens: number;
};

export function emptyRunSpend(): RunSpend {
  return { steps: 0, elapsedMs: 0, usd: 0, inputTokens: 0, outputTokens: 0 };
}

/** Injected sink so `BudgetAllocator` can persist spend into whatever ledger the caller uses
 * (sprint `BudgetLedgerEntry`/`UsageRecord`, or a no-op for chat runs that don't bill a sprint
 * budget). Kept as a plain callback — `agent-runtime` stays DB-agnostic. */
export type BudgetSpendSink = (
  spend: RunSpend,
  delta: { usd: number; inputTokens: number; outputTokens: number },
) => Promise<void> | void;
