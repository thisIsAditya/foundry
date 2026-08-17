import type { StreamEvent } from '@foundry/api-contracts';

export type RunContext = {
  runId: string;
  sprintId?: string;
};

export type AiSdkStreamPart = {
  type: string;
  text?: string;
  textDelta?: string;
  delta?: string;
  toolName?: string;
  toolCallId?: string;
  input?: unknown;
  output?: unknown;
  sprintId?: unknown;
  progress?: unknown;
  proposal?: unknown;
  question?: unknown;
  warning?: unknown;
  reason?: unknown;
};

export type DomainStreamPart = {
  type: string;
  [key: string]: unknown;
};

export function normalize(
  part: AiSdkStreamPart | DomainStreamPart,
  ctx: RunContext,
): StreamEvent | null {
  switch (part.type) {
    case 'start':
    case 'message_started':
      return { type: 'message_started', runId: ctx.runId };
    case 'text-delta':
    case 'text_delta': {
      const delta =
        typeof part.text === 'string'
          ? part.text
          : typeof part.textDelta === 'string'
            ? part.textDelta
            : typeof part.delta === 'string'
              ? part.delta
              : '';
      if (delta.length === 0) {
        return null;
      }
      return { type: 'text_delta', runId: ctx.runId, delta };
    }
    case 'tool-call':
    case 'tool_planned':
      return {
        type: 'tool_planned',
        runId: ctx.runId,
        tool: {
          name: 'toolName' in part ? part.toolName : undefined,
          toolCallId: 'toolCallId' in part ? part.toolCallId : undefined,
        },
      };
    case 'tool-result':
    case 'tool_completed':
      return {
        type: 'tool_completed',
        runId: ctx.runId,
        toolCallId: typeof part.toolCallId === 'string' ? part.toolCallId : 'unknown',
        result: 'output' in part ? part.output : undefined,
      };
    case 'finish':
    case 'message_completed':
      return { type: 'message_completed', runId: ctx.runId };
    case 'sprint_progress':
      return {
        type: 'sprint_progress',
        sprintId: ctx.sprintId ?? String(part.sprintId ?? ''),
        progress: part.progress ?? part,
      };
    case 'proposal_ready':
      return { type: 'proposal_ready', runId: ctx.runId, proposal: part.proposal };
    case 'question_ready':
      return { type: 'question_ready', runId: ctx.runId, question: part.question };
    case 'warning':
      return { type: 'warning', runId: ctx.runId, warning: part.warning };
    case 'blocked':
      return { type: 'blocked', runId: ctx.runId, reason: part.reason };
    default:
      return null;
  }
}
