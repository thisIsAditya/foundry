/**
 * A provider-agnostic, selectable unit of domain instructions a `FoundryAgent` run can fold in
 * on demand — the reusable replacement for pinning a specialist's instructions to a fixed
 * `agent_definitions.name` row (plan §"skills/ — provider-agnostic skills registry"). Not built
 * on the AI SDK's `uploadSkill`/provider-skills API: that requires a provider `skills()`
 * endpoint (Anthropic-only today), and this app also runs on OpenAI, Bedrock, and local Ollama
 * models (plan §non-goals).
 */
export type AgentSkill = {
  id: string;
  title: string;
  /** Free-text description of when this skill applies, matched against the run's query by
   * `selectSkillsByKeyword` and shown verbatim to the fallback classifier. Written for keyword
   * overlap, not prose quality — pack it with the nouns a founder would actually use. */
  whenToUse: string;
  /** Folded verbatim into the run's `instructions` when this skill is selected. */
  instructions: string;
  /** Tool names this skill needs protected from `BudgetAllocator`'s spend-based risk narrowing
   * for the duration of the run — only effective for tools the caller already loaded into
   * `FoundryAgentRunInput.tools` and risk-cleared via `PolicyService.filterTools`; a skill can
   * never smuggle in a tool the caller didn't already allow (defense in depth, plan
   * §"Closing the loop on the original MCP question"). */
  toolAllowlistAdditions?: readonly string[];
};
