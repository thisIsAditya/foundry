import { limits } from '@foundry/config/limits';
import type { SprintContract } from '@foundry/domain';
import { AppError } from '@foundry/observability';

import type { AgentRunOutput } from '../contracts/output-schema.js';
import type { PackSnapshot } from '../contracts/pack-snapshot.js';

export type WorkerResult = {
  workerName: string;
  output: AgentRunOutput;
};

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

export async function runWorkerPool(
  contract: SprintContract,
  snapshot: PackSnapshot,
): Promise<WorkerResult[]> {
  assertFanOutAllowed(contract);
  const maxWorkers = Math.min(contract.maxWorkers, limits.sprint.hardMaxWorkers);
  const selected = contract.workers.slice(0, maxWorkers);
  const results: WorkerResult[] = [];
  for (const worker of selected) {
    results.push({
      workerName: worker.name,
      output: runMockWorker(contract, snapshot),
    });
  }
  return results;
}
