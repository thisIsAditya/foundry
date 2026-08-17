import type { StreamEvent } from '@foundry/api-contracts';
import {
  PackRevisionIdSchema,
  ProjectIdSchema,
  SprintIdSchema,
  WorkspaceIdSchema,
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
import { runWorkerPool } from './worker-pool.js';

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
};

export type SprintRunnerIO = {
  loadSprint(): Promise<Sprint>;
  loadSnapshot(): Promise<PackSnapshot>;
  publish(event: StreamEvent): Promise<void>;
  saveProgress(eventType: string, payload: unknown): Promise<void>;
  markRunning(): Promise<void>;
  saveGate(evaluation: GateAEvaluation): Promise<void>;
  close(status: SprintStatus, reason: string): Promise<void>;
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
  stall.recordRound();
  const workerResults = await runWorkerPool(contract, snapshot);
  await io.publish({
    type: 'sprint_progress',
    sprintId: job.sprintId,
    progress: { stage: 'workers_complete', workers: workerResults.length },
  });

  const synthesis = synthesizeSprint(contract, snapshot, workerResults);
  await io.publish({ type: 'proposal_ready', runId: job.sprintId, proposal: synthesis.result });

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
    progress: { stage: 'closed', gateA: gateA.result, recommendation: critique.recommendation },
  });

  return { sprintId: job.sprintId, status, synthesis, critique, gateA };
}
