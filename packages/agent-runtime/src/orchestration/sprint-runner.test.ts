import { describe, expect, it } from 'vitest';

import { runSprint, type SprintRunnerIO } from './sprint-runner.js';
import { createMemoryStreamBus } from '../streaming/bus.js';
import {
  InterviewIdSchema,
  PackRevisionIdSchema,
  ProjectIdSchema,
  SprintContractIdSchema,
  SprintIdSchema,
  WorkspaceIdSchema,
  type Sprint,
} from '@foundry/domain';
import type { PackSnapshot } from '../contracts/pack-snapshot.js';
import type { GateAEvaluation } from '@foundry/policy';

const sprintId = SprintIdSchema.parse('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
const projectId = ProjectIdSchema.parse('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
const workspaceId = WorkspaceIdSchema.parse('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee');
const packRevisionId = PackRevisionIdSchema.parse('cccccccc-cccc-4ccc-8ccc-cccccccccccc');

function snapshot(interviews: PackSnapshot['interviews']): PackSnapshot {
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
    interviews,
    quotes: [],
    beachheads: [],
    dmus: [],
    clarifications: [],
  };
}

function sprint(): Sprint {
  return {
    id: sprintId,
    projectId,
    status: 'draft',
    contract: {
      id: SprintContractIdSchema.parse('dddddddd-dddd-4ddd-8ddd-dddddddddddd'),
      sprintId,
      objective: 'Prove the mock worker path',
      whyNow: 'Milestone 5 skeleton',
      phase: 'diagnose',
      packRevisionId,
      relevantEvidence: [],
      inputs: {},
      outputSchema: { name: 'SprintSynthesis', version: 1 },
      toolAllowlist: [],
      riskPolicy: 'compute',
      budget: {
        provider: 'mock',
        modelOrTool: 'mock',
        inputEstimate: '0',
        outputEstimate: '0',
        currency: 'USD',
        uncertainty: 'n/a',
      },
      qualityChecks: ['gate_a'],
      stopConditions: ['max_stalls'],
      promptVersion: 'orchestrator:1',
      maxWorkers: 1,
      maxStalls: 2,
      workers: [{ name: 'mock_worker', readsOnly: true, writeTargets: [] }],
      gateType: 'gate_a',
      createdAt: new Date('2026-04-01T00:00:00.000Z'),
    },
    budgetReservedUsd: '0',
    budgetUsedUsd: '0',
    closedReason: null,
    createdAt: new Date('2026-04-01T00:00:00.000Z'),
    updatedAt: new Date('2026-04-01T00:00:00.000Z'),
  };
}

function ioFor(pack: PackSnapshot): { io: SprintRunnerIO; gates: GateAEvaluation[] } {
  const bus = createMemoryStreamBus();
  const gates: GateAEvaluation[] = [];
  return {
    gates,
    io: {
      async loadSprint() {
        return sprint();
      },
      async loadSnapshot() {
        return pack;
      },
      async publish(event) {
        await bus.publish(projectId, event);
      },
      async saveProgress() {
        return;
      },
      async markRunning() {
        return;
      },
      async saveGate(evaluation) {
        gates.push(evaluation);
      },
      async close() {
        return;
      },
    },
  };
}

describe('sprint runner', () => {
  it('runs contract → mock worker → synthesis → Gate A', async () => {
    const { io, gates } = ioFor(snapshot([]));
    const outcome = await runSprint(
      {
        sprintId,
        projectId,
        workspaceId,
        packRevisionId,
        correlationId: 'corr',
        attempt: 0,
      },
      io,
    );
    expect(outcome.synthesis.result).toContain('Mock worker');
    expect(outcome.gateA.result).toBe('failed');
    expect(outcome.critique.recommendation).toBe('PIVOT');
    expect(gates).toHaveLength(1);
  });

  it('kills a sprint that only has friend interviews', async () => {
    const { io } = ioFor(
      snapshot([
        {
          id: InterviewIdSchema.parse('55555555-5555-4555-8555-555555555555'),
          projectId,
          participantType: 'friend',
          consent: { given: true },
          conductedAt: new Date('2026-04-01T00:00:00.000Z'),
          createdAt: new Date('2026-04-01T00:00:00.000Z'),
        },
      ]),
    );
    const outcome = await runSprint(
      {
        sprintId,
        projectId,
        workspaceId,
        packRevisionId,
        correlationId: 'corr',
        attempt: 0,
      },
      io,
    );
    expect(outcome.critique.recommendation).toBe('KILL');
    expect(outcome.critique.instantFailFlags).toContain('gate_a_simulated_or_friend_only');
  });
});
