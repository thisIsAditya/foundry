# Testing and evaluation delta

**Implements:** extends `docs/plan/implementation/11-testing-strategy.md` and `docs/plan/09-evaluation-and-observability.md` for the new capabilities in this folder. No new testing layer, tool, or CI stage is introduced — everything below runs inside the existing Vitest/Playwright/Maestro/eval-harness setup.

## 1. Unit tests (Vitest, `packages/*`)

| New/changed code | Test focus |
|---|---|
| `@foundry/scoring`'s `calculateScore` | Pure-function fixtures per dimension: zero-input → `insufficient_data`/0 contribution (not a neutral average); known-good fixture → expected overall + per-dimension breakdown; `topActions` ranking formula (`weight * (5 - raw)`) with ties resolved deterministically |
| `toAiJobSummary()` mapping function | Every `Sprint`/`SprintContract`/`AgentRun`/`ProgressLedgerEntry` combination maps to the correct product-facing `status` per the D20 table in `02-domain-model-delta.md` §2 |
| `PlanSectionAggregatorService` | Each of the 17 `BusinessModelSectionKey`s resolves against its documented backing table(s) in `03-database-schema-delta.md` §2 and returns the uniform card shape even when the backing table has zero rows (must return `status: 'draft'`/`'not_started'`-equivalent, never throw) |
| `runCofounderTurn`'s decision dispatcher | Each `CofounderDecisionSchema` variant routes to the correct existing service call; `ask_targeted_question` without a `whyNotResearchable` field is a schema-validation failure, not a silently accepted decision |
| Rules-based preference extractor | Fixture messages for each known preference key extract without a model call; ambiguous fixture correctly falls back to the structured-output path (mocked model) |
| Gate result → score input wiring | Regression test asserting Gate A/B/C evaluation results feed `evidence_strength`/`willingness_to_pay`/`execution_readiness` respectively, and that a failed gate no longer produces a `gate_blocked` error from any procedure other than `gate.evaluate` itself (decision D12) |

## 2. Integration tests (Vitest + real Postgres/Redis, existing GHA services)

- New migrations `0010`–`0015` run cleanly against a fresh `foundry_test` database in the same GHA job that already runs the existing 9 migrations; RLS suite (already exists per `docs/plan/implementation/11-testing-strategy.md`) is extended with fixtures for every new tenant-scoped table listed in `03-database-schema-delta.md` §4.
- `ScoringService.recalculate` is called at every documented call site (`08-scoring-service-spec.md` §5) — one integration test per call site asserting a new `plan_scores` row is written with the correct `pack_revision_id`.
- `ConversationService.send` end-to-end: founder message in → `ConversationMessage` persisted → co-founder reply persisted with correctly typed `blocks` → SSE event observed on the stream bus (reuses the existing stream-bus test harness already built for `sprint_progress`).
- `FounderTaskService.complete` rejects a completion attempt with no `completionEvidenceRef`, and accepts one referencing a real `Interview`/`WtpEvent`/`EvidenceItem` row.

## 3. API contract tests (`appRouter.createCaller`)

Every new procedure listed in `04-backend-services-and-trpc-delta.md` gets the same caller-based contract test already used for the existing routers (`apps/web/server/*.test.ts` pattern) — input validation, auth boundary (`workspaceProcedure`/`projectProcedure`), and idempotency-key replay returning the cached result rather than a duplicate write.

## 4. Playwright (web) additions to the existing critical-path suite

Extend the existing PR-blocking Playwright path (`docs/plan/implementation/11-testing-strategy.md`'s list) with: create project → initial draft + score visible within the test's timeout budget → open persistent co-founder panel, send a message, verify a typed `ConversationBlock` card renders (not raw text) → start the proposed baseline research job from the Work board → accept one section of the resulting draft revision without other sections changing status. This single flow covers Slices 1, 2, 3, 4, and 5's acceptance criteria in one pass, matching the existing "one flow, several assertions" pattern already used for the sprint-preview-to-accept path.

## 5. Maestro (mobile) additions

Extend the nightly/pre-release Maestro suite with: Home renders real score/summary data (not placeholder copy) → start an interview founder task → capture a voice note via `expo-audio` → submit and verify the task moves to `completed` only after server confirmation (mobile requirements §11) → verify an offline-captured observation shows `pending_sync` until reconnect.

## 6. Agent eval harness (`packages/agent-runtime/evals`)

Golden-pack fixtures (already exist for gate/critic behavior) gain: a fixture asserting `InitialDraftService` never marks a section `known`/`cited` when no founder input or citation actually supports it (structural enforcement already exists via the schema in `05-agent-runtime-and-cofounder-delta.md` §4, but the eval fixture catches a prompt regression that a schema check alone would miss); an adversarial fixture where the founder message tries to get the co-founder to claim unresearched information as fact, asserting the reply's `blocks` never contains a `cited_finding` without a real `citationIds` reference. These slot into the existing golden-pack/adversarial-fixture regression gate that already blocks merges of prompt/agent changes — no new gating mechanism.

## 7. What does not change

Coverage thresholds (80% line on `domain` + `policy`, now also applied to the new `@foundry/scoring` package since it is the same class of pure deterministic logic), the CI gating order (typecheck → lint → unit → integration → API contract → critical Playwright), the load-testing tool (k6/Artillery) and its trigger (pre-major-release only), and the mock-provider convention for ordinary CI runs (`ai/test`/`MockLanguageModelV2`) are all reused unchanged from `docs/plan/implementation/11-testing-strategy.md`.
