# Agent runtime and co-founder delta

**Implements:** `docs/02-product-requirements/04-worker-backend-requirements.md` §3, §5, §6; `01-shared-product-requirements.md` §6.
**Package:** `@foundry/agent-runtime` (`packages/agent-runtime/src`). Extends the existing orchestrator/sprint/critic runtime; introduces no second agent framework.

## 1. The co-founder becomes a persistent control plane, not a 15-second diagnose call

Today, `orchestration/diagnose.ts` runs one `streamText` call per founder message with no persisted history and no decision beyond "answer or ask a clarifying question." Backend requirements §3 requires the co-founder to load full project state, decide among five actions, and durably record whichever one it picks. This is implemented as a new orchestration function that **replaces the call site**, not a parallel path:

```
orchestration/cofounder-turn.ts
  runCofounderTurn(projectId, founderMessageText): Promise<ConversationMessage>
```

Steps, matching backend requirements §3 exactly:

1. **Load context** — `ContextAssembler.assemble(projectId)` (§3 below): recent messages, rolling summary, confirmed preferences, current accepted pack revision, pending draft revision, relevant evidence/citations, open assumptions/founder tasks, active jobs/recent outputs, decisions, current score + reasons.
2. **Decide** — the model, given the assembled context and the founder's message, produces one structured decision via `generateObject`: `answer | start_research | propose_draft_revision | create_founder_task | create_job | ask_targeted_question`. This is a new Zod output schema, `CofounderDecisionSchema`, in `contracts/output-schema.ts`.
3. **Act** — a dispatcher maps each decision variant to an existing service call: `start_research`/`create_job` → `SprintService.preview` (never auto-approves spend, per backend requirements §7); `propose_draft_revision` → enqueues a synthesis-only sprint (`jobKind: 'analysis'`) that ends in `PackService`'s existing propose-revision path; `create_founder_task` → `FounderTaskService.create`; `ask_targeted_question` is only permitted when the decision explains, in the same structured output, why the missing information cannot be responsibly researched (backend requirements §3 step 4) — this is enforced by making the schema require a `whyNotResearchable` field whenever the variant is `ask_targeted_question`, so the model cannot skip the justification.
4. **Record and stream** — every decision produces a `ConversationMessage` (persisted via `conversation-messages` repository) whose `blocks` field is populated by whichever `ConversationBlock` variant matches the action taken; the reply streams over SSE exactly as today, reusing `streaming/event-normalizer.ts`.

The existing single-turn `diagnoseClarification()` is kept internally as the fallback path used only during initial-draft generation (§4) where a fast, low-risk single turn is genuinely sufficient — it is not exposed to `conversation.send` directly.

## 2. Durable memory is built in-repo, not via a memory SaaS (decision D16)

Two mechanisms, both plain TypeScript against Postgres, no new infrastructure:

**Rolling summary (`orchestration/summarize-conversation.ts`).** Triggered whenever `conversation_messages` for a project exceeds a token budget threshold since the last `ConversationSummary` (mirrors the "20 messages then compress" pattern documented in the AI SDK's own `prepareStep` guidance). Uses the MapReduce pattern: chunk uncovered messages, `generateText` with `Output.object()` per chunk into a short structured summary, then merge chunk summaries into one `ConversationSummary` row. Model profile: `extractor` (already defined in `profiles/model-profiles.ts`, cheapest tier with structured-output capability) — this is a cost-bounded, deterministic-shape operation, not a creative one, so it does not need the `coordinator` profile.

**Preference extraction (`orchestration/extract-preferences.ts`).** Rules-based first pass (regex/keyword matchers against a fixed set of preference keys: geography, budget, risk tolerance, communication style, working style, availability — the examples in backend requirements §2), consistent with the "60–70% of extraction handled by rules, zero extra LLM calls" pattern found in current AI SDK memory-middleware practice. Only ambiguous cases fall back to a structured-output model call. Extracted preferences are written as `unconfirmed` `FounderPreference` rows; they become `founderConfirmed = true` only when the founder explicitly confirms (via `conversation.confirmPreference`) or when the co-founder references the preference back and the founder does not correct it within the same turn — either path satisfies shared requirements §2.5's "must not upgrade an assumption to a fact."

Both mechanisms run as plain function calls inside `runCofounderTurn`'s post-step, not as a separate worker queue — they are cheap enough (single cheap-model call, bounded input) to run inline without breaching the existing per-request latency expectations, and this keeps the "domain layer is system of record" property trivially true (the summary and preferences are ordinary rows written by ordinary service code, not an opaque vector-store side-channel).

## 3. Context assembly changes

`contracts/pack-snapshot.ts`'s `PackSnapshot` (today: pack, phase, interviews, quotes, beachheads, dmus, money, market, unit econ, WTP, clarifications) is extended into `ContextAssembler.assemble()`'s output, adding: latest `ConversationSummary`, last N `ConversationMessage`s (N bounded by the workspace's context-window policy, per backend requirements §6), confirmed `FounderPreference`s relevant to the current objective, current `PlanScore` + reasons, open `FounderTask`s, and active/recent `AiJobSummary`s. The **selection rule** is unchanged in spirit from `docs/plan/04-document-intelligence.md`'s context assembly packet: prioritize accepted over draft, avoid duplicate/contradictory facts, record which context items were used (a `contextItemsUsed: ConversationReference[]` field persisted on the `ConversationMessage` for reproducibility — this satisfies backend requirements §6's "record which context items were used").

This is an extension of the existing `pack-snapshot.ts`, not a second context builder — `SprintRunner` and `runCofounderTurn` both call the same `ContextAssembler`.

## 4. Initial draft generation (`orchestration/generate-initial-draft.ts`)

New function, `InitialDraftService.generate(projectId)`, called synchronously from `project.create` per `04-backend-services-and-trpc-delta.md` §7. Implements backend requirements §4 "Initial generation":

1. For each of the 17 `BusinessModelSectionKey`s, produce one of: founder input (if already supplied at project creation), cited research (none possible yet — no research has run), derived calculation (none possible yet), **explicit assumption**, **open question**, or **not applicable with a reason**. In practice, at t=0 almost every section is an assumption or open question — this is intentional and matches shared requirements §5's "intentionally low-confidence" framing. The generation prompt (`instructions.ts` gains `INITIAL_DRAFT_INSTRUCTIONS`) is explicitly constrained: **must not invent specific customers, prices, quotes, market sizes, or payment signals** (backend requirements §4) — enforced structurally by having the output schema (`InitialDraftSchema`) only allow `assumption` or `open_question` provenance for any section that is not directly derived from the founder's literal input text.
2. Calls `ScoringService.calculate` on the resulting draft revision (`08-scoring-service-spec.md`).
3. Identifies top assumptions/score gaps from the score's `reasons`/`topActions` — no separate ranking logic is needed, the scoring service already produces this.
4. Calls `SprintService.preview` with a canned baseline-research `SprintContract` template (`research-templates.ts`, new file: default objective "baseline market and competitor research," source categories = all four from backend requirements §10, geography = the founder-supplied geography or "India" default, time/spend budget = workspace default ceiling) — this produces a `proposed` job the founder reviews before starting, never auto-started.
5. Only creates a `FounderTask` if the draft step above could not respond credibly without one (rare at t=0; more common when the idea text is extremely sparse) — reuses `FounderTaskService.create`.
6. Writes a `ConversationMessage` from `co_founder` summarizing what was generated, matching the example message in mobile requirements §4.

Runs on the `coordinator` model profile, single model call plus the scoring calculation (no fan-out, no worker pool) — it must complete inside the "five minutes to value" budget in shared requirements §5, and typically inside seconds given no research has happened yet.

## 5. Research runtime changes

`agents/research-crew.ts` already performs web search/fetch and citation extraction. Backend requirements §5 additionally requires academic-paper discovery and public market/report discovery as first-class source categories. Add two tool definitions to `packages/tools` (`academicSearchTool`, `marketReportSearchTool`), following the exact same shape as the existing `webSearchTool`/`webFetchTool` (Zod input/output, risk class `read`, `tool_definitions` row, recorded as `tool_calls`) — no new tool framework. A completed research job's synthesis step now writes `ResearchFinding` rows (not just `EvidenceItem`s directly) via a new `ResearchFindingService`, and the sprint's `proposePackRevision` step links findings to the sections they affect using `affectedSectionKeys`, satisfying backend requirements §5 "Research output."

Conflicting-source and stale-source detection (`conflictsWithFindingIds`, `staleAt` on `ResearchFinding`) reuse the existing groundedness/freshness checks referenced in `docs/plan/04-document-intelligence.md` §9 — no new detection algorithm, just a new place to record the result.

## 6. Critic and gates become score inputs (decision D12)

`critique/critic-runtime.ts`'s GO/PIVOT/KILL output and `packages/policy`'s `gate-a`/`gate-b`/`gate-c` results are unchanged as pure functions. What changes is the caller: `ScoringService.calculate` (not `SprintRunner`) is the only place that reads gate results for scoring purposes, and `SprintRunner`'s gate evaluation call is kept only for the founder-visible `gates_decisions_artifacts` section and the `decision.record` GO/PIVOT/KILL flow — it no longer causes the sprint or any unrelated procedure to fail closed. The critic's instant-fail rules (e.g. "simulated interviews cannot pass Gate A") still apply to whether Gate A *itself* reports `passed`, they simply no longer stop other work.

## 7. Model profiles — no new profile required

The existing profile set (`coordinator`, `researchWorker`, `extractor`, `critic`, `financialAnalyst`, `visionDocument`, `codePlanner`, `local`) already covers every new capability: co-founder turns and initial draft use `coordinator`; summarization/preference extraction use `extractor`; academic/market research tools run under `researchWorker`. No change to `profiles/model-profiles.ts`'s schema, only to which agent functions request which profile.
