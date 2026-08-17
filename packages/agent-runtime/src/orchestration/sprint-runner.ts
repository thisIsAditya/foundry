import type { StreamEvent } from '@foundry/api-contracts';
import {
  PackRevisionIdSchema,
  ProjectIdSchema,
  SprintIdSchema,
  WorkspaceIdSchema,
  type PackRevisionId,
  type Sprint,
  type SprintStatus,
} from '@foundry/domain';
import { evaluateGateA, type GateAEvaluation } from '@foundry/policy';
import { z } from 'zod';

import { evaluateCritique } from '../critique/critic-runtime.js';
import type { AgentRunOutput, CriticOutput } from '../contracts/output-schema.js';
import type { PackSnapshot } from '../contracts/pack-snapshot.js';
import { StallDetector } from './stall-detector.js';
import { synthesizeSprint } from './synthesize.js';
import { runWorkerPool, type ResolveWorkerRuntime, type WorkerResult } from './worker-pool.js';

export const SprintJobDataSchema = z.object({
  sprintId: SprintIdSchema,
  projectId: ProjectIdSchema,
  workspaceId: WorkspaceIdSchema,
  packRevisionId: PackRevisionIdSchema,
  correlationId: z.string().min(1),
  attempt: z.number().int().nonnegative(),
});
export type SprintJobData = z.infer<typeof SprintJobDataSchema>;

export type SprintOutcome = {
  sprintId: string;
  status: SprintStatus;
  synthesis: AgentRunOutput;
  critique: CriticOutput;
  gateA: GateAEvaluation;
  packRevisionId: PackRevisionId | null;
};

export type SprintRunnerIO = {
  loadSprint(): Promise<Sprint>;
  loadSnapshot(): Promise<PackSnapshot>;
  publish(event: StreamEvent): Promise<void>;
  saveProgress(eventType: string, payload: unknown): Promise<void>;
  markRunning(): Promise<void>;
  saveGate(evaluation: GateAEvaluation): Promise<void>;
  close(status: SprintStatus, reason: string): Promise<void>;
  /** Resolves a model + tools for a non-mock worker (plan §Slice 2). Omit to always use the mock worker. */
  resolveWorkerRuntime?: ResolveWorkerRuntime;
  /**
   * Drafts a new pack revision from the synthesis, `status: 'draft'`, applied on top of
   * (not mutating) the founder's current revision. Returns null when there is nothing to
   * propose or no runtime is configured (plan §Slice 2 "Pack as system of record").
   */
  proposePackRevision?: (input: {
    synthesis: AgentRunOutput;
    workerResults: WorkerResult[];
  }) => Promise<PackRevisionId | null>;
};

export async function runSprint(job: SprintJobData, io: SprintRunnerIO): Promise<SprintOutcome> {
  const sprint = await io.loadSprint();
  const snapshot = await io.loadSnapshot();
  const contract = sprint.contract;
  await io.markRunning();
  await io.publish({
    type: 'sprint_progress',
    sprintId: job.sprintId,
    progress: { stage: 'contracted' },
  });
  await io.saveProgress('sprint_progress', { stage: 'contracted' });

  const stall = new StallDetector(contract.maxStalls);
  const workerResults = await runWorkerPool(contract, snapshot, io.resolveWorkerRuntime);
  // One round per worker that actually ran, not one flat round for the whole pool (plan §Slice 2).
  for (let i = 0; i < Math.max(workerResults.length, 1); i += 1) {
    stall.recordRound();
  }
  await io.publish({
    type: 'sprint_progress',
    sprintId: job.sprintId,
    progress: { stage: 'workers_complete', workers: workerResults.length },
  });

  const synthesis = synthesizeSprint(contract, snapshot, workerResults);
  const packRevisionId = (await io.proposePackRevision?.({ synthesis, workerResults })) ?? null;
  await io.publish({
    type: 'proposal_ready',
    runId: job.sprintId,
    proposal: { text: synthesis.result, packRevisionId },
  });

  const gateA = evaluateGateA({
    interviews: snapshot.interviews,
    quotes: snapshot.quotes,
    beachheads: snapshot.beachheads,
    dmus: snapshot.dmus,
  });
  const critique = evaluateCritique({ snapshot, synthesis, gateA });
  await io.saveGate(gateA);

  const failedClosed = critique.recommendation === 'KILL' || stall.rounds > contract.maxStalls;
  const status: SprintStatus = failedClosed ? 'failed' : 'closed';
  await io.close(status, critique.summary);
  await io.publish({
    type: 'sprint_progress',
    sprintId: job.sprintId,
    progress: {
      stage: 'closed',
      gateA: gateA.result,
      recommendation: critique.recommendation,
      packRevisionId,
    },
  });

  return { sprintId: job.sprintId, status, synthesis, critique, gateA, packRevisionId };
}
