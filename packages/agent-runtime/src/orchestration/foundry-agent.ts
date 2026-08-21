import type { RiskClass } from '@foundry/domain';
import { getLogger } from '@foundry/observability';
import {
  generateText,
  tool,
  type LanguageModel,
  type ModelMessage,
  type Tool,
  type ToolSet,
} from 'ai';
import type { ZodType } from 'zod';

import { BudgetAllocator } from '../budget/budget-allocator.js';
import type { BudgetSpendSink, RunBudget, RunSpend } from '../budget/types.js';
import { CODE_EXECUTE_TOOL_NAME, createCodeExecuteTool } from '../code-mode/code-tool.js';
import { ContextCompressor } from '../compression/context-compressor.js';
import { ContextAssembler } from '../context/context-assembler.js';
import type { AgentContextPacket, AssembleContextInput } from '../context/types.js';
import { selectSkills, type SelectSkillsInput } from '../skills/select-skills.js';
import type { AgentSkill } from '../skills/types.js';

export const SUBMIT_DECISION_TOOL_NAME = 'submit_decision';

const riskRank: Record<RiskClass, number> = {
  read: 0,
  compute: 1,
  draft: 2,
  side_effect: 3,
  forbidden: 4,
};

/**
 * Turns any Zod decision schema into the terminal tool the model must call to end a
 * `FoundryAgent` run. Deliberately has no `execute` function — per the AI SDK's own
 * tool-loop semantics, a tool call to a no-execute tool ends the step loop on its own, and
 * `BudgetAllocator.buildStopConditions`'s `hasToolCall` entry is a second, explicit guard for
 * providers where that isn't reliable.
 */
export function defineSubmitTool<T>(schema: ZodType<T>, description: string): Tool {
  return tool({ description, inputSchema: schema }) as Tool;
}

export type FoundryAgentPorts = {
  /** Called after every step with cumulative + delta usage — forwards straight into whatever
   * ledger the caller uses (`BudgetLedgerEntry`/`UsageRecord`/`Sprint.budgetUsedUsd`, or a no-op
   * for runs that don't bill against a sprint budget). */
  onStepUsage?: BudgetSpendSink | undefined;
  /** Called once per tool call made during the run (excluding the terminal `submit_decision`
   * call itself), so a caller with a `ToolCall`/`AgentRun` persistence layer can log it. */
  onToolCall?:
    | ((call: { toolName: string; input: unknown; output: unknown }) => Promise<void> | void)
    | undefined;
};

export type FoundryAgentRunInput<TDecision> = {
  /** Correlation identifier used only for structured runtime diagnostics. */
  runId?: string;
  /** Stable role name used in runtime diagnostics. */
  agentName?: string;
  model: LanguageModel;
  /** Swapped in via `prepareStep` once spend crosses ~80% of `budget.maxUsd`, so a run that's
   * burning through its allowance finishes on a cheaper model instead of being cut off. */
  fallbackModel?: LanguageModel;
  instructions: string;
  userPrompt: string;
  contextInput: AssembleContextInput;
  /** Already narrowed to the run's max allowed risk class by the caller (`PolicyService.filterTools`
   * against the *ceiling*); `FoundryAgent` further narrows this per-step via `prepareStep` as
   * spend rises, using `toolRiskClasses` to know which names are still safe to keep active. */
  tools: ToolSet;
  toolRiskClasses: Record<string, RiskClass>;
  decisionSchema: ZodType<TDecision>;
  submitToolDescription?: string;
  budget: RunBudget;
  ports?: FoundryAgentPorts;
  abortSignal?: AbortSignal;
  /** When set, `FoundryAgent` selects skills via `selectSkills` (plan §skills registry) and
   * folds their `instructions` after `instructions` above, before the run starts. Selected
   * skills' `toolAllowlistAdditions` are protected from `BudgetAllocator`'s spend-based risk
   * narrowing, but only for tool names already present in `tools` — a skill can never grant
   * access to a tool the caller didn't already risk-clear. */
  skills?: SelectSkillsInput;
  /** Off by default (plan §"code-mode/", milestone 6). When true, adds the `code.execute` tool
   * (risk class `compute`), scoped to only the `read`/`compute`-risk tools already in `tools` —
   * `draft`/`side_effect`/`forbidden` tools stay unreachable from inside the sandbox no matter
   * what the outer run's risk ceiling allows, as defense in depth. */
  codeMode?: boolean;
};

export type FoundryAgentRunResult<TDecision> = {
  decision: TDecision;
  steps: number;
  context: AgentContextPacket;
  spend: RunSpend;
  text: string;
  selectedSkills: AgentSkill[];
};

export class FoundryAgentNoDecisionError extends Error {
  constructor(public readonly steps: number) {
    super(
      `FoundryAgent run ended after ${steps} step(s) without calling ${SUBMIT_DECISION_TOOL_NAME}`,
    );
    this.name = 'FoundryAgentNoDecisionError';
  }
}

/**
 * The shared multi-step agent loop (plan §"Reusable Foundry Agent Loop"). One instance can be
 * reused across runs (it's stateless); each `run()` call assembles its own context, budget, and
 * compression pass. Replaces the single-shot `generateObject`/`generateText` calls that used to
 * live directly in `cofounder-turn.ts` and `worker-pool.ts`.
 */
export class FoundryAgent<TDecision> {
  private readonly contextAssembler = new ContextAssembler();
  private readonly contextCompressor = new ContextCompressor((packet) =>
    this.contextAssembler.format(packet),
  );

  async run(input: FoundryAgentRunInput<TDecision>): Promise<FoundryAgentRunResult<TDecision>> {
    const logger = getLogger();
    const allocator = new BudgetAllocator(input.budget, input.ports?.onStepUsage);
    const context = this.contextAssembler.assemble(input.contextInput);
    const compressed = this.contextCompressor.compress(context, allocator.splitContextBudget());

    const selectedSkills = input.skills === undefined ? [] : await selectSkills(input.skills);
    const protectedToolNames = new Set(
      selectedSkills.flatMap((skill) => skill.toolAllowlistAdditions ?? []),
    );
    const instructions = [
      input.instructions,
      ...selectedSkills.map((skill) => skill.instructions),
    ].join('\n\n');

    const submitTool = defineSubmitTool(
      input.decisionSchema,
      input.submitToolDescription ??
        'Call this exactly once, when you are ready, to submit your final structured decision and end the run.',
    );
    const tools: ToolSet = { ...input.tools, [SUBMIT_DECISION_TOOL_NAME]: submitTool };
    const toolRiskClasses = { ...input.toolRiskClasses };
    if (input.codeMode === true) {
      const callableTools: ToolSet = {};
      for (const [name, candidate] of Object.entries(input.tools)) {
        const risk = input.toolRiskClasses[name];
        if (risk === 'read' || risk === 'compute') {
          callableTools[name] = candidate;
        }
      }
      tools[CODE_EXECUTE_TOOL_NAME] = createCodeExecuteTool({ callableTools });
      toolRiskClasses[CODE_EXECUTE_TOOL_NAME] = 'compute';
    }
    const toolNames = Object.keys(tools);
    logger.info(
      {
        event: 'foundry_agent_started',
        runId: input.runId,
        agentName: input.agentName ?? 'foundry_agent',
        model: typeof input.model === 'string' ? input.model : 'language_model',
        maxSteps: input.budget.maxSteps,
        maxDurationMs: input.budget.maxDurationMs,
        maxToolRiskClass: input.budget.maxToolRiskClass,
        availableTools: toolNames,
        selectedSkills: selectedSkills.map((skill) => skill.id),
        contextItems: compressed.packet.contextItemsUsed.length,
        droppedContextItems: compressed.droppedItems.length,
      },
      'Foundry agent started',
    );
    let completedSteps = 0;

    const result = await generateText({
      model: input.model,
      instructions,
      tools,
      stopWhen: allocator.buildStopConditions(SUBMIT_DECISION_TOOL_NAME),
      prompt: [compressed.formattedContext, input.userPrompt].join('\n\n'),
      ...(input.abortSignal === undefined ? {} : { abortSignal: input.abortSignal }),
      prepareStep: ({ stepNumber }) => {
        const effectiveRisk = allocator.effectiveMaxToolRiskClass();
        const effectiveRank = riskRank[effectiveRisk];
        const activeTools = toolNames.filter((name) => {
          if (name === SUBMIT_DECISION_TOOL_NAME || protectedToolNames.has(name)) {
            return true;
          }
          const risk = toolRiskClasses[name];
          return risk !== undefined && riskRank[risk] <= effectiveRank;
        });
        const useFallback =
          input.fallbackModel !== undefined &&
          input.budget.maxUsd > 0 &&
          allocator.currentSpend().usd / input.budget.maxUsd >= 0.8;
        return {
          activeTools,
          ...(useFallback ? { model: input.fallbackModel } : {}),
          ...(stepNumber === 0 ? {} : {}),
        };
      },
      onStepFinish: async (step) => {
        completedSteps += 1;
        const toolNamesInStep = step.toolCalls.map((call) => call.toolName);
        logger.info(
          {
            event: 'foundry_agent_step_finished',
            runId: input.runId,
            agentName: input.agentName ?? 'foundry_agent',
            step: completedSteps,
            toolCalls: toolNamesInStep,
            submittedDecision: toolNamesInStep.includes(SUBMIT_DECISION_TOOL_NAME),
            inputTokens: step.usage.inputTokens ?? 0,
            outputTokens: step.usage.outputTokens ?? 0,
          },
          'Foundry agent step finished',
        );
        await allocator.recordStepUsage({
          inputTokens: step.usage.inputTokens ?? 0,
          outputTokens: step.usage.outputTokens ?? 0,
          costUsd: 0,
        });
        for (const call of step.toolCalls) {
          if (call.toolName === SUBMIT_DECISION_TOOL_NAME) {
            continue;
          }
          const matchingResult = step.toolResults.find(
            (toolResult) => toolResult.toolCallId === call.toolCallId,
          );
          await input.ports?.onToolCall?.({
            toolName: call.toolName,
            input: call.input,
            output: matchingResult?.output,
          });
          logger.info(
            {
              event: 'foundry_agent_tool_call',
              runId: input.runId,
              agentName: input.agentName ?? 'foundry_agent',
              toolName: call.toolName,
              outputAvailable: matchingResult !== undefined,
            },
            'Foundry agent tool call completed',
          );
        }
      },
    });

    const submitCall = [...result.steps]
      .reverse()
      .flatMap((step) => step.toolCalls)
      .find((call) => call.toolName === SUBMIT_DECISION_TOOL_NAME);
    if (submitCall === undefined) {
      logger.warn(
        {
          event: 'foundry_agent_no_decision',
          runId: input.runId,
          agentName: input.agentName ?? 'foundry_agent',
          steps: result.steps.length,
          finishReason: result.finishReason,
          textLength: result.text.length,
        },
        'Foundry agent ended without submit_decision',
      );
      throw new FoundryAgentNoDecisionError(result.steps.length);
    }
    const decision = input.decisionSchema.parse(submitCall.input);

    logger.info(
      {
        event: 'foundry_agent_completed',
        runId: input.runId,
        agentName: input.agentName ?? 'foundry_agent',
        steps: result.steps.length,
        submittedDecision: true,
        action:
          typeof decision === 'object' && decision !== null && 'action' in decision
            ? String(decision.action)
            : undefined,
      },
      'Foundry agent completed',
    );
    return {
      decision,
      steps: result.steps.length,
      context: compressed.packet,
      spend: allocator.currentSpend(),
      text: result.text,
      selectedSkills,
    };
  }

  /** Structural pruning of an in-progress run's own message transcript (for a future
   * streaming/resumable variant that keeps its own `ModelMessage[]` across calls, rather than
   * relying on `generateText`'s internal step loop). Exposed here so callers building a
   * multi-turn agent on top of `FoundryAgent` don't need to reach into `ContextCompressor`
   * directly. */
  pruneRunMessages(messages: ModelMessage[]): ModelMessage[] {
    return this.contextCompressor.pruneRunMessages(messages);
  }
}
