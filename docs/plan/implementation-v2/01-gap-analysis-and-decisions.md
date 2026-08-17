# Gap analysis and architecture decisions

**Implements:** `docs/02-product-requirements/01-shared-product-requirements.md` §"Current implementation versus target"; all of `02`–`05`.

## 1. Method

Three inputs were compared fact-for-fact: the product design in `docs/plan/00`–`13`, the build specification in `docs/plan/implementation/00`–`14`, and the actual code in `apps/*` and `packages/*`. The finding that matters most: **the plan and the code are already ahead of a "clean slate" in almost every technical dimension** (real Postgres schema, real tRPC routers, a real agent runtime with provider adapters, a real approval/policy/budget system). The gap is concentrated in five product-facing capabilities that were never designed in `docs/plan/` because the new product requirements introduce them:

1. A durable, multi-turn **co-founder conversation** (currently: no chat persistence at all — only a 15-second single-turn `answerClarification` and ephemeral SSE).
2. A **work board** unifying AI jobs and founder tasks with the job-state machine in the shared requirements §9 (currently: sprints have a narrower internal state machine, and there is no `FounderTask` entity at all).
3. A **7-dimension scorecard** (currently: a critic that outputs GO/PIVOT/KILL plus three hard gates — no numeric score, no dimension breakdown, no "top improvement actions").
4. A uniform **17-section business model view** independent of which relational table backs each section (currently: 5 narrow `pack_sections` types plus a dozen separate entity tables, several without a table or repository at all — see §3).
5. **Gates as inputs, not blockers** — the existing Gate A/B/C are well-built deterministic functions, but the product requirements explicitly reject them "blocking all useful progress."

Everything else — tenancy, auth, evidence/document pipeline, MoneyRules/calculators, providers/BYOK, MCP, artifacts, approvals — is reused unchanged or with small additive extensions.

## 2. Decisions (D11–D22, continuing the numbering in `docs/plan/11-decisions-and-open-questions.md`)

| ID | Decision |
|---|---|
| **D11** | The 17-section business model is a **read-model projection** over existing and new relational tables, not a new canonical JSON blob and not a rewrite of the 12+ existing section-backing tables. See `03-database-schema-delta.md` §2. |
| **D12** | Gate A/B/C evaluation (`packages/policy/src/gate-a.ts`/`gate-b.ts`/`gate-c.ts`) is reused verbatim as a pure function. Its result becomes one input to `PlanScore` (`08-scoring-service-spec.md`). The `gate_blocked` `AppError` code and the 403 behavior in `docs/plan/implementation/05-api-and-backend-architecture.md` are removed from every procedure except the explicit `gate.evaluate` read; no other procedure may reference gate state to reject a request. |
| **D13** | `Sprint` (table `sprints`, service `SprintService`, runtime `SprintRunner`) is the physical execution engine behind the product-facing **AI job**. It is extended, not replaced: new columns for fields the shared requirements §9.2 requires that are not queryable today (`objective`, `why_now`, `role_label`, `owner`, `parent_job_id`, `job_kind`). The Magentic worker-pool/critic mechanics inside a sprint are an implementation detail the founder never needs to see directly; the founder sees a job card. |
| **D14** | `PackRevision` (table `pack_revisions`) is the physical implementation behind the product-facing **plan revision**. No rename. The `pack` tRPC router is extended (not duplicated by a parallel `plan` router) with the section-level accept, "accept all safe," and explain-change procedures the web requirements §10 need. |
| **D15** | The **co-founder conversation** is a new aggregate with its own append-only message table and a versioned rolling-summary table, populated by extending the existing `orchestration/diagnose.ts` single-turn path into a persistent multi-turn control plane. This is new because nothing today persists chat; `docs/plan/01-system-architecture.md`'s "Conversation service" was previously a service with no backing table (see `docs/plan/implementation/06-database-schema.md`'s explicit omission), and the new requirements make durability mandatory (shared requirements §6.1, §9). |
| **D16** | The co-founder's long-term memory (rolling summary + founder preferences) is built **in-repo** against Postgres, not via a third-party memory SDK (Mem0, db0, Letta). The Vercel AI SDK 7.x team's own position is that the SDK is intentionally stateless and memory is DIY (`ai-sdk.dev/v7/cookbook/guides/custom-memory-tool`); a third-party memory service would put durable founder facts outside the domain layer, violating the "domain layer — not a chat transcript, not a model provider — remains the system of record" constraint in `docs/plan/README.md` and the India-data-residency posture in `docs/plan/08-security-privacy-and-governance.md`. See `05-agent-runtime-and-cofounder-delta.md` §2. |
| **D17** | `FounderTask` is a new entity/table, distinct from `ApprovalRequest`. Approvals gate a side-effecting draft action; founder tasks are broader founder-owned work (interview, pricing conversation, MVBP choice) that may produce evidence but has no payload to approve. A founder task may reference an `Interview`, `WtpEvent`, or `EvidenceItem` as its completion evidence. |
| **D18** | `PlanScore` is a new package `@foundry/scoring` (peer to `@foundry/policy`), append-only per pack revision like `agent_runs`/`gates`, versioned by rule version, recalculated synchronously at every mutation call site the shared requirements §7.2 lists (accept revision, evidence write, MoneyRules change, WTP record, metric observation). No async scoring queue is introduced — the calculation is pure/deterministic and cheap (`docs/plan/09-evaluation-and-observability.md`'s existing "deterministic evaluation" layer already assumes this shape). |
| **D19** | The **baseline research proposal** and **initial complete draft** (shared requirements §5, web requirements §3, backend requirements §4) reuse the existing `SprintContract`/`sprint.preview`/`sprint.approvePlan` flow rather than inventing a second job type. A research job is a `Sprint` with `job_kind = 'research'`; the founder's "review before starting" experience is the existing sprint-preview screen, extended with the fields backend requirements §5 requires (source categories, geography, date range, limitations). |
| **D20** | The job state machine (`sprints.status`) is extended additively to match the shared requirements §9.1 vocabulary (`proposed → queued → running → needs_founder → needs_approval → complete`, terminal `blocked | failed | canceled | expired`) while keeping the existing internal values (`draft`, `contracted`, `stalled`, `closed`) as implementation sub-states the read model maps into the product vocabulary. No two state machines are exposed to the client. |
| **D21** | Web adds `@dnd-kit/core` + `@dnd-kit/sortable` (latest 6.x) for the work-board Kanban view. Confirmed compatible with Next.js 16 App Router + React 19 (client-only `DndContext`, `"use client"` boundary) — same major/minor line already pinned in `docs/plan/implementation/00-tech-stack-and-versions.md`. No other new web dependency is required; `@foundry/ui` primitives (Badge, StatusPill, ProgressBar) are reused for job/task cards. |
| **D22** | Mobile adds `expo-audio` (bundled with Expo SDK 57, replacing the deprecated `expo-av`) for voice-note capture in interview/observation capture (mobile requirements §5). No other new native module is required — `expo-image-picker`, `expo-document-picker`, `expo-camera`, and `expo-secure-store` were already planned and are reused as-is. |

## 3. Reuse map — what already exists and is kept

This is the load-bearing table for "do not re-scaffold." Cross-referenced against the codebase inventory.

| Product requirement capability | Existing code that implements most of it | What changes |
|---|---|---|
| Tenancy, auth, workspace/project membership | `packages/db` migrations `0001`–`0002`, Better Auth in `apps/web/lib/auth.ts`, `PolicyService.can` | None. Reused as-is. |
| Evidence, sources, citations, interviews, quotes | `sources`, `source_snapshots`, `documents`, `content_blocks`, `interviews`, `quotes` tables; `DocumentService`, `InterviewService`; `packages/document-intelligence` | Extended: add `evidence_items` and `citations` tables + repositories (exist in `packages/domain` as Zod types already; no table/repo yet — see `03-database-schema-delta.md` §3). Research findings become a specialization of evidence items. |
| MoneyRules, market sizing, unit economics, sensitivity | `money_rules`, `market_models`, `business_models`, `unit_economics_models`, `offers` tables; `MoneyRulesService`; `packages/policy/src/calculators/*` | None structurally. Feeds the "Business economics" and "Willingness to pay" score dimensions. |
| Willingness-to-pay signals, Gate B | `wtp_events` table, `ExperimentService.recordWtp`, `gate-b.ts` | None structurally. Gate B result becomes a score input (D12). |
| MVBP scope, execution readiness | `mvbp-scope.ts`, `metric_definitions`/`metric_observations`, `gate-c.ts` | None structurally. Gate C result becomes a score input. |
| Provider/BYOK, model profiles, privacy modes | `provider_connections` table, `ProviderService`, `packages/agent-runtime/src/providers/*`, `profiles/model-profiles.ts` | None. This is exactly the "safe advanced controls" surface the web requirements §6 job-card advanced panel needs — expose it per-job instead of only per-workspace. |
| Draft-only external actions (email, payment-link, meeting, landing, invoice, legal checklist) | `packages/tools`'s draft tools (`emailDraftTool`, `paymentLinkDraftTool`, …), `approval_requests` table, `ApprovalService` | None. This already matches shared requirements §11 exactly (draft-only, approval-gated, `filing.submit` forbidden). |
| MCP bridge, tool risk classes, code-mode sandbox | `packages/agent-runtime/src/mcp/*`, `packages/policy/src/policy-service.ts` (`filterTools`) | None. |
| Sprint/agent execution engine, worker pool, critic, stall detection | `sprint-runner.ts`, `worker-pool.ts`, `critic-runtime.ts`, `stall-detector.ts` | Extended per D13/D19/D20 — becomes the engine behind "AI job," including research jobs. |
| SSE streaming, stream event vocabulary | `app/api/stream/[projectId]/route.ts`, `streaming/event-normalizer.ts`, `streaming/bus.ts` | Extended with new event types for conversation, job-state, and score-changed (see `04-backend-services-and-trpc-delta.md` §4). |
| Artifact generation, dependency graph, exports | `packages/artifacts`, `artifact_versions`, `ArtifactService` | None. |
| Single-turn orchestrator diagnose | `orchestration/diagnose.ts`, `instructions.ts` | Becomes the seed of the durable co-founder control plane (D15). |
| Journey phase stepper (web) | `lib/journey.ts`, `journey-stepper.tsx` | Removed from primary navigation; phase becomes contextual metadata inside a section's "why this section" text, not a gating stepper (see `06-web-frontend-ia-delta.md` §1). |

## 4. Net-new — nothing today implements these

| Capability | New package/table/service | Primary spec |
|---|---|---|
| Durable co-founder conversation | `conversation_messages`, `conversation_summaries` tables; extended `agent-runtime` orchestrator | `05-agent-runtime-and-cofounder-delta.md` |
| Founder preferences | `founder_preferences` table | `02-domain-model-delta.md` §2 |
| Founder tasks | `founder_tasks` table, `FounderTaskService`, `founderTask` router | `04-backend-services-and-trpc-delta.md` §2 |
| 7-dimension scorecard | `@foundry/scoring` package, `plan_scores` table | `08-scoring-service-spec.md` |
| 17-section uniform business-model view | `PlanSectionAggregatorService` (read model only, no new source-of-truth table beyond the two missing entity tables in §3) | `03-database-schema-delta.md` §2 |
| Work board aggregation (jobs + tasks + approvals in one view) | `WorkBoardService` read model | `04-backend-services-and-trpc-delta.md` §3 |
| Web: Overview / Co-founder / Business model / Work board / Research & evidence / Settings destinations | new/renamed routes | `06-web-frontend-ia-delta.md` |
| Mobile: Home / Co-founder tabs, wired dashboard | new/renamed routes | `07-mobile-frontend-ia-delta.md` |

## 5. New third-party dependencies (researched against the pinned stack, August 2026)

| Package | Version | Where | Why | Compatibility evidence |
|---|---|---|---|---|
| `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` | latest 6.x | `apps/web` | Work-board Kanban drag-and-drop (web requirements §6) | Actively used in current Next.js 16 + React 19 App Router projects; requires client-only `DndContext` boundary, which matches the existing `'use client'` boundary pattern already used for `useSprintStream`/Zustand in `docs/plan/implementation/02-web-frontend-architecture.md` |
| `expo-audio` | bundled with Expo SDK **57** (already pinned) | `apps/mobile` | Voice-note capture for interview/observation capture (mobile requirements §5) | Official replacement for `expo-av`, which is deprecated and removed from Expo Go as of SDK 55; hook-based API (`useAudioRecorder`), no new native config beyond the microphone permission entry already required for `expo-camera` |

No other new dependency is required. Explicitly **not** adopted: any hosted agent-memory SDK (D16), any second state-management library for the work board (Kanban state is server data via TanStack Query + optimistic `onDragEnd`, not a new client store), any second workflow/queue product (BullMQ queues from `docs/plan/implementation/07-caching-queues-and-streaming.md` are reused unchanged).

## 6. What is explicitly out of scope for this plan

Matches the "deliberate non-goals" in `docs/02-product-requirements/05-delivery-slices.md` §"Deliberate non-goals": no autonomous execution of drafts, no additional founder-facing agent personas, no unbounded research, no exposed chain-of-thought, no treating a complete document as validated. These are enforced by the same mechanisms already in place (`RiskClass`, `ApprovalService`, critic instant-fail rules) — no new enforcement mechanism is designed in this plan.
