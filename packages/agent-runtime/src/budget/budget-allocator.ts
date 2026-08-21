import { RiskClassSchema, type RiskClass } from '@foundry/domain';
import { hasToolCall, stepCountIs, type StopCondition, type ToolSet } from 'ai';
import { z } from 'zod';

import type { BudgetSpendSink, ContextBudgetSplit, RunBudget, RunSpend } from './types.js';
import { emptyRunSpend } from './types.js';

const riskRank: Record<RiskClass, number> = {
  read: 0,
  compute: 1,
  draft: 2,
  side_effect: 3,
  forbidden: 4,
};

/** Founder-overridable subset of `RunBudget`, read from `WorkspacePolicy.tool` (currently an
 * untyped JSON record — this schema is the typed contract for that record's agent-budget keys,
 * per backend requirements §7 without requiring a DB migration). */
export const WorkspaceBudgetOverridesSchema = z.object({
  agentMaxSteps: z.number().int().positive().optional(),
  agentMaxDurationMs: z.number().int().positive().optional(),
  agentMaxUsd: z.number().positive().optional(),
  agentMaxToolRiskClass: RiskClassSchema.optional(),
  agentContextTokenCeiling: z.number().int().positive().optional(),
});
export type WorkspaceBudgetOverrides = z.infer<typeof WorkspaceBudgetOverridesSchema>;

export function readWorkspaceBudgetOverrides(tool: Record<string, unknown>): Partial<RunBudget> {
  const parsed = WorkspaceBudgetOverridesSchema.safeParse(tool);
  if (!parsed.success) {
    return {};
  }
  const overrides: Partial<RunBudget> = {};
  if (parsed.data.agentMaxSteps !== undefined) {
    overrides.maxSteps = parsed.data.agentMaxSteps;
  }
  if (parsed.data.agentMaxDurationMs !== undefined) {
    overrides.maxDurationMs = parsed.data.agentMaxDurationMs;
  }
  if (parsed.data.agentMaxUsd !== undefined) {
    overrides.maxUsd = parsed.data.agentMaxUsd;
  }
  if (parsed.data.agentMaxToolRiskClass !== undefined) {
    overrides.maxToolRiskClass = parsed.data.agentMaxToolRiskClass;
  }
  if (parsed.data.agentContextTokenCeiling !== undefined) {
    overrides.contextTokenCeiling = parsed.data.agentContextTokenCeiling;
  }
  return overrides;
}

/**
 * Turns a `RunBudget` into the `stopWhen`/tool-policy/context-split mechanics a `FoundryAgent`
 * run needs, and tracks cumulative spend across steps. One instance per run (it's stateful via
 * `spend`).
 */
export class BudgetAllocator {
  private spend: RunSpend = emptyRunSpend();
  private readonly startedAt = Date.now();

  constructor(
    private readonly budget: RunBudget,
    private readonly sink?: BudgetSpendSink,
  ) {}

  resolve(defaults: RunBudget, overrides: Partial<RunBudget> = {}): RunBudget {
    return { ...defaults, ...overrides };
  }

  /** `stopWhen` array: step-count ceiling, the `submit_decision` terminal tool, and a
   * time-based backstop (AI SDK stop conditions only see completed steps, so this catches the
   * loop between steps rather than mid-generation). */
  buildStopConditions<TOOLS extends ToolSet>(
    submitToolName = 'submit_decision',
  ): StopCondition<TOOLS>[] {
    const startedAt = this.startedAt;
    const maxDurationMs = this.budget.maxDurationMs;
    const timeExceeded: StopCondition<TOOLS> = () => Date.now() - startedAt >= maxDurationMs;
    return [stepCountIs(this.budget.maxSteps), hasToolCall(submitToolName), timeExceeded];
  }

  /** Splits `contextTokenCeiling` into rough slices for the `ContextCompressor` — messages get
   * the largest share since they're the least compressible without losing founder intent. */
  splitContextBudget(): ContextBudgetSplit {
    const total = this.budget.contextTokenCeiling;
    return {
      messagesTokens: Math.round(total * 0.45),
      planFactsTokens: Math.round(total * 0.4),
      evidenceTokens: Math.round(total * 0.15),
    };
  }

  async recordStepUsage(usage: {
    inputTokens?: number | null;
    outputTokens?: number | null;
    costUsd?: number;
  }): Promise<void> {
    const inputTokens = usage.inputTokens ?? 0;
    const outputTokens = usage.outputTokens ?? 0;
    const costUsd = usage.costUsd ?? 0;
    this.spend = {
      steps: this.spend.steps + 1,
      elapsedMs: Date.now() - this.startedAt,
      usd: this.spend.usd + costUsd,
      inputTokens: this.spend.inputTokens + inputTokens,
      outputTokens: this.spend.outputTokens + outputTokens,
    };
    await this.sink?.(this.spend, { usd: costUsd, inputTokens, outputTokens });
  }

  currentSpend(): RunSpend {
    return this.spend;
  }

  /**
   * Progressively lowers the effective tool-risk ceiling as spend approaches the budget, so a
   * run that's burning through its allowance degrades to safer (read-only) tools rather than
   * being cut off mid-step. Feeds straight into `PolicyService.filterTools`'s `maxRiskClass`.
   */
  effectiveMaxToolRiskClass(): RiskClass {
    if (this.budget.maxUsd <= 0) {
      return this.budget.maxToolRiskClass;
    }
    const fractionSpent = this.spend.usd / this.budget.maxUsd;
    const ceilingRank = riskRank[this.budget.maxToolRiskClass];
    if (fractionSpent >= 0.9) {
      return rankToRisk(Math.min(ceilingRank, riskRank.read));
    }
    if (fractionSpent >= 0.6) {
      return rankToRisk(Math.min(ceilingRank, riskRank.compute));
    }
    return this.budget.maxToolRiskClass;
  }

  isExhausted(): boolean {
    return (
      this.spend.steps >= this.budget.maxSteps ||
      this.spend.elapsedMs >= this.budget.maxDurationMs ||
      this.spend.usd >= this.budget.maxUsd
    );
  }
}

function rankToRisk(rank: number): RiskClass {
  const entry = (Object.entries(riskRank) as [RiskClass, number][]).find(
    ([, value]) => value === rank,
  );
  return entry?.[0] ?? 'read';
}
