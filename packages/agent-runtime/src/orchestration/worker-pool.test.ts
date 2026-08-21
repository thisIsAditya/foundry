import type { LanguageModel } from 'ai';
import { MockLanguageModelV3 } from 'ai/test';
import { describe, expect, it } from 'vitest';

import {
  PackRevisionIdSchema,
  ProjectIdSchema,
  SprintContractIdSchema,
  SprintContractSchema,
  SprintIdSchema,
  type SprintContract,
} from '@foundry/domain';

import { SUBMIT_DECISION_TOOL_NAME } from './foundry-agent.js';
import { runWorkerPool, type WorkerRuntime } from './worker-pool.js';
import type { PackSnapshot } from '../contracts/pack-snapshot.js';

const usage = {
  inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 20, text: 20, reasoning: undefined },
};

/** Mocks a model that calls `submit_decision` with `decision` on its first step, mirroring how
 * a real worker ends a `FoundryAgent` run. */
function submitDecisionModel(decision: unknown): LanguageModel {
  return new MockLanguageModelV3({
    doGenerate: async () => ({
      content: [
        {
          type: 'tool-call',
          toolCallId: 'call_1',
          toolName: SUBMIT_DECISION_TOOL_NAME,
          input: JSON.stringify(decision),
        },
      ],
      finishReason: { unified: 'tool-calls' as const, raw: undefined },
      usage,
      warnings: [],
    }),
  });
}

/** Mocks a model that never calls `submit_decision`, only emits text — exercises the
 * `FoundryAgentNoDecisionError` fallback path. */
function textOnlyModel(text: string): LanguageModel {
  return new MockLanguageModelV3({
    doGenerate: async () => ({
      content: [{ type: 'text', text }],
      finishReason: { unified: 'stop' as const, raw: undefined },
      usage,
      warnings: [],
    }),
  });
}

const packRevisionId = PackRevisionIdSchema.parse('cccccccc-cccc-4ccc-8ccc-cccccccccccc');
const projectId = ProjectIdSchema.parse('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');

function contract(workerName: string): SprintContract {
  return SprintContractSchema.parse({
    id: SprintContractIdSchema.parse('dddddddd-dddd-4ddd-8ddd-dddddddddddd'),
    sprintId: SprintIdSchema.parse('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
    objective: 'Synthesize Gate A evidence',
    whyNow: 'Prove the model worker path',
    phase: 'diagnose',
    packRevisionId,
    relevantEvidence: [],
    inputs: {},
    outputSchema: { name: 'SprintSynthesis', version: 1 },
    toolAllowlist: [],
    riskPolicy: 'compute',
    budget: {
      provider: 'anthropic',
      modelOrTool: 'coordinator',
      inputEstimate: '0',
      outputEstimate: '0',
      currency: 'USD',
      uncertainty: 'estimate',
    },
    qualityChecks: ['gate_a'],
    stopConditions: ['max_stalls'],
    promptVersion: 'orchestrator:1',
    maxWorkers: 1,
    maxStalls: 2,
    workers: [{ name: workerName, readsOnly: false, writeTargets: ['pack'] }],
    gateType: 'gate_a',
    createdAt: new Date('2026-04-01T00:00:00.000Z'),
  });
}

function snapshot(): PackSnapshot {
  return {
    pack: {
      id: packRevisionId,
      projectId,
      revisionNumber: 1,
      parentRevisionId: null,
      actorType: 'founder',
      actorId: null,
      sourceSprintId: null,
      status: 'draft',
      proposedChanges: { clarifications: [] },
      acceptedChanges: null,
      validationResults: null,
      gateResults: null,
      dependencyInvalidations: null,
      createdAt: new Date('2026-04-01T00:00:00.000Z'),
      acceptedAt: null,
    },
    pendingDraftRevision: null,
    phase: 'diagnose',
    derivedPhase: null,
    interviews: [],
    quotes: [],
    beachheads: [],
    dmus: [],
    personas: [],
    problems: [],
    moneyRules: null,
    marketModels: [],
    unitEconomics: [],
    wtpEvents: [],
    assumptions: [],
    decisions: [],
    packSections: [],
    clarifications: [],
  };
}

describe('runWorkerPool with a model runtime', () => {
  it('accepts a structured decision submitted via the submit_decision tool', async () => {
    const decision = {
      result: 'Two qualifying interviews point at the same nightly-close pain.',
      proposedPackChanges: [
        { targetSection: 'mvbp', body: { hypothesis: 'Automate the nightly close' } },
      ],
      evidenceRefs: [],
      assumptionsChanged: [],
      unresolvedConflicts: [],
      confidence: 'medium',
      recommendedNextAction: 'Capture one more interview.',
    };
    const runtime: WorkerRuntime = {
      model: submitDecisionModel(decision),
      tools: {},
      instructions: 'test',
    };
    const results = await runWorkerPool(contract('orchestrator'), snapshot(), async () => runtime);
    expect(results).toHaveLength(1);
    expect(results[0]?.output.proposedPackChanges).toEqual([
      { targetSection: 'mvbp', body: { hypothesis: 'Automate the nightly close' } },
    ]);
    expect(results[0]?.output.confidence).toBe('medium');
  });

  it('falls back to a low-confidence summary when the model never submits a decision', async () => {
    const runtime: WorkerRuntime = {
      model: textOnlyModel('Sorry, I cannot help with that.'),
      tools: {},
      instructions: 'test',
    };
    const results = await runWorkerPool(contract('orchestrator'), snapshot(), async () => runtime);
    expect(results[0]?.output.confidence).toBe('low');
    expect(results[0]?.output.proposedPackChanges).toEqual([]);
    expect(results[0]?.output.unresolvedConflicts).toContain(
      'Model ran out of budget before calling submit_decision.',
    );
  });

  it('records usage once the model call completes', async () => {
    const seen: number[] = [];
    const runtime: WorkerRuntime = {
      model: submitDecisionModel({
        result: 'ok',
        proposedPackChanges: [],
        evidenceRefs: [],
        assumptionsChanged: [],
        unresolvedConflicts: [],
        confidence: 'low',
        recommendedNextAction: 'Review manually.',
      }),
      tools: {},
      instructions: 'test',
      onUsage: (workerUsage) => {
        seen.push(workerUsage.inputTokens ?? 0);
      },
    };
    await runWorkerPool(contract('orchestrator'), snapshot(), async () => runtime);
    expect(seen).toEqual([10]);
  });

  it('still uses the mock worker when the contract names it explicitly', async () => {
    const runtime: WorkerRuntime = { model: textOnlyModel('{}'), tools: {}, instructions: 'test' };
    const results = await runWorkerPool(contract('mock_worker'), snapshot(), async () => runtime);
    expect(results[0]?.output.result).toContain('Mock worker');
  });
});
