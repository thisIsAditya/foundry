import { PackRevisionIdSchema, ProjectIdSchema } from '@foundry/domain';
import type { LanguageModel, Tool } from 'ai';
import { MockLanguageModelV3 } from 'ai/test';
import { tool } from 'ai';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { CODE_EXECUTE_TOOL_NAME } from '../code-mode/code-tool.js';
import type { PackSnapshot } from '../contracts/pack-snapshot.js';
import type { RunBudget } from '../budget/types.js';
import {
  FoundryAgent,
  FoundryAgentNoDecisionError,
  SUBMIT_DECISION_TOOL_NAME,
} from './foundry-agent.js';

const projectId = ProjectIdSchema.parse('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
const packRevisionId = PackRevisionIdSchema.parse('cccccccc-cccc-4ccc-8ccc-cccccccccccc');

const usage = {
  inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 20, text: 20, reasoning: undefined },
};

function snapshot(): PackSnapshot {
  return {
    pack: {
      id: packRevisionId,
      projectId,
      revisionNumber: 1,
      parentRevisionId: null,
      actorType: 'founder',
      actorId: null,
      sourceSprintId: null,
      status: 'accepted',
      proposedChanges: { clarifications: [] },
      acceptedChanges: null,
      validationResults: null,
      gateResults: null,
      dependencyInvalidations: null,
      createdAt: new Date('2026-04-01T00:00:00.000Z'),
      acceptedAt: new Date('2026-04-01T00:00:00.000Z'),
    },
    pendingDraftRevision: null,
    phase: 'problem',
    derivedPhase: null,
    interviews: [],
    quotes: [],
    beachheads: [],
    dmus: [],
    personas: [],
    problems: [],
    moneyRules: null,
    marketModels: [],
    unitEconomics: [],
    wtpEvents: [],
    assumptions: [],
    decisions: [],
    packSections: [],
    clarifications: [],
  };
}

const DecisionSchema = z.object({ action: z.literal('answer'), text: z.string().min(1) });
type Decision = z.infer<typeof DecisionSchema>;

const budget: RunBudget = {
  maxSteps: 4,
  maxDurationMs: 60_000,
  maxUsd: 1,
  maxToolRiskClass: 'compute',
  contextTokenCeiling: 8_000,
};

function baseContextInput() {
  return {
    projectId,
    snapshot: snapshot(),
    planScore: null,
    recentMessages: [],
    conversationSummary: null,
    confirmedPreferences: [],
    openFounderTasks: [],
    recentJobs: [],
    attachedEvidence: [],
  };
}

function toolCallModel(steps: Array<{ toolName: string; input: unknown }>): LanguageModel {
  let call = 0;
  return new MockLanguageModelV3({
    doGenerate: async () => {
      const step = steps[Math.min(call, steps.length - 1)] ?? steps[0];
      if (step === undefined) {
        throw new Error('toolCallModel requires at least one step');
      }
      call += 1;
      return {
        content: [
          {
            type: 'tool-call' as const,
            toolCallId: `call_${call}`,
            toolName: step.toolName,
            input: JSON.stringify(step.input),
          },
        ],
        finishReason: { unified: 'tool-calls' as const, raw: undefined },
        usage,
        warnings: [],
      };
    },
  });
}

function textOnlyModel(text: string): LanguageModel {
  return new MockLanguageModelV3({
    doGenerate: async () => ({
      content: [{ type: 'text', text }],
      finishReason: { unified: 'stop' as const, raw: undefined },
      usage,
      warnings: [],
    }),
  });
}

describe('FoundryAgent', () => {
  it('returns the parsed decision once the model calls submit_decision', async () => {
    const agent = new FoundryAgent<Decision>();
    const result = await agent.run({
      model: toolCallModel([
        { toolName: SUBMIT_DECISION_TOOL_NAME, input: { action: 'answer', text: 'Done.' } },
      ]),
      instructions: 'test',
      userPrompt: 'Founder message: hello',
      contextInput: baseContextInput(),
      tools: {},
      toolRiskClasses: {},
      decisionSchema: DecisionSchema,
      budget,
    });

    expect(result.decision).toEqual({ action: 'answer', text: 'Done.' });
    expect(result.steps).toBe(1);
    expect(result.spend.steps).toBe(1);
  });

  it('lets the model call a tool before submitting, and forwards the call to onToolCall', async () => {
    const lookupTool: Tool = tool({
      description: 'looks something up',
      inputSchema: z.object({ query: z.string() }),
      execute: async ({ query }: { query: string }) => ({ found: `result for ${query}` }),
    });
    const calls: Array<{ toolName: string; input: unknown; output: unknown }> = [];

    const agent = new FoundryAgent<Decision>();
    const result = await agent.run({
      model: toolCallModel([
        { toolName: 'lookup', input: { query: 'nightly close' } },
        { toolName: SUBMIT_DECISION_TOOL_NAME, input: { action: 'answer', text: 'Found it.' } },
      ]),
      instructions: 'test',
      userPrompt: 'Founder message: what did you find?',
      contextInput: baseContextInput(),
      tools: { lookup: lookupTool },
      toolRiskClasses: { lookup: 'read' },
      decisionSchema: DecisionSchema,
      budget,
      ports: {
        onToolCall: async (call) => {
          calls.push(call);
        },
      },
    });

    expect(result.decision).toEqual({ action: 'answer', text: 'Found it.' });
    expect(result.steps).toBe(2);
    expect(calls).toEqual([
      {
        toolName: 'lookup',
        input: { query: 'nightly close' },
        output: { found: 'result for nightly close' },
      },
    ]);
  });

  it('throws FoundryAgentNoDecisionError when the model never calls submit_decision', async () => {
    const agent = new FoundryAgent<Decision>();
    await expect(
      agent.run({
        model: textOnlyModel('I have nothing structured to say.'),
        instructions: 'test',
        userPrompt: 'Founder message: hello',
        contextInput: baseContextInput(),
        tools: {},
        toolRiskClasses: {},
        decisionSchema: DecisionSchema,
        budget: { ...budget, maxSteps: 2 },
      }),
    ).rejects.toBeInstanceOf(FoundryAgentNoDecisionError);
  });

  it('folds a keyword-selected skill into the run instructions', async () => {
    let capturedSystemText = '';
    const model = new MockLanguageModelV3({
      doGenerate: async (options) => {
        const systemMessage = options.prompt.find((message) => message.role === 'system');
        capturedSystemText = systemMessage === undefined ? '' : systemMessage.content;
        return {
          content: [
            {
              type: 'tool-call' as const,
              toolCallId: 'call_1',
              toolName: SUBMIT_DECISION_TOOL_NAME,
              input: JSON.stringify({ action: 'answer', text: 'ok' }),
            },
          ],
          finishReason: { unified: 'tool-calls' as const, raw: undefined },
          usage,
          warnings: [],
        };
      },
    });

    const agent = new FoundryAgent<Decision>();
    const result = await agent.run({
      model,
      instructions: 'Base instructions.',
      userPrompt: 'Founder message: research our competitors please',
      contextInput: baseContextInput(),
      tools: {},
      toolRiskClasses: {},
      decisionSchema: DecisionSchema,
      budget,
      skills: {
        registry: [
          {
            id: 'competitor_research',
            title: 'Competitor research',
            whenToUse: 'competitors competitive landscape alternatives rivals',
            instructions: 'Ground competitor research in existing plan context.',
          },
        ],
        query: 'research our competitors please',
      },
    });

    expect(capturedSystemText).toContain('Base instructions.');
    expect(capturedSystemText).toContain('Ground competitor research in existing plan context.');
    expect(result.selectedSkills.map((skill) => skill.id)).toEqual(['competitor_research']);
  });

  it('excludes tools riskier than the budget ceiling from the active tool set', async () => {
    const draftTool: Tool = tool({
      description: 'drafts something',
      inputSchema: z.object({}),
      execute: async () => ({ ok: true }),
    });
    // A model that (incorrectly) tries to call the draft-risk tool despite it being filtered out
    // of activeTools should have that call rejected by the SDK, and fall through to no decision.
    const agent = new FoundryAgent<Decision>();
    const readOnlyBudget: RunBudget = { ...budget, maxToolRiskClass: 'read', maxSteps: 1 };
    const result = await agent.run({
      model: toolCallModel([
        { toolName: SUBMIT_DECISION_TOOL_NAME, input: { action: 'answer', text: 'ok' } },
      ]),
      instructions: 'test',
      userPrompt: 'Founder message: hello',
      contextInput: baseContextInput(),
      tools: { draft_tool: draftTool },
      toolRiskClasses: { draft_tool: 'draft' },
      decisionSchema: DecisionSchema,
      budget: readOnlyBudget,
    });
    expect(result.decision).toEqual({ action: 'answer', text: 'ok' });
  });

  it('adds code.execute when codeMode is enabled, scoped to only read/compute tools', async () => {
    const lookupTool: Tool = tool({
      description: 'looks something up',
      inputSchema: z.object({ query: z.string() }),
      execute: async ({ query }: { query: string }) => ({ found: `result for ${query}` }),
    });
    const draftTool: Tool = tool({
      description: 'drafts something',
      inputSchema: z.object({}),
      execute: async () => ({ ok: true }),
    });

    const agent = new FoundryAgent<Decision>();
    const result = await agent.run({
      model: toolCallModel([
        {
          toolName: CODE_EXECUTE_TOOL_NAME,
          input: { source: `const r = await callTool('lookup', { query: 'x' }); return r.found;` },
        },
        { toolName: SUBMIT_DECISION_TOOL_NAME, input: { action: 'answer', text: 'x found' } },
      ]),
      instructions: 'test',
      userPrompt: 'Founder message: hello',
      contextInput: baseContextInput(),
      tools: { lookup: lookupTool, draft_tool: draftTool },
      toolRiskClasses: { lookup: 'read', draft_tool: 'draft' },
      decisionSchema: DecisionSchema,
      budget,
      codeMode: true,
    });

    expect(result.decision).toEqual({ action: 'answer', text: 'x found' });
    expect(result.steps).toBe(2);
  });

  it('does not add code.execute when codeMode is left off (the default)', async () => {
    const agent = new FoundryAgent<Decision>();
    const result = await agent.run({
      model: toolCallModel([
        { toolName: SUBMIT_DECISION_TOOL_NAME, input: { action: 'answer', text: 'ok' } },
      ]),
      instructions: 'test',
      userPrompt: 'Founder message: hello',
      contextInput: baseContextInput(),
      tools: {},
      toolRiskClasses: {},
      decisionSchema: DecisionSchema,
      budget,
    });
    expect(result.decision).toEqual({ action: 'answer', text: 'ok' });
  });
});
