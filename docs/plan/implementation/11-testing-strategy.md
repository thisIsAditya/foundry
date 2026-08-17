# Testing strategy

Implements the tooling choices from `00-tech-stack-and-versions.md` §10 as a concrete, layered test plan, and connects to the quality gates already defined at the product level in `plan/09-evaluation-and-observability.md` (golden packs, adversarial fixtures, evaluator reports — that document owns *agent output quality*; this document owns *code correctness*).

## 1. Test pyramid by package

| Layer | Tool | Lives in | Runs in CI on |
|---|---|---|---|
| Unit (pure functions, domain logic, value objects) | Vitest | every `packages/*` | every PR |
| Component (web) | Vitest + `@testing-library/react` (jsdom) | `apps/web/components`, `packages/ui` | every PR |
| Component (mobile) | Jest + `@testing-library/react-native` | `apps/mobile/components`, `packages/ui-native` | every PR |
| Integration (DB + service classes) | Vitest against a real Postgres/Redis service container | `packages/db`, `packages/policy`, domain services | every PR |
| API contract (tRPC procedures end-to-end) | Vitest, calling the router directly with a test context | `apps/web/server` | every PR |
| Web E2E | Playwright | `apps/web/e2e` | every PR (critical paths), nightly (full suite) |
| Mobile E2E | Maestro | `apps/mobile/e2e` | nightly + before release builds |
| Agent/prompt evaluation | Custom eval harness (see `plan/09-evaluation-and-observability.md`) | `packages/agent-runtime/evals` | nightly + before a prompt/model-profile change ships |
| Load/performance | k6 (or Artillery) | `scripts/load/` | before major releases, not on every PR |

## 2. Unit tests

- Every exported function in `packages/domain` (status transition functions, value-object validators) has a unit test asserting both allowed and rejected transitions — this is the cheapest, highest-value test in the repo because `plan/03`'s lifecycle rules are exactly what these tests encode.
- Every `PolicyService`, `GateService`, `BudgetService`, `MoneyRulesService` method has unit tests using in-memory fakes for its repository dependencies (a typed fake object implementing the same function signatures as the real `postgres.js`-backed repository module in `packages/db`) — these are fast and do not need Postgres.
- Coverage target: 80% line coverage for `packages/domain` and `packages/policy` (the highest-risk-of-silent-bug packages), tracked via Vitest's built-in v8 coverage; no hard coverage gate for UI component packages (coverage there is a weaker signal than for domain logic).

## 3. Integration tests (real Postgres + Redis)

`docker-compose.test.yml` (or GitHub Actions service containers) spins up Postgres 17 (with `vector`/`pg_trgm`) and Redis/Valkey for the integration test job:

```yaml
# .github/workflows/ci.yml (excerpt)
services:
  postgres:
    image: postgres:17
    env: { POSTGRES_PASSWORD: test, POSTGRES_DB: foundry_test }
    ports: ['5432:5432']
  redis:
    image: valkey/valkey:8
    ports: ['6379:6379']
```

Test flow per suite: run `node-pg-migrate up` against the fresh test database (including the Better Auth migration, `06-database-schema.md` §3) → run tests → each test wraps its assertions in a transaction that is rolled back afterward (or truncates touched tables in an `afterEach`) so tests do not leak state into each other. This is deliberately **not** Testcontainers (an extra dependency with its own learning curve) — GitHub Actions service containers give the same guarantee (a real, disposable Postgres) with less code.

Integration tests exist for:

- Every repository function in `packages/db/src/repositories` (round-trip a domain entity through insert → read → matches, including that the row-to-domain Zod parse in §1 of `06-database-schema.md` actually succeeds against what Postgres returns — this is the test that stands in for an ORM's compile-time guarantee).
- Every domain service method that touches more than one table (e.g., `PackService.acceptRevision` updating both `pack_revisions` and `projects.current_pack_revision_id` atomically, inside one `sql.begin(...)` transaction).
- RLS policies (`09-authentication-and-security.md` §6) — a dedicated suite asserts that setting `app.current_workspace_ids` to workspace A's ID and querying for workspace B's project returns zero rows, even with a deliberately-wrong application-level filter removed, to prove the database-level backstop actually works.
- The `mcp-bridge` (`08-agent-runtime-implementation.md` §11) against a small local test MCP server fixture (a handful of `stdio` or `http` MCP tools spun up in-process for the test) — asserts that returned tools are always forced to `risk_class: 'side_effect'` regardless of what the fixture server claims, and that a server URL resolving to a private IP range is rejected before any connection is attempted.

## 4. API contract tests

Each tRPC procedure has at least one test that:

1. Builds a test `Context` with a fake authenticated actor and a real (integration-test) `db`.
2. Calls the procedure through the router directly (`appRouter.createCaller(ctx)`), not over HTTP — this is fast and still exercises the real middleware chain (auth, rate limit, idempotency, audit).
3. Asserts the success shape **and** at least one failure shape (unauthorized, stale revision, missing evidence, etc., per `05-api-and-backend-architecture.md` §9) so the error-vocabulary contract is verified, not just the happy path.

## 5. Web E2E (Playwright)

Sign-in in every automated test uses a seeded **test-role** account authenticated via the API-key path (`09-authentication-and-security.md` §2a), not live Google OAuth — a real third-party OAuth consent screen is not something CI can drive reliably or should be driving at all. A separate, small, manually-run checklist (not CI) covers the actual Google OAuth redirect before each release.

Critical paths covered on every PR (kept short deliberately, to keep CI fast and cheap):

- Sign in (test API key) → create workspace → create project → answer first clarification.
- Preview a sprint → approve plan → observe streaming activity (using a deterministic test provider that returns canned model output, see §8) → accept the resulting pack revision.
- Upload a document → see it appear in the Evidence Library with a `ready` status.
- Approve a pending `ApprovalRequest`.
- Add a user-level MCP server pointed at the test fixture server (§3) → confirm its tools appear in `mcpServer.list` → confirm a tool call from that server produces an `ApprovalRequest` rather than executing immediately.

Nightly full suite additionally covers artifact generation/export, budget-exceeded blocking, provider-fallback UI, and every screen in `02-web-frontend-architecture.md` §3 at least once. Playwright tests run against a fully deployed `dev`-equivalent stack in CI (via `docker-compose.yml` + a locally-run `apps/web`), never against production.

## 6. Mobile E2E (Maestro)

Maestro flow files (YAML) live in `apps/mobile/e2e/flows/*.yaml`, covering: sign-in, view Founder Desk, approve a pending approval, upload a photo of a document, receive and tap a push notification deep link. Maestro runs against an EAS-built preview binary, not the Expo Go dev client, so native modules (secure store, notifications, camera) are exercised for real.

## 7. Agent/prompt evaluation harness

This is distinct from unit/integration/E2E testing because agent output is non-deterministic. It lives in `packages/agent-runtime/evals/` and implements the mechanics behind `plan/09-evaluation-and-observability.md`'s golden packs and adversarial fixtures:

```
packages/agent-runtime/evals/
├── fixtures/
│   ├── golden-packs/          # Known-good project snapshots with expected gate outcomes
│   └── adversarial/            # Prompt-injection attempts, ambiguous evidence, conflicting sources
├── runners/
│   └── run-eval-suite.ts        # Runs each fixture through the real orchestrator + a pinned model, scores against a rubric
└── reports/                      # Generated eval reports (not committed; uploaded as a CI artifact)
```

- Uses **real** model providers (a cheap/fast model profile) against fixtures, not mocks — the whole point is to catch regressions in agent behavior, which a mocked model call cannot do.
- Runs nightly (not per-PR, because it costs real provider money and takes longer) and before any change to an `AgentDefinition`'s instructions, `output_schema`, or `model_profiles.ts`.
- A regression (a previously-passing golden pack now fails a gate it used to pass, or an adversarial fixture successfully triggers a `side_effect` tool call) fails the CI job and blocks merge of the triggering prompt/agent change.

## 8. Deterministic testing of AI SDK code

For unit/integration/E2E tests that touch `packages/agent-runtime` but are not themselves the eval harness (e.g., "does the orchestrator correctly enqueue a `render` job after synthesis"), use the AI SDK's mock provider (`ai/test` exports, e.g. a `MockLanguageModelV2`-style test double) to return fixed, deterministic responses — this keeps ordinary CI fast, free, and flake-free while the real-provider eval harness in §7 is reserved for actual quality assessment.

## 9. Load/performance testing

- k6 scripts simulate: N concurrent Founder Desk reads, M concurrent sprint starts, and a sustained SSE-connection count, against `staging`.
- Pass criteria: p95 API latency < 500ms for read procedures under expected launch-scale concurrency (tens of concurrent users, not thousands — re-baseline this number as real usage data arrives), and the `worker` service's queue depth returns to baseline within a bounded time after a burst of 50 simultaneous sprint starts.
- Run before any release that changes `apps/web`'s request path, ECS task sizing, or the database schema in a way that affects a hot query — not on every PR.

## 10. CI gate summary

A PR cannot merge unless, in this order: `typecheck` passes for every package → `lint` passes → unit tests pass → integration tests pass → API contract tests pass → the critical-path Playwright suite passes. Nightly/pre-release jobs (full E2E, agent evals, load tests) block *releases*, not every PR — this keeps day-to-day PR feedback fast (target: under 8 minutes total CI time) while still gating anything that reaches `production`.
