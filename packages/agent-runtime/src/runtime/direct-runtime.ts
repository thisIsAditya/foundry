import { AppError } from '@foundry/observability';

import type { RuntimeCapabilityPort } from './capability-port.js';
import {
  CofounderRuntimeResultSchema,
  type CofounderRuntime,
  type CofounderRuntimeInput,
  type CofounderRuntimeResult,
} from './types.js';

function canceledError(): AppError {
  return new AppError({
    code: 'workflow_paused',
    explanation: 'The co-founder turn was canceled.',
    nextAction: 'Retry when you want to continue. Accepted record state is unchanged.',
  });
}

function looksLikeRetrieval(text: string): boolean {
  return /\b(search|evidence|interview|research|sources?|quote|what do we know)\b/i.test(text);
}

function looksLikeIntake(text: string): boolean {
  return /\bintake\b|\bsetup material\b|\bsource material\b/i.test(text);
}

async function invokeNamed(
  capabilities: RuntimeCapabilityPort | undefined,
  operationId: string,
  name: string,
  input: unknown,
): Promise<string | null> {
  if (capabilities === undefined) {
    return null;
  }
  const result = await capabilities.invoke({ name, input, operationId });
  return result.ok ? result.summary : result.summary;
}

export class DirectStructuredRuntime implements CofounderRuntime {
  async run(input: CofounderRuntimeInput): Promise<CofounderRuntimeResult> {
    if (input.abortSignal?.aborted === true) {
      throw canceledError();
    }
    const packet = input.contextPacket;
    await invokeNamed(input.capabilities, input.operationId, 'venture.readCurrentState@1', {
      currentStage: packet.currentStage,
      currentObjective: packet.currentObjective,
    });
    if (looksLikeRetrieval(input.founderRequest)) {
      await invokeNamed(input.capabilities, input.operationId, 'evidence.searchApproved@1', {
        query: looksLikeIntake(input.founderRequest)
          ? 'founder intake'
          : input.founderRequest.slice(0, 240),
        ...(looksLikeIntake(input.founderRequest) ? { scope: 'intake' } : {}),
      });
    }
    const recordFacts = packet.acceptedRecord
      .filter(
        (item) => item.status === 'accepted' && item.summary.length > 0 && item.id !== undefined,
      )
      .slice(0, 4)
      .map((item) => ({
        statement: item.summary,
        references: [{ kind: 'record', id: item.id as string }],
      }));
    const evidenceFacts = packet.evidence.slice(0, 3).map((item) => ({
      statement: item.summary,
      references: [{ kind: 'evidence', id: item.id }],
    }));
    const facts = [...recordFacts, ...evidenceFacts];
    const empty = packet.acceptedRecord.filter((item) => item.status === 'empty').length;
    const explanation =
      facts.length === 0
        ? `We are in ${packet.currentStage}: ${packet.currentObjective}. What founder-only fact would most change the next useful step?`
        : `We are in ${packet.currentStage}: ${packet.currentObjective}. I can only use stored record and evidence IDs, not invented market claims.`;
    const result: CofounderRuntimeResult = {
      explanation,
      interactionType: facts.length === 0 ? 'ask' : 'inform',
      references: facts.flatMap((item) => item.references),
      facts,
      interpretation:
        facts.length === 0
          ? 'No accepted record or cited evidence is available yet, so this is a clarifying question, not a conclusion.'
          : 'These statements come from stored venture state. They are not independent validation of demand or willingness to pay.',
      assumptions:
        empty > 0 ? [`${String(empty)} record section(s) are still empty on purpose.`] : [],
      recommendation: packet.currentObjective,
      uncertainty:
        packet.omitted.length === 0
          ? 'Only the bounded context envelope was used.'
          : `Omitted from context: ${packet.omitted.join(', ')}.`,
      blockedConditions: packet.blockedSteps.map((item) => item.objective),
      activity:
        'Read current venture state through the application gateway. Accepted record state is unchanged.',
    };
    return CofounderRuntimeResultSchema.parse(result);
  }
}
