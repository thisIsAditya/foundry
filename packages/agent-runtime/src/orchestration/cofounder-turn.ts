import type { ConversationEffort, StreamEvent } from '@foundry/api-contracts';
import { limits } from '@foundry/config/limits';
import {
  FounderTaskIdSchema,
  type AiJobKind,
  type ConversationBlock,
  type ConversationReference,
  type RiskClass,
  type SprintId,
} from '@foundry/domain';
import { PolicyService } from '@foundry/policy';
import { getLogger } from '@foundry/observability';
import { ALL_TOOLS, TOOL_RISK_CLASSES } from '@foundry/tools';
import type { LanguageModel, Tool } from 'ai';

import { COFOUNDER_TURN_INSTRUCTIONS_V1 } from '../agents/instructions.js';
import type { RunBudget } from '../budget/types.js';
import type { CofounderContextSnapshot } from '../contracts/cofounder-context.js';
import { CofounderDecisionSchema, type CofounderDecision } from '../contracts/output-schema.js';
import { FOUNDRY_SKILLS } from '../skills/registry.js';
import { FoundryAgent } from './foundry-agent.js';
import { diagnoseClarification } from './diagnose.js';

const foundryAgent = new FoundryAgent<CofounderDecision>();
const policyService = new PolicyService();
const logger = getLogger();

/** Built-in tools the co-founder is allowed to reach for inline, during the chat turn itself,
 * rather than only via a background job. Deliberately just the `read`/`compute`-risk research
 * and calculator tools — MCP tools stay `side_effect`-only until milestone 5's `readOnly`
 * opt-in lands (plan §"Closing the loop on the original MCP question"), and drafting/side-effect
 * tools always go through `create_job`/`propose_draft_revision` so they stay reviewable. */
const COFOUNDER_TOOL_ALLOWLIST = Object.entries(TOOL_RISK_CLASSES)
  .filter(([, riskClass]) => riskClass === 'read' || riskClass === 'compute')
  .map(([name]) => name);

function runBudgetForEffort(effort: ConversationEffort): RunBudget {
  return limits.agent[effort];
}

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
  effort?: ConversationEffort;
  /** Tools from the founder's `readOnly`-opted-in MCP servers (milestone 5, plan §"Closing the
   * loop on the original MCP question"). Already tagged `read` by `loadUserMcpTools`, so they
   * admit inline even at the `compute` risk ceiling most effort tiers use — unlike every other
   * MCP tool, which stays `side_effect`-only and can only run from a background job. */
  readOnlyMcpTools?: { tools: Record<string, Tool>; riskClasses: Record<string, RiskClass> };
}): Promise<CofounderTurnResult> {
  const effort = input.effort ?? 'standard';
  const budget = runBudgetForEffort(effort);
  const mcpTools = input.readOnlyMcpTools?.tools ?? {};
  const mcpRiskClasses = input.readOnlyMcpTools?.riskClasses ?? {};
  const allTools = { ...ALL_TOOLS, ...mcpTools };
  const allRiskClasses = { ...TOOL_RISK_CLASSES, ...mcpRiskClasses };
  const allowlist = [...COFOUNDER_TOOL_ALLOWLIST, ...Object.keys(mcpTools)];
  // `quick` intentionally gets no tools at all (not just a step-count cap): the plan calls for
  // "answer from context only" on that tier, and a lone step with a tool call available could
  // spend its only step on a lookup instead of answering.
  const tools: Record<string, Tool> =
    effort === 'quick'
      ? {}
      : policyService.filterTools(allTools, allRiskClasses, {
          allowlist,
          maxRiskClass: budget.maxToolRiskClass,
        });

  let decision: CofounderDecision;
  let contextItemsUsed: ConversationReference[];
  try {
    const result = await foundryAgent.run({
      runId: input.runId,
      agentName: 'cofounder',
      model: input.model,
      instructions: [
        COFOUNDER_TURN_INSTRUCTIONS_V1,
        effort === 'quick'
          ? 'Answer from existing context only. Do not start research or create jobs.'
          : effort === 'thorough'
            ? 'Be thorough. Use the full action set when it helps the founder. You may use read-only research and calculator tools inline before answering, but hand genuinely long-running work to start_research/create_job.'
            : 'Choose one action. Do not invent evidence. You may use a read-only research or calculator tool inline first if it directly answers the founder faster than starting a background job.',
      ].join('\n\n'),
      userPrompt: `Founder message: ${input.founderText}`,
      contextInput: {
        projectId: input.snapshot.pack.projectId,
        snapshot: input.snapshot,
        planScore: input.snapshot.planScore,
        recentMessages: input.snapshot.recentMessages,
        conversationSummary: input.snapshot.conversationSummary,
        confirmedPreferences: input.snapshot.confirmedPreferences,
        openFounderTasks: input.snapshot.openFounderTasks,
        recentJobs: input.snapshot.recentJobs,
        attachedEvidence: input.snapshot.attachedEvidence,
      },
      tools,
      toolRiskClasses: allRiskClasses,
      // Keyword-only skill selection: no extra model call, so it's cheap enough even for
      // `quick`-effort turns. Ambiguous cases (plan §select-skills.ts) just fold in nothing
      // rather than spending a classification call inline.
      skills: { registry: FOUNDRY_SKILLS, query: input.founderText },
      decisionSchema: CofounderDecisionSchema,
      submitToolDescription:
        'Call this once you have decided how to respond to the founder, to submit your final decision and end the turn.',
      budget,
      abortSignal: AbortSignal.timeout(input.timeoutMs),
    });
    decision = result.decision;
    contextItemsUsed = result.context.contextItemsUsed;
  } catch (error) {
    logger.warn(
      {
        event: 'cofounder_turn_fallback',
        runId: input.runId,
        errorName: error instanceof Error ? error.name : 'unknown_error',
        errorMessage: error instanceof Error ? error.message : String(error),
        effort,
      },
      'Cofounder turn fell back to diagnosis',
    );
    // Mirrors the previous single-shot behavior: any model/tool-loop failure (including the
    // model never calling `submit_decision`) falls back to the cheaper clarification path
    // rather than failing the whole turn.
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
    contextItemsUsed = [];
  }

  decision = boundDecisionByEffort(decision, effort);
  return dispatchCofounderDecision(decision, input.actions, contextItemsUsed);
}

export function boundDecisionByEffort(
  decision: CofounderDecision,
  effort: ConversationEffort,
): CofounderDecision {
  if (
    effort === 'quick' &&
    (decision.action === 'start_research' ||
      decision.action === 'create_job' ||
      decision.action === 'propose_draft_revision')
  ) {
    return { action: 'answer', text: decision.text };
  }
  return decision;
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
