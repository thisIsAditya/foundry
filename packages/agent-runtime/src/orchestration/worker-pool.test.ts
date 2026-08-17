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

import { runWorkerPool, type WorkerRuntime } from './worker-pool.js';
import type { PackSnapshot } from '../contracts/pack-snapshot.js';

const usage = {
  inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 20, text: 20, reasoning: undefined },
};

function textModel(text: string): LanguageModel {
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
    phase: 'diagnose',
    interviews: [],
    quotes: [],
    beachheads: [],
    dmus: [],
    moneyRules: null,
    marketModels: [],
    unitEconomics: [],
    wtpEvents: [],
    clarifications: [],
  };
}

describe('runWorkerPool with a model runtime', () => {
  it('parses structured JSON into a proposed pack change', async () => {
    const text = JSON.stringify({
      result: 'Two qualifying interviews point at the same nightly-close pain.',
      proposedPackChanges: [
        { targetSection: 'mvbp', body: { hypothesis: 'Automate the nightly close' } },
      ],
      evidenceRefs: [],
      assumptionsChanged: [],
      unresolvedConflicts: [],
      confidence: 'medium',
      recommendedNextAction: 'Capture one more interview.',
    });
    const runtime: WorkerRuntime = { model: textModel(text), tools: {}, instructions: 'test' };
    const results = await runWorkerPool(contract('orchestrator'), snapshot(), async () => runtime);
    expect(results).toHaveLength(1);
    expect(results[0]?.output.proposedPackChanges).toEqual([
      { targetSection: 'mvbp', body: { hypothesis: 'Automate the nightly close' } },
    ]);
    expect(results[0]?.output.confidence).toBe('medium');
  });

  it('falls back to a low-confidence summary when the model returns unstructured text', async () => {
    const runtime: WorkerRuntime = {
      model: textModel('Sorry, I cannot help with that.'),
      tools: {},
      instructions: 'test',
    };
    const results = await runWorkerPool(contract('orchestrator'), snapshot(), async () => runtime);
    expect(results[0]?.output.confidence).toBe('low');
    expect(results[0]?.output.proposedPackChanges).toEqual([]);
    expect(results[0]?.output.unresolvedConflicts).toContain(
      'Model response was not valid structured JSON.',
    );
  });

  it('records usage once the model call completes', async () => {
    const seen: number[] = [];
    const runtime: WorkerRuntime = {
      model: textModel(JSON.stringify({ result: 'ok', proposedPackChanges: [] })),
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
    const runtime: WorkerRuntime = { model: textModel('{}'), tools: {}, instructions: 'test' };
    const results = await runWorkerPool(contract('mock_worker'), snapshot(), async () => runtime);
    expect(results[0]?.output.result).toContain('Mock worker');
  });
});
