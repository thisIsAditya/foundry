import type {
  ConversationMessage,
  ConversationSummary,
  FounderPreference,
  FounderTask,
  PlanScore,
} from '@foundry/domain';
import type { AiJobSummary } from '@foundry/api-contracts';

import type { PackSnapshot } from './pack-snapshot.js';

/**
 * Raw, flattened input shape callers (`ConversationService.assembleSnapshot`) build today:
 * a `PackSnapshot` plus the conversation/preference/task/job facts that live outside the pack.
 * `runCofounderTurn` feeds this straight into `ContextAssembler.assemble()` — kept as its own
 * type (rather than inlined) so call sites don't need to import from `context/types.js`.
 */
export type CofounderContextSnapshot = PackSnapshot & {
  recentMessages: ConversationMessage[];
  conversationSummary: ConversationSummary | null;
  confirmedPreferences: FounderPreference[];
  planScore: PlanScore | null;
  openFounderTasks: FounderTask[];
  recentJobs: AiJobSummary[];
  attachedEvidence: { id: string; summary: string }[];
};
