import type {
  ConversationMessage,
  ConversationReference,
  ConversationSummary,
  FounderPreference,
  FounderTask,
  PlanScore,
} from '@foundry/domain';
import type { AiJobSummary } from '@foundry/api-contracts';

import type { PackSnapshot } from './pack-snapshot.js';

export type CofounderContextSnapshot = PackSnapshot & {
  recentMessages: ConversationMessage[];
  conversationSummary: ConversationSummary | null;
  confirmedPreferences: FounderPreference[];
  planScore: PlanScore | null;
  openFounderTasks: FounderTask[];
  recentJobs: AiJobSummary[];
};

export type CofounderContext = CofounderContextSnapshot & {
  contextItemsUsed: ConversationReference[];
};

const DEFAULT_MESSAGE_WINDOW = 20;

export function assembleCofounderContext(
  snapshot: CofounderContextSnapshot,
  messageWindow = DEFAULT_MESSAGE_WINDOW,
): CofounderContext {
  const recentMessages = snapshot.recentMessages.slice(-messageWindow);
  const contextItemsUsed: ConversationReference[] = [];
  if (snapshot.conversationSummary !== null) {
    contextItemsUsed.push({ kind: 'revision', id: snapshot.pack.id });
  }
  for (const message of recentMessages) {
    contextItemsUsed.push(...message.references);
  }
  for (const task of snapshot.openFounderTasks) {
    contextItemsUsed.push({ kind: 'founder_task', id: task.id });
  }
  for (const job of snapshot.recentJobs) {
    contextItemsUsed.push({ kind: 'job', id: job.id });
  }
  return {
    ...snapshot,
    recentMessages,
    contextItemsUsed,
  };
}

export function formatCofounderContext(context: CofounderContext): string {
  return JSON.stringify({
    phase: context.phase,
    packRevision: context.pack.revisionNumber,
    summary: context.conversationSummary?.summaryText ?? null,
    recentMessages: context.recentMessages.map((item) => ({
      actor: item.actor,
      text: item.text,
    })),
    preferences: context.confirmedPreferences.map((item) => ({
      key: item.key,
      value: item.value,
    })),
    score: context.planScore === null ? null : { overall: context.planScore.overall },
    openFounderTasks: context.openFounderTasks.map((item) => item.title),
    recentJobs: context.recentJobs.map((item) => ({
      objective: item.objective,
      status: item.status,
    })),
    clarifications: context.clarifications,
  });
}
