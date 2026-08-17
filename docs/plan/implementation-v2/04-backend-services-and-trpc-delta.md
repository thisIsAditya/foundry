# Backend services and tRPC delta

**Implements:** `docs/02-product-requirements/04-worker-backend-requirements.md` §1, §3, §13; `02-web-requirements.md` (screen-to-API needs); `03-mobile-requirements.md`.
**Package:** `apps/web/server` (routers + services), consistent with the existing procedure chain (`publicProcedure` → `protectedProcedure` → `workspaceProcedure` → `projectProcedure`) and `ServiceContainer` pattern in `docs/plan/implementation/05-api-and-backend-architecture.md`.

## 1. New/changed router: `pack.ts` (business model + plan revisions)

Existing procedures (`export`, `getSection`, `getDiff`, `upsertSection`, `upsertBeachhead`, `upsertDmu`, `addFounderAssertion`, `acceptRevision`, `rejectRevision`) are kept. Add:

| Procedure | Behavior |
|---|---|
| `listBusinessModelSections(projectId)` | Calls `PlanSectionAggregatorService.listAll` — returns all 17 section cards (web requirements §5, mobile requirements §8) |
| `getBusinessModelSection(projectId, key)` | Single-section deep view (evidence panel, assumption panel, revision history, diff) |
| `listRevisions(projectId)` | Exposes the already-implemented `PackService.listRevisions`, which exists in the service but was never routed — fixes an unwired-code gap identified in the audit |
| `acceptSection(projectId, revisionId, sectionKey, expectedRevision)` | Section-granular accept, extending the existing whole-revision `acceptRevision`; shared requirements §8 "accept individual sections" |
| `acceptAllSafeSections(projectId, revisionId, expectedRevision)` | Accepts every section whose diff does not touch canonical price/unit/currency/cost logic or an already-accepted MoneyRules row; anything unsafe is left pending, matching web requirements §10's warning requirement |
| `explainChange(projectId, revisionId, sectionKey)` | Returns a co-founder-authored explanation of a diff, generated once and cached on the `ConversationMessage` it originates from — not a live model call per click |

`acceptSection`/`acceptAllSafeSections` reuse the existing `expectedRevision` optimistic-concurrency pattern already enforced by every versioned-aggregate mutation (`docs/plan/implementation/05-api-and-backend-architecture.md` §"Every mutation has idempotencyKey").

## 2. New router: `conversation.ts`

| Procedure | Behavior |
|---|---|
| `list(projectId, cursor?)` | Paginated durable history from `conversation_messages`, newest-first with `cursor` for infinite scroll (both web persistent panel and mobile Co-founder tab) |
| `send(projectId, text, idempotencyKey)` | Persists the founder message, invokes the co-founder control plane (`05-agent-runtime-and-cofounder-delta.md`), persists the reply as a `ConversationMessage`, streams the reply over the existing SSE channel as `text_delta`/`message_completed` |
| `getSummary(projectId)` | Latest `ConversationSummary`, for debugging/founder-visible "what the co-founder remembers" if ever surfaced |
| `listPreferences(projectId)` | Founder preferences relevant to the project, for the settings surface and for the co-founder to reference back accurately (shared requirements §6.1) |
| `confirmPreference(projectId, preferenceId)` / `correctPreference(...)` | Founder confirms or corrects an inferred preference |

`send` is the natural evolution of the existing `project.answerClarification` single-turn procedure — `answerClarification` is deprecated in the same change (see `09-migration-sequencing-and-cleanup.md` §3) and its call sites in `apps/web/app/(app)/p/[projectId]/project-desk.tsx` are re-pointed at `conversation.send`.

## 3. New router: `job.ts` (wraps `sprint.ts`)

`sprint.ts`'s existing procedures (`listByProject`, `preview`, `approvePlan`, `getContract`, `getActivity`, `pause`, `resume`, `stop`) are the execution primitives and are kept unchanged — `apps/worker`'s `SprintRunner` does not change its contract. `job.ts` is the product-facing read model on top, per decision D13:

| Procedure | Behavior |
|---|---|
| `list(projectId, view)` | `view` is one of the web requirements §6 board views (`kanban`, `mine`, `timeline`, `cost`, `completed`, `blocked`) or the mobile requirements §6 lists (`needs_me`, `running`, `waiting_for_research`, `needs_review`, `completed`, `blocked`); returns `AiJobSummary[]` (§4 below) |
| `get(jobId)` | Single job card, delegates to `sprint.getContract` + `sprint.getActivity` and reshapes into `AiJobSummary` |
| `updateSettings(jobId, patch, expectedVersion)` | The "advanced settings" panel in web requirements §6 — provider/model, reasoning effort, context-window setting, tool allowlist, max spend, max duration, worker count. Delegates to `PolicyService.can` + the existing `provider`/budget services; **never** bypasses `filterTools`, approval rules, or budget ceilings, per backend requirements §7 |
| `retry(jobId)` | Thin wrapper that re-enqueues via the existing `SprintService.control('resume')` path with a fresh attempt counter |

No new queue, no new worker process. `job.ts` never talks to BullMQ directly — it only calls `SprintService`, which already owns enqueue.

## 4. New read model: `AiJobSummary` (`packages/api-contracts/src/read-models/ai-job-summary.ts`)

```ts
interface AiJobSummary {
  id: string;
  objective: string;
  whyNow?: string;
  roleLabel?: string;
  owner: 'co_founder' | 'ai' | 'founder';
  status: ProductJobStatus; // the D20-mapped vocabulary
  jobKind: 'research' | 'draft' | 'analysis' | 'clarification' | 'synthesis';
  sourceAndScope: { sectionKeys: string[]; sourcePolicy?: unknown };
  estimatedCost?: CostEstimate;
  actualCost?: CostEstimate;
  citationCount: number;
  changedSectionKeys: string[];
  founderActionRequired?: string;
  progressPercent: number;
}
```

Computed server-side by joining `Sprint` + `SprintContract` + latest `AgentRun` + `ProgressLedgerEntry` count — this is a pure mapping function (`toAiJobSummary()`), unit-tested in isolation (see `10-testing-and-eval-delta.md` §1), not a new database view.

## 5. New router: `founderTask.ts`

| Procedure | Behavior |
|---|---|
| `list(projectId, status?)` | Backs the work board's founder-task lane and the mobile "Needs me" list |
| `get(founderTaskId)` | Full task detail (web requirements §7, mobile requirements §7 fields) |
| `requestHelp(founderTaskId)` | Invokes the co-founder to produce a `ConversationMessage` of kind `draft_action` (script/template/help), links it via `FounderTask.preparation.helpMessageId` — this is the "Help me" action, and it must not create a new agent persona (shared requirements §6.2) |
| `complete(founderTaskId, evidenceRef, idempotencyKey)` | Requires a `ConversationReference` to real evidence (`Interview`, `WtpEvent`, or `EvidenceItem`) — cannot be marked complete with no evidence, per shared requirements §9.3 |
| `defer(founderTaskId, reason)` / `skip(founderTaskId, reason)` | Reason is required, matching web requirements §7's explicit actions |

`FounderTaskService` (`apps/web/server/services/founder-task-service.ts`) is new. It is the **only** service allowed to write `founder_tasks`; it is also the target the co-founder control plane calls when it decides "create a founder task" (backend requirements §3 step 2).

## 6. New router: `score.ts`

| Procedure | Behavior |
|---|---|
| `getCurrent(projectId)` | Latest `PlanScore` for the project's current accepted pack revision |
| `getForRevision(revisionId)` | Score attached to a specific (possibly draft) revision, for the plan-revision review screen's before/after |
| `getHistory(projectId, limit?)` | Score trend across revisions (web requirements §9, mobile requirements §3) |
| `explain(projectId, dimension)` | Returns the `ScoreReason[]` for one dimension — the "why a score changed" requirement |

Backed entirely by `@foundry/scoring` (`08-scoring-service-spec.md`); the router has no scoring logic of its own, only auth + read.

## 7. Changed router: `project.ts`

| Change | Reason |
|---|---|
| `getDeskSummary` renamed in the read model to `getOverviewSummary` (procedure name kept as `getDeskSummary` for one deprecation window per `09-migration-sequencing-and-cleanup.md`, then removed) | Web requirements §2 "Overview screen" — the shape gains: overall score + dimension chips, top assumptions, proposed baseline research job, running AI work, waiting founder tasks, revision pending review, provider/privacy mode, cost. Most of these fields are already computable from existing services (`sprint.getActivity`, `approval.list`, `provider.listConnections`, budget ledger); the new ones are score (`score.getCurrent`) and founder tasks (`founderTask.list`) |
| `create` gains a synchronous post-step | After creating the project and initial `pack_revisions` row, call the new `InitialDraftService.generate(projectId)` (see `05-agent-runtime-and-cofounder-delta.md` §4) before returning, so the response already contains a complete low-confidence draft, its score, and a proposed baseline research job — matching web requirements §3 exactly. This runs inline (budget-capped, single-model, no fan-out) rather than as a queued job, because web requirements §3 and the "five minute" target in shared requirements §5 require it to be ready essentially immediately; if it cannot complete within a short timeout, it degrades to "draft in progress" and completes asynchronously with a `plan_revision_ready` notification, reusing the existing notification worker |
| `answerClarification` | Deprecated; superseded by `conversation.send` (§2 above) |

## 8. Error vocabulary changes

Remove `gate_blocked` from the procedures it currently guards (decision D12); keep it only as a possible field inside `gate.evaluate`'s response payload (not thrown). No other error code changes — `unauthorized`, `not_found`, `stale_revision`, `invalid_input`, `missing_evidence`, `approval_required`, `budget_exceeded`, `rate_limited`, `provider_unavailable`, `capability_unsupported`, `artifact_render_failed`, `workflow_failed`, `policy_forbidden` are all reused unchanged from `docs/plan/implementation/05-api-and-backend-architecture.md`.

## 9. Stream events — additions to `StreamEventSchema`

`@foundry/api-contracts`'s existing union (`message_started`, `text_delta`, `question_ready`, tool lifecycle events, `evidence_found`, `proposal_ready`, `approval_required`, `sprint_progress`, `artifact_ready`, `warning`, `blocked`, `message_completed`) gains:

| New event | Payload | Emitted by |
|---|---|---|
| `job_state_changed` | `{ jobId, fromStatus, toStatus }` | `SprintService.control`, `SprintRunner` stage transitions |
| `founder_task_created` | `{ founderTaskId, title }` | `FounderTaskService.create` (called by the co-founder control plane) |
| `score_changed` | `{ projectId, revisionId, overall, dimensions, deltaFromPrevious }` | `ScoringService.recalculate` |
| `conversation_message_appended` | `{ messageId, actor }` | `ConversationService.send` |

These reuse the existing normalizer (`streaming/event-normalizer.ts`) and bus (`streaming/bus.ts`) unchanged — only the schema union and the emit call sites grow.

## 10. Idempotency and rate limiting

Unchanged. Every new mutation (`conversation.send`, `founderTask.complete`, `job.retry`, `pack.acceptSection`) takes an `idempotencyKey` and goes through the existing `withIdempotency()` helper in `server/coordination.ts` — no second idempotency mechanism is introduced.
