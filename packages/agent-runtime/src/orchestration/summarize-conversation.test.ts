import {
  ConversationMessageIdSchema,
  ConversationMessageSchema,
  ProjectIdSchema,
  type ConversationMessage,
} from '@foundry/domain';
import type { LanguageModel } from 'ai';
import { MockLanguageModelV3 } from 'ai/test';
import { describe, expect, it } from 'vitest';

import { summarizeConversation } from './summarize-conversation.js';

const projectId = ProjectIdSchema.parse('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');

const usage = {
  inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 10, text: 10, reasoning: undefined },
};

function message(id: string, text: string): ConversationMessage {
  return ConversationMessageSchema.parse({
    id: ConversationMessageIdSchema.parse(id),
    projectId,
    actor: 'founder',
    text,
    blocks: [{ kind: 'concise_answer', text }],
    references: [],
    createdAt: new Date('2026-04-01T00:00:00.000Z'),
  });
}

function recordingModel(prompts: string[], reply: string): LanguageModel {
  return new MockLanguageModelV3({
    doGenerate: async (options) => {
      const promptText = JSON.stringify(options.prompt);
      prompts.push(promptText);
      return {
        content: [{ type: 'text', text: reply }],
        finishReason: { unified: 'stop' as const, raw: undefined },
        usage,
        warnings: [],
      };
    },
  });
}

describe('summarizeConversation', () => {
  it('folds the previous rolling summary into the merge prompt instead of dropping it', async () => {
    const prompts: string[] = [];
    const model = recordingModel(prompts, 'Founder wants a B2B SaaS for restaurant closing.');
    const messages = Array.from({ length: 9 }, (_, index) =>
      message(`aaaaaaaa-0000-4000-8000-00000000000${index}`, `Message number ${index}`),
    );

    const result = await summarizeConversation({
      messages,
      model,
      timeoutMs: 5_000,
      previousSummaryText: 'Prior fact: the founder targets tier-2 city restaurants.',
    });

    expect(result.summaryText.length).toBeGreaterThan(0);
    // The merge step (the final generateText call) must have seen the prior summary text.
    expect(prompts.some((prompt) => prompt.includes('tier-2 city restaurants'))).toBe(true);
  });

  it('does not need a merge call when there is exactly one chunk and no prior summary', async () => {
    const prompts: string[] = [];
    const model = recordingModel(prompts, 'Single chunk summary.');
    const messages = [message('aaaaaaaa-0000-4000-8000-000000000000', 'Only message')];

    const result = await summarizeConversation({ messages, model, timeoutMs: 5_000 });

    expect(result.summaryText).toBe('Single chunk summary.');
    expect(prompts).toHaveLength(1);
  });
});
