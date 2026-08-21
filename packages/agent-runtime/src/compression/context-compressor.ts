import type { ModelMessage } from 'ai';
import { pruneMessages } from 'ai';

import type { ContextBudgetSplit } from '../budget/types.js';
import type { AgentContextPacket, DroppedContextItem } from '../context/types.js';

/** Rough chars-per-token heuristic shared with the rest of the codebase's token estimates
 * (`ConversationSummary.tokenCount` uses the same `length / 4`). Kept pluggable-by-replacement
 * rather than exact per-provider tokenization (plan §non-goals). */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export type CompressionResult = {
  packet: AgentContextPacket;
  formattedContext: string;
  droppedItems: DroppedContextItem[];
};

/**
 * Trims an already-assembled `AgentContextPacket` down to its `ContextBudgetSplit` token
 * ceilings when the formatted prompt would otherwise exceed them. Three passes, in order:
 * (1) structural — nothing to prune yet at the packet level (in-run tool transcripts are
 * pruned separately via `pruneRunMessages`, since those live on the AI SDK message array, not
 * the packet); (2) semantic — the packet's `conversationSummary` already carries the
 * accumulated rolling summary (fixed to fold forward, see `summarizeConversation`), so no
 * further action needed here beyond trusting it; (3) priority-based trimming of plan-fact lists
 * (accepted-over-draft is already true by construction — `pendingDraftRevision` is always
 * secondary to `pack` — so trimming here only removes the *oldest* items within a category,
 * always logging what was cut).
 */
export class ContextCompressor {
  constructor(private readonly format: (packet: AgentContextPacket) => string) {}

  compress(packet: AgentContextPacket, split: ContextBudgetSplit): CompressionResult {
    let working = packet;
    let formatted = this.format(working);
    const droppedItems: DroppedContextItem[] = [...packet.droppedItems];
    const messageBudget = split.messagesTokens;
    const planFactsBudget = split.planFactsTokens + split.evidenceTokens;

    const messagesTokenEstimate = estimateTokens(
      working.recentMessages.map((message) => message.text).join('\n'),
    );
    if (messagesTokenEstimate > messageBudget) {
      const trimmed = trimOldestUntilUnderBudget(working.recentMessages, messageBudget, (message) =>
        estimateTokens(message.text),
      );
      for (const dropped of trimmed.dropped) {
        droppedItems.push({
          kind: 'conversation_message',
          id: dropped.id,
          reason: 'trimmed by ContextCompressor to fit messagesTokens budget',
        });
      }
      working = { ...working, recentMessages: trimmed.kept };
    }

    formatted = this.format(working);
    let totalTokens = estimateTokens(formatted);
    const overBudget = totalTokens > messageBudget + planFactsBudget;
    if (overBudget) {
      const trimmedPlanFacts = trimPlanFactsUntilUnderBudget(working, planFactsBudget);
      working = trimmedPlanFacts.packet;
      droppedItems.push(...trimmedPlanFacts.dropped);
      formatted = this.format(working);
      totalTokens = estimateTokens(formatted);
    }

    return {
      packet: { ...working, droppedItems },
      formattedContext: formatted,
      droppedItems,
    };
  }

  /** Structural pruning of an in-run message transcript (tool calls/results/reasoning from
   * earlier steps of the *same* multi-step run) using the AI SDK's own `pruneMessages`. Distinct
   * from `compress()`, which trims the initial context packet before the run starts. */
  pruneRunMessages(messages: ModelMessage[]): ModelMessage[] {
    return pruneMessages({
      messages,
      reasoning: 'before-last-message',
      toolCalls: 'before-last-2-messages',
      emptyMessages: 'remove',
    });
  }
}

function trimOldestUntilUnderBudget<T extends { id: string }>(
  items: readonly T[],
  budgetTokens: number,
  tokensOf: (item: T) => number,
): { kept: T[]; dropped: T[] } {
  let total = items.reduce((sum, item) => sum + tokensOf(item), 0);
  const kept = [...items];
  const dropped: T[] = [];
  while (total > budgetTokens && kept.length > 1) {
    const removed = kept.shift();
    if (removed === undefined) {
      break;
    }
    total -= tokensOf(removed);
    dropped.push(removed);
  }
  return { kept, dropped };
}

/**
 * Priority order when a category must shrink further: pending-draft facts are already excluded
 * from `pack`-derived categories (they live on `pendingDraftRevision`, kept separately), so this
 * only ever removes the oldest items within `packSections`/`decisions`/`assumptions` — never the
 * accepted pack revision itself or the newest facts in a category.
 */
function trimPlanFactsUntilUnderBudget(
  packet: AgentContextPacket,
  budgetTokens: number,
): { packet: AgentContextPacket; dropped: DroppedContextItem[] } {
  const dropped: DroppedContextItem[] = [];
  let decisions = packet.decisions;
  let assumptions = packet.assumptions;
  let quotes = packet.quotes;

  const currentTokens = () => estimateTokens(JSON.stringify({ decisions, assumptions, quotes }));

  while (currentTokens() > budgetTokens) {
    if (decisions.length > 3) {
      const [removed, ...rest] = decisions.slice().reverse();
      decisions = rest.reverse();
      if (removed !== undefined) {
        dropped.push({
          kind: 'decision',
          id: removed.id,
          reason: 'trimmed by ContextCompressor to fit planFacts budget (oldest-first)',
        });
      }
      continue;
    }
    if (quotes.length > 3) {
      const [removed, ...rest] = quotes.slice().reverse();
      quotes = rest.reverse();
      if (removed !== undefined) {
        dropped.push({
          kind: 'quote',
          id: removed.id,
          reason: 'trimmed by ContextCompressor to fit planFacts budget (oldest-first)',
        });
      }
      continue;
    }
    if (assumptions.length > 3) {
      const [removed, ...rest] = assumptions.slice().reverse();
      assumptions = rest.reverse();
      if (removed !== undefined) {
        dropped.push({
          kind: 'assumption',
          id: removed.id,
          reason: 'trimmed by ContextCompressor to fit planFacts budget (oldest-first)',
        });
      }
      continue;
    }
    break;
  }

  return { packet: { ...packet, decisions, assumptions, quotes }, dropped };
}
