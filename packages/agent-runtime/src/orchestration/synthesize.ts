import type { SprintContract } from '@foundry/domain';

import type { AgentRunOutput } from '../contracts/output-schema.js';
import type { PackSnapshot } from '../contracts/pack-snapshot.js';
import type { WorkerResult } from './worker-pool.js';

export function synthesizeSprint(
  contract: SprintContract,
  snapshot: PackSnapshot,
  workerResults: readonly WorkerResult[],
): AgentRunOutput {
  const summaries = workerResults.map((item) => `${item.workerName}: ${item.output.result}`);
  return {
    result: summaries.join('\n') || `No workers ran for ${contract.objective}.`,
    proposedPackChanges: workerResults.flatMap((item) => item.output.proposedPackChanges),
    evidenceRefs: workerResults.flatMap((item) => item.output.evidenceRefs),
    assumptionsChanged: [],
    unresolvedConflicts: [],
    confidence: snapshot.interviews.length === 0 ? 'low' : 'medium',
    recommendedNextAction: 'Review the critic and Gate A outcome before accepting a pack revision.',
  };
}
