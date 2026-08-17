import { limits } from '@foundry/config/limits';
import type { SprintContract, SprintWorkerSpec } from '@foundry/domain';
import { AppError } from '@foundry/observability';
import type { LanguageModel, LanguageModelUsage, Tool } from 'ai';
import { generateText } from 'ai';
import { z } from 'zod';

import {
  AgentRunOutputSchema,
  ProposedPackChangeSchema,
  type AgentRunOutput,
} from '../contracts/output-schema.js';
import type { PackSnapshot } from '../contracts/pack-snapshot.js';

export type WorkerResult = {
  workerName: string;
  output: AgentRunOutput;
};

export type WorkerRuntime = {
  model: LanguageModel;
  tools: Record<string, Tool>;
  instructions: string;
  onUsage?: (usage: LanguageModelUsage, workerName: string) => Promise<void> | void;
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

const WorkerJsonSchema = z.object({
  result: z.string().min(1),
  proposedPackChanges: z.array(ProposedPackChangeSchema).default([]),
  evidenceRefs: z.array(z.string()).default([]),
  assumptionsChanged: z.array(z.string()).default([]),
  unresolvedConflicts: z.array(z.string()).default([]),
  confidence: z.enum(['low', 'medium', 'high']).default('low'),
  recommendedNextAction: z.string().min(1).default('Review the synthesis and Gate A outcome.'),
});

function buildWorkerPrompt(contract: SprintContract, snapshot: PackSnapshot): string {
  const qualifyingQuotes = snapshot.quotes.map((quote) => ({
    id: quote.id,
    interviewId: quote.interviewId,
    text: quote.textContent,
  }));
  return [
    `Sprint objective: ${contract.objective}`,
    `Why now: ${contract.whyNow}`,
    `Phase: ${contract.phase}`,
    `Interviews on file: ${snapshot.interviews.length} (non-friend: ${
      snapshot.interviews.filter((interview) => interview.participantType === 'non_friend').length
    })`,
    `Quotes: ${JSON.stringify(qualifyingQuotes)}`,
    `Beachheads: ${JSON.stringify(snapshot.beachheads)}`,
    `DMUs: ${JSON.stringify(snapshot.dmus)}`,
    `Clarifications so far: ${JSON.stringify(snapshot.clarifications)}`,
    '',
    'Respond with ONLY a single JSON object (no markdown fences, no prose outside the object) shaped like:',
    JSON.stringify(
      {
        result: 'one paragraph synthesis of what you learned',
        proposedPackChanges: [
          { targetSection: 'mvbp | gtm | org_cost | legal | launch', body: { '...': '...' } },
        ],
        evidenceRefs: ['quote-id-you-were-given-above'],
        assumptionsChanged: ['...'],
        unresolvedConflicts: ['...'],
        confidence: 'low | medium | high',
        recommendedNextAction: '...',
      },
      null,
      2,
    ),
    '',
    'Only cite evidenceRefs that are quote ids from the list above. Never invent interviews, quotes, or numbers.',
    'Leave proposedPackChanges empty if no pack section should change yet.',
  ].join('\n');
}

function extractJsonObject(text: string): string | null {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(text);
  const candidate = fenced?.[1] ?? text;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) {
    return null;
  }
  return candidate.slice(start, end + 1);
}

function parseWorkerOutput(text: string, snapshot: PackSnapshot): AgentRunOutput {
  const jsonText = extractJsonObject(text);
  if (jsonText !== null) {
    try {
      return AgentRunOutputSchema.parse(WorkerJsonSchema.parse(JSON.parse(jsonText)));
    } catch {
      // Fall through to the unstructured fallback below.
    }
  }
  const trimmed = text.trim();
  return {
    result: trimmed.length > 0 ? trimmed : 'The model did not return a synthesis.',
    proposedPackChanges: [],
    evidenceRefs: snapshot.quotes.map((quote) => quote.id),
    assumptionsChanged: [],
    unresolvedConflicts: ['Model response was not valid structured JSON.'],
    confidence: 'low',
    recommendedNextAction: 'Retry the sprint or review the model transcript.',
  };
}

export async function runModelWorker(
  contract: SprintContract,
  snapshot: PackSnapshot,
  worker: SprintWorkerSpec,
  runtime: WorkerRuntime,
): Promise<AgentRunOutput> {
  const prompt = buildWorkerPrompt(contract, snapshot);
  const hasTools = Object.keys(runtime.tools).length > 0;
  let text: string;
  let usage: LanguageModelUsage;
  try {
    const result = await generateText({
      model: runtime.model,
      instructions: runtime.instructions,
      prompt,
      ...(hasTools ? { tools: runtime.tools } : {}),
    });
    text = result.text;
    usage = result.usage;
  } catch (error) {
    // Local/Ollama models advertise no tool support (08 §9); retry once without tools
    // rather than fail the sprint (plan §Slice 2 "Ollama tools").
    if (!hasTools) {
      throw error;
    }
    const fallback = await generateText({
      model: runtime.model,
      instructions: runtime.instructions,
      prompt,
    });
    text = fallback.text;
    usage = fallback.usage;
  }
  await runtime.onUsage?.(usage, worker.name);
  return parseWorkerOutput(text, snapshot);
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
