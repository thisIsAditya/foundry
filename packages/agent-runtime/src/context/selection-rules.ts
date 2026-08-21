import type { ConversationMessage } from '@foundry/domain';

import type { DroppedContextItem } from './types.js';

export const DEFAULT_MESSAGE_WINDOW = 20;

/** Per-category cap so one noisy list (e.g. decisions) can't crowd out everything else before
 * the `BudgetAllocator`/`ContextCompressor` (milestone 2) does real token-aware trimming. Kept
 * generous — this is a backstop, not the primary trimming mechanism. */
export const DEFAULT_ITEM_CAP = 25;

/** Keeps the newest `messageWindow` messages verbatim; everything older is only represented via
 * the rolling `conversationSummary`, never silently vanishes without a summary covering it. */
export function windowMessages(
  messages: readonly ConversationMessage[],
  messageWindow: number,
): ConversationMessage[] {
  return messages.slice(-messageWindow);
}

/**
 * Caps a list to `limit` most-recent-first items, recording anything cut as a `DroppedContextItem`
 * so provenance survives even for facts the packet doesn't carry (plan §selection-rules "provenance
 * kept for anything included or dropped").
 */
export function capWithProvenance<T>(
  items: readonly T[],
  limit: number,
  toDropped: (item: T) => DroppedContextItem,
): { kept: T[]; dropped: DroppedContextItem[] } {
  if (items.length <= limit) {
    return { kept: [...items], dropped: [] };
  }
  return {
    kept: items.slice(0, limit),
    dropped: items.slice(limit).map(toDropped),
  };
}

/**
 * De-duplicates plain-text statements (problems, assumptions) so near-identical restatements
 * across pack revisions don't waste context budget or read as contradictory to the model.
 */
export function dedupeStatements<T extends { statement: string }>(items: readonly T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of items) {
    const key = item.statement.trim().toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(item);
  }
  return result;
}

/**
 * "Accepted beats draft": the pack's own accepted state always wins over a pending draft when
 * both describe the same section. The pending draft is still surfaced, but labeled as
 * *proposed, not yet accepted* so the model never treats it as ground truth (plan
 * §selection-rules "accepted beats draft").
 */
export function describeDraftStatus(hasPendingDraft: boolean): string {
  return hasPendingDraft
    ? 'A draft revision is pending founder review and is NOT yet part of the accepted plan.'
    : 'No pending draft revision.';
}
