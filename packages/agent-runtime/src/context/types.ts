import type { AiJobSummary } from '@foundry/api-contracts';
import type {
  ConversationMessage,
  ConversationReference,
  ConversationSummary,
  FounderPreference,
  FounderTask,
  PlanScore,
  ProjectId,
} from '@foundry/domain';

import type { PackSnapshot } from '../contracts/pack-snapshot.js';

/** An `AiJobSummary` enriched with a short excerpt of what the job actually produced, so the
 * agent can reason about *what was learned*, not just that a job ran (plan §"recent jobs...
 * with synthesis text, not just objective/status"). */
export type ContextJobSummary = AiJobSummary & {
  synthesisSummary?: string;
};

/** Provenance for a fact that was considered but left out of the assembled packet — kept so
 * the agent (or a human debugging it) can see what was dropped and why, per the plan's
 * selection-rules requirement that provenance survive for included *and* dropped facts. */
export type DroppedContextItem = {
  kind: string;
  id: string;
  reason: string;
};

/** Raw, already-loaded inputs the assembler turns into an `AgentContextPacket`. Callers
 * (`ConversationService`, sprint `process.ts`) own all DB access — this keeps `agent-runtime`
 * free of any DB dependency, per the plan's "ports" requirement. */
export type AssembleContextInput = {
  projectId: ProjectId;
  snapshot: PackSnapshot;
  planScore: PlanScore | null;
  recentMessages: readonly ConversationMessage[];
  conversationSummary: ConversationSummary | null;
  confirmedPreferences: readonly FounderPreference[];
  openFounderTasks: readonly FounderTask[];
  recentJobs: readonly ContextJobSummary[];
  attachedEvidence: readonly { id: string; summary: string }[];
  /** How many of the most recent conversation messages to keep verbatim; older messages are
   * represented only via `conversationSummary`. Defaults to 20. */
  messageWindow?: number;
};

/** The superset context packet: everything a `FoundryAgent` run might need about the founder's
 * plan, conversation, and in-flight work, plus provenance for what's included/dropped. This
 * replaces the old lossy `CofounderContextSnapshot` — no plan fact loaded onto `PackSnapshot`
 * is silently dropped before it reaches the model. */
export type AgentContextPacket = PackSnapshot & {
  projectId: ProjectId;
  planScore: PlanScore | null;
  recentMessages: ConversationMessage[];
  conversationSummary: ConversationSummary | null;
  confirmedPreferences: FounderPreference[];
  openFounderTasks: FounderTask[];
  recentJobs: ContextJobSummary[];
  attachedEvidence: { id: string; summary: string }[];
  contextItemsUsed: ConversationReference[];
  droppedItems: DroppedContextItem[];
};
