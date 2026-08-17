import { limits } from '@foundry/config/limits';
import type { StreamEvent } from '@foundry/api-contracts';
import type { LanguageModel } from 'ai';
import { streamText } from 'ai';

import { ORCHESTRATOR_INSTRUCTIONS_V1 } from '../agents/instructions.js';
import type { PackSnapshot } from '../contracts/pack-snapshot.js';
import { normalize } from '../streaming/event-normalizer.js';

export type DiagnoseInput = {
  runId: string;
  questionId: string;
  answer: string;
  snapshot: PackSnapshot;
  model: LanguageModel;
  publish: (event: StreamEvent) => Promise<void>;
  instructions?: string;
  timeoutMs?: number;
};

export async function diagnoseClarification(input: DiagnoseInput): Promise<{ text: string }> {
  await input.publish({ type: 'message_started', runId: input.runId });
  const timeoutMs = input.timeoutMs ?? limits.interactive.diagnoseTimeoutMs;
  const result = streamText({
    model: input.model,
    instructions: input.instructions ?? ORCHESTRATOR_INSTRUCTIONS_V1,
    prompt: [
      `Current phase: ${input.snapshot.phase}.`,
      `Recent clarifications: ${JSON.stringify(input.snapshot.clarifications)}`,
      `Question ${input.questionId}: ${input.answer}`,
      'Respond with the next focused question or a concise diagnosis. Do not invent evidence.',
    ].join('\n'),
    abortSignal: AbortSignal.timeout(timeoutMs),
  });

  let assembled = '';
  // Interactive turns own the message envelope (08 §10). Skip AI SDK start/finish so clients see one pair.
  for await (const part of result.stream) {
    if (
      part.type === 'start' ||
      part.type === 'finish' ||
      part.type === 'start-step' ||
      part.type === 'finish-step'
    ) {
      continue;
    }
    const event = normalize(part, { runId: input.runId });
    if (event !== null) {
      if (event.type === 'text_delta') {
        assembled += event.delta;
      }
      await input.publish(event);
    }
  }

  const text = assembled.length > 0 ? assembled : await result.text;
  await input.publish({ type: 'message_completed', runId: input.runId });
  return { text };
}
