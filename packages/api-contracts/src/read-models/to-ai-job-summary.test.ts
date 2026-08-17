import { describe, expect, it } from 'vitest';

import {
  PackRevisionIdSchema,
  SprintContractIdSchema,
  SprintIdSchema,
  SprintSchema,
} from '@foundry/domain';

import { toAiJobSummary } from './to-ai-job-summary.js';

describe('toAiJobSummary', () => {
  it('maps internal sprint status onto the product job vocabulary', () => {
    const sprintId = SprintIdSchema.parse('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
    const sprint = SprintSchema.parse({
      id: sprintId,
      projectId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      status: 'draft',
      contract: {
        id: SprintContractIdSchema.parse('cccccccc-cccc-4ccc-8ccc-cccccccccccc'),
        sprintId,
        objective: 'Baseline market research',
        whyNow: 'Score is evidence-starved',
        roleLabel: 'Market researcher',
        phase: 'diagnose',
        packRevisionId: PackRevisionIdSchema.parse('dddddddd-dddd-4ddd-8ddd-dddddddddddd'),
        relevantEvidence: [],
        inputs: {},
        outputSchema: { name: 'SprintSynthesis', version: 1 },
        toolAllowlist: [],
        riskPolicy: 'compute',
        budget: {
          provider: 'anthropic',
          modelOrTool: 'mock',
          inputEstimate: '0',
          outputEstimate: '0',
          currency: 'USD',
          uncertainty: 'n/a',
        },
        qualityChecks: [],
        stopConditions: [],
        promptVersion: 'orchestrator:1',
        maxWorkers: 1,
        maxStalls: 2,
        workers: [{ name: 'mock_worker', readsOnly: true, writeTargets: [] }],
        gateType: null,
        createdAt: new Date('2026-04-01T00:00:00.000Z'),
      },
      budgetReservedUsd: '0',
      budgetUsedUsd: '0',
      createdAt: new Date('2026-04-01T00:00:00.000Z'),
      updatedAt: new Date('2026-04-01T00:00:00.000Z'),
    });
    const summary = toAiJobSummary({
      sprint,
      citationCount: 2,
      changedSectionKeys: ['market_model'],
    });
    expect(summary.status).toBe('proposed');
    expect(summary.jobKind).toBe('analysis');
    expect(summary.owner).toBe('ai');
    expect(summary.founderActionRequired).toContain('Review');
    expect(summary.citationCount).toBe(2);
  });
});
