import type { ConversationMessage } from '@foundry/domain';
import type { LanguageModel } from 'ai';
import { generateText } from 'ai';

import { CONVERSATION_SUMMARY_INSTRUCTIONS_V1 } from '../agents/instructions.js';

export const CONVERSATION_SUMMARY_MESSAGE_THRESHOLD = 20;

export function shouldSummarizeConversation(
  uncoveredMessageCount: number,
  threshold = CONVERSATION_SUMMARY_MESSAGE_THRESHOLD,
): boolean {
  return uncoveredMessageCount >= threshold;
}

export async function summarizeConversation(input: {
  messages: ConversationMessage[];
  model: LanguageModel;
  timeoutMs: number;
}): Promise<{ summaryText: string; tokenCount: number }> {
  const chunks: ConversationMessage[][] = [];
  for (let index = 0; index < input.messages.length; index += 8) {
    chunks.push(input.messages.slice(index, index + 8));
  }
  const chunkSummaries: string[] = [];
  for (const chunk of chunks) {
    const generated = await generateText({
      model: input.model,
      instructions: CONVERSATION_SUMMARY_INSTRUCTIONS_V1,
      prompt: chunk.map((item) => `${item.actor}: ${item.text}`).join('\n'),
      abortSignal: AbortSignal.timeout(input.timeoutMs),
    });
    chunkSummaries.push(generated.text);
  }
  const merged =
    chunkSummaries.length === 1
      ? (chunkSummaries[0] ?? '')
      : (
          await generateText({
            model: input.model,
            instructions: CONVERSATION_SUMMARY_INSTRUCTIONS_V1,
            prompt: chunkSummaries.join('\n---\n'),
            abortSignal: AbortSignal.timeout(input.timeoutMs),
          })
        ).text;
  return {
    summaryText: merged.trim().length > 0 ? merged.trim() : 'Conversation in progress.',
    tokenCount: Math.ceil(merged.length / 4),
  };
}
