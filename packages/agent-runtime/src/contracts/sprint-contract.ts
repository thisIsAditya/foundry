import { limits } from '@foundry/config/limits';
import {
  SprintContractIdSchema,
  SprintContractSchema,
  type JourneyPhase,
  type PackRevisionId,
  type SprintContract,
  type SprintId,
} from '@foundry/domain';
import { randomUUID } from 'node:crypto';

import type { PackSnapshot } from './pack-snapshot.js';

export function buildSprintContract(input: {
  sprintId: SprintId;
  packRevisionId: PackRevisionId;
  phase: JourneyPhase;
  objective: string;
  whyNow?: string;
  snapshot?: PackSnapshot;
  /** Current agent definition for the sprint's worker (plan §Slice 2). Omit to fall back to the mock worker. */
  agent?: { name: string; toolAllowlist: string[] };
}): SprintContract {
  const workerName = input.agent?.name ?? 'mock_worker';
  const isMock = workerName === 'mock_worker';
  return SprintContractSchema.parse({
    id: SprintContractIdSchema.parse(randomUUID()),
    sprintId: input.sprintId,
    objective: input.objective,
    whyNow: input.whyNow ?? 'Unblock the next evidence-gathering step.',
    phase: input.phase,
    packRevisionId: input.packRevisionId,
    relevantEvidence: input.snapshot?.quotes.map((quote) => quote.id) ?? [],
    inputs: {
      clarifications: input.snapshot?.clarifications ?? [],
    },
    outputSchema: { name: 'SprintSynthesis', version: 1 },
    toolAllowlist: input.agent?.toolAllowlist ?? [],
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
    stopConditions: ['max_stalls', 'budget'],
    promptVersion: 'orchestrator:1',
    maxWorkers: 1,
    maxStalls: limits.sprint.defaultMaxStalls,
    workers: [{ name: workerName, readsOnly: isMock, writeTargets: isMock ? [] : ['pack'] }],
    gateType: 'gate_a',
    createdAt: new Date(),
  });
}
