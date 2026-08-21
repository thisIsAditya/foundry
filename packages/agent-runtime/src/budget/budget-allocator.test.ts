import { describe, expect, it } from 'vitest';

import { BudgetAllocator, readWorkspaceBudgetOverrides } from './budget-allocator.js';
import type { RunBudget } from './types.js';

const budget: RunBudget = {
  maxSteps: 4,
  maxDurationMs: 60_000,
  maxUsd: 1,
  maxToolRiskClass: 'draft',
  contextTokenCeiling: 10_000,
};

describe('BudgetAllocator', () => {
  it('splits the context token ceiling across messages/plan-facts/evidence', () => {
    const allocator = new BudgetAllocator(budget);
    const split = allocator.splitContextBudget();
    expect(split.messagesTokens + split.planFactsTokens + split.evidenceTokens).toBeLessThanOrEqual(
      budget.contextTokenCeiling,
    );
    expect(split.messagesTokens).toBeGreaterThan(split.evidenceTokens);
  });

  it('builds stop conditions that include the step-count ceiling and submit_decision', () => {
    const allocator = new BudgetAllocator(budget);
    const conditions = allocator.buildStopConditions('submit_decision');
    expect(conditions.length).toBeGreaterThanOrEqual(3);
  });

  it('lowers the effective tool risk ceiling as spend approaches the budget', async () => {
    const allocator = new BudgetAllocator(budget);
    expect(allocator.effectiveMaxToolRiskClass()).toBe('draft');

    await allocator.recordStepUsage({ inputTokens: 100, outputTokens: 100, costUsd: 0.65 });
    expect(allocator.effectiveMaxToolRiskClass()).toBe('compute');

    await allocator.recordStepUsage({ inputTokens: 100, outputTokens: 100, costUsd: 0.3 });
    expect(allocator.effectiveMaxToolRiskClass()).toBe('read');
  });

  it('reports exhaustion once steps, duration, or spend hit their ceiling', async () => {
    const allocator = new BudgetAllocator({ ...budget, maxSteps: 1 });
    expect(allocator.isExhausted()).toBe(false);
    await allocator.recordStepUsage({ inputTokens: 1, outputTokens: 1, costUsd: 0 });
    expect(allocator.isExhausted()).toBe(true);
  });

  it('invokes the injected spend sink with cumulative and delta usage', async () => {
    const calls: Array<{ usd: number; cumulativeUsd: number }> = [];
    const allocator = new BudgetAllocator(budget, (spend, delta) => {
      calls.push({ usd: delta.usd, cumulativeUsd: spend.usd });
    });
    await allocator.recordStepUsage({ inputTokens: 10, outputTokens: 10, costUsd: 0.1 });
    await allocator.recordStepUsage({ inputTokens: 10, outputTokens: 10, costUsd: 0.2 });
    expect(calls).toEqual([
      { usd: 0.1, cumulativeUsd: 0.1 },
      { usd: 0.2, cumulativeUsd: expect.closeTo(0.3, 5) },
    ]);
  });
});

describe('readWorkspaceBudgetOverrides', () => {
  it('parses known override keys and ignores unknown ones', () => {
    const overrides = readWorkspaceBudgetOverrides({
      agentMaxSteps: 10,
      agentMaxUsd: 5,
      somethingElse: 'ignored',
    });
    expect(overrides).toEqual({ maxSteps: 10, maxUsd: 5 });
  });

  it('returns an empty object for a record with no recognizable keys', () => {
    expect(readWorkspaceBudgetOverrides({ foo: 'bar' })).toEqual({});
  });
});
