import { limits } from '@foundry/config/limits';
import type { RiskClass, SprintContract, SprintWorkerSpec } from '@foundry/domain';
import { AppError } from '@foundry/observability';
import type { LanguageModel, Tool } from 'ai';

import { AgentRunOutputSchema, type AgentRunOutput } from '../contracts/output-schema.js';
import type { PackSnapshot } from '../contracts/pack-snapshot.js';
import type { RunBudget } from '../budget/types.js';
import { FoundryAgent, FoundryAgentNoDecisionError } from './foundry-agent.js';

export type WorkerResult = {
  workerName: string;
  output: AgentRunOutput;
};

/** Narrowed to just the fields callers (`process.ts`'s `onUsage`) actually read — a full AI SDK
 * `LanguageModelUsage` needs per-provider cache/reasoning breakdowns this run's cumulative spend
 * doesn't have. */
export type WorkerUsage = {
  inputTokens: number | undefined;
  outputTokens: number | undefined;
};

export type WorkerRuntime = {
  model: LanguageModel;
  tools: Record<string, Tool>;
  /** Risk class per tool name, for `FoundryAgent`'s per-step degrade-as-spend-rises narrowing.
   * Defaults to `compute` for every tool in `tools` when omitted (the tools were already
   * filtered to the worker's max risk class by the caller, so `compute` is a safe, conservative
   * placeholder for callers that haven't threaded classification through yet). */
  toolRiskClasses?: Record<string, RiskClass>;
  instructions: string;
  /** Defaults to `limits.agent.sprintWorker`. */
  budget?: RunBudget;
  onUsage?: (usage: WorkerUsage, workerName: string) => Promise<void> | void;
  onToolCall?: (call: {
    toolName: string;
    input: unknown;
    output: unknown;
  }) => Promise<void> | void;
};

export type ResolveWorkerRuntime = (worker: SprintWorkerSpec) => Promise<WorkerRuntime | null>;

function writesOverlap(left: readonly string[], right: readonly string[]): boolean {
  return left.some((target) => right.includes(target));
}

export function assertFanOutAllowed(contract: SprintContract): void {
  const writers = contract.workers.filter((worker) => !worker.readsOnly);
  for (let i = 0; i < writers.length; i += 1) {
    for (let j = i + 1; j < writers.length; j += 1) {
      const left = writers[i];
      const right = writers[j];
      if (left === undefined || right === undefined) {
        continue;
      }
      if (writesOverlap(left.writeTargets, right.writeTargets)) {
        throw new AppError({
          code: 'policy_forbidden',
          explanation: 'Sprint workers cannot write the same targets in parallel.',
          nextAction: 'Run those workers sequentially or split their write targets.',
        });
      }
    }
  }
}

export function runMockWorker(contract: SprintContract, snapshot: PackSnapshot): AgentRunOutput {
  const interviewCount = snapshot.interviews.length;
  return {
    result: `Mock worker reviewed ${interviewCount} interviews for "${contract.objective}".`,
    proposedPackChanges: [],
    evidenceRefs: snapshot.quotes.map((quote) => quote.id),
    assumptionsChanged: [],
    unresolvedConflicts: [],
    confidence: interviewCount === 0 ? 'low' : 'medium',
    recommendedNextAction:
      interviewCount === 0
        ? 'Collect non-friend problem interviews before generating a plan.'
        : 'Synthesize interview quotes against the beachhead hypothesis.',
  };
}

const foundryAgent = new FoundryAgent<AgentRunOutput>();

function buildWorkerUserPrompt(contract: SprintContract): string {
  return [
    `Sprint objective: ${contract.objective}`,
    `Why now: ${contract.whyNow ?? 'Not specified'}`,
    `Phase: ${contract.phase}`,
    '',
    'Use the plan context above — do not ask for it again. Only cite evidenceRefs that are quote ids that actually appear there; never invent interviews, quotes, or numbers. Leave proposedPackChanges empty if no pack section should change yet.',
  ].join('\n');
}

function defaultToolRiskClasses(tools: Record<string, Tool>): Record<string, RiskClass> {
  return Object.fromEntries(Object.keys(tools).map((name) => [name, 'compute' as const]));
}

function budgetExhaustedFallback(snapshot: PackSnapshot): AgentRunOutput {
  return {
    result: 'The model did not submit a synthesis before the run budget was exhausted.',
    proposedPackChanges: [],
    evidenceRefs: snapshot.quotes.map((quote) => quote.id),
    assumptionsChanged: [],
    unresolvedConflicts: ['Model ran out of budget before calling submit_decision.'],
    confidence: 'low',
    recommendedNextAction: 'Retry the sprint or review the model transcript.',
  };
}

/**
 * Runs one sprint specialist through the shared `FoundryAgent` multi-step loop instead of a
 * single blind `generateText` call — the worker can now call a calculator or a read-only
 * research tool, inspect the result, and only then call `submit_decision`, rather than emitting
 * one unverified completion and hoping it parses as JSON.
 */
export async function runModelWorker(
  contract: SprintContract,
  snapshot: PackSnapshot,
  worker: SprintWorkerSpec,
  runtime: WorkerRuntime,
): Promise<AgentRunOutput> {
  const budget = runtime.budget ?? limits.agent.sprintWorker;
  try {
    const result = await foundryAgent.run({
      agentName: `sprint_worker:${worker.name}`,
      model: runtime.model,
      instructions: runtime.instructions,
      userPrompt: buildWorkerUserPrompt(contract),
      contextInput: {
        projectId: snapshot.pack.projectId,
        snapshot,
        planScore: null,
        recentMessages: [],
        conversationSummary: null,
        confirmedPreferences: [],
        openFounderTasks: [],
        recentJobs: [],
        attachedEvidence: [],
      },
      tools: runtime.tools,
      toolRiskClasses: runtime.toolRiskClasses ?? defaultToolRiskClasses(runtime.tools),
      decisionSchema: AgentRunOutputSchema,
      submitToolDescription:
        'Call this once you are ready to submit your synthesis and any proposed pack changes, ending the run.',
      budget,
      ports: { onToolCall: runtime.onToolCall },
    });
    await runtime.onUsage?.(
      { inputTokens: result.spend.inputTokens, outputTokens: result.spend.outputTokens },
      worker.name,
    );
    return result.decision;
  } catch (error) {
    if (error instanceof FoundryAgentNoDecisionError) {
      return budgetExhaustedFallback(snapshot);
    }
    throw error;
  }
}

export async function runWorkerPool(
  contract: SprintContract,
  snapshot: PackSnapshot,
  resolveRuntime?: ResolveWorkerRuntime,
): Promise<WorkerResult[]> {
  assertFanOutAllowed(contract);
  const maxWorkers = Math.min(contract.maxWorkers, limits.sprint.hardMaxWorkers);
  const selected = contract.workers.slice(0, maxWorkers);
  const results: WorkerResult[] = [];
  for (const worker of selected) {
    if (worker.name === 'mock_worker' || resolveRuntime === undefined) {
      results.push({ workerName: worker.name, output: runMockWorker(contract, snapshot) });
      continue;
    }
    const runtime = await resolveRuntime(worker);
    if (runtime === null) {
      results.push({ workerName: worker.name, output: runMockWorker(contract, snapshot) });
      continue;
    }
    const output = await runModelWorker(contract, snapshot, worker, runtime);
    results.push({ workerName: worker.name, output });
  }
  return results;
}
