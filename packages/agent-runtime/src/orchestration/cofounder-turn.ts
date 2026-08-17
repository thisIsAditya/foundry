import type { StreamEvent } from '@foundry/api-contracts';
import {
  FounderTaskIdSchema,
  type AiJobKind,
  type ConversationBlock,
  type ConversationReference,
  type SprintId,
} from '@foundry/domain';
import type { LanguageModel } from 'ai';
import { generateObject } from 'ai';

import { COFOUNDER_TURN_INSTRUCTIONS_V1 } from '../agents/instructions.js';
import {
  assembleCofounderContext,
  formatCofounderContext,
  type CofounderContextSnapshot,
} from '../contracts/cofounder-context.js';
import { CofounderDecisionSchema, type CofounderDecision } from '../contracts/output-schema.js';
import { diagnoseClarification } from './diagnose.js';

export type CofounderActions = {
  previewResearch(input: { objective: string; whyNow: string }): Promise<{ jobId: SprintId }>;
  previewJob(input: {
    objective: string;
    jobKind: AiJobKind;
    whyNow: string;
  }): Promise<{ jobId: SprintId }>;
  previewDraftRevision(input: { objective: string }): Promise<{ jobId: SprintId }>;
  createFounderTask(input: { title: string; explanation: string }): Promise<{
    founderTaskId: string;
    title: string;
  }>;
};

export type CofounderTurnResult = {
  decision: CofounderDecision;
  text: string;
  blocks: ConversationBlock[];
  references: ConversationReference[];
};

export async function runCofounderTurn(input: {
  runId: string;
  founderText: string;
  snapshot: CofounderContextSnapshot;
  model: LanguageModel;
  actions: CofounderActions;
  publish: (event: StreamEvent) => Promise<void>;
  timeoutMs: number;
}): Promise<CofounderTurnResult> {
  const context = assembleCofounderContext(input.snapshot);
  let decision: CofounderDecision;
  try {
    const generated = await generateObject({
      model: input.model,
      schema: CofounderDecisionSchema,
      instructions: COFOUNDER_TURN_INSTRUCTIONS_V1,
      prompt: [
        formatCofounderContext(context),
        `Founder message: ${input.founderText}`,
        'Choose one action. Do not invent evidence.',
      ].join('\n'),
      abortSignal: AbortSignal.timeout(input.timeoutMs),
    });
    decision = generated.object;
  } catch {
    const diagnosed = await diagnoseClarification({
      runId: input.runId,
      questionId: 'cofounder',
      answer: input.founderText,
      snapshot: input.snapshot,
      model: input.model,
      timeoutMs: input.timeoutMs,
      publish: input.publish,
    });
    decision = { action: 'answer', text: diagnosed.text };
  }

  return dispatchCofounderDecision(decision, input.actions, context.contextItemsUsed);
}

export async function dispatchCofounderDecision(
  decision: CofounderDecision,
  actions: CofounderActions,
  contextItemsUsed: ConversationReference[],
): Promise<CofounderTurnResult> {
  switch (decision.action) {
    case 'answer':
      return {
        decision,
        text: decision.text,
        blocks: [{ kind: 'concise_answer', text: decision.text }],
        references: contextItemsUsed,
      };
    case 'ask_targeted_question':
      return {
        decision,
        text: decision.text,
        blocks: [
          { kind: 'concise_answer', text: `${decision.question} (${decision.whyNotResearchable})` },
        ],
        references: contextItemsUsed,
      };
    case 'start_research': {
      const created = await actions.previewResearch({
        objective: decision.objective,
        whyNow: decision.whyNow,
      });
      return {
        decision,
        text: decision.text,
        blocks: [{ kind: 'research_plan', jobId: created.jobId }],
        references: [...contextItemsUsed, { kind: 'job', id: created.jobId }],
      };
    }
    case 'create_job': {
      const created = await actions.previewJob({
        objective: decision.objective,
        jobKind: decision.jobKind,
        whyNow: decision.whyNow,
      });
      return {
        decision,
        text: decision.text,
        blocks: [{ kind: 'job_request', jobId: created.jobId }],
        references: [...contextItemsUsed, { kind: 'job', id: created.jobId }],
      };
    }
    case 'propose_draft_revision': {
      const created = await actions.previewDraftRevision({ objective: decision.objective });
      return {
        decision,
        text: decision.text,
        blocks: [{ kind: 'job_request', jobId: created.jobId }],
        references: [...contextItemsUsed, { kind: 'job', id: created.jobId }],
      };
    }
    case 'create_founder_task': {
      const created = await actions.createFounderTask({
        title: decision.title,
        explanation: decision.explanation,
      });
      return {
        decision,
        text: decision.text,
        blocks: [
          { kind: 'founder_task', founderTaskId: FounderTaskIdSchema.parse(created.founderTaskId) },
        ],
        references: [...contextItemsUsed, { kind: 'founder_task', id: created.founderTaskId }],
      };
    }
  }
}
