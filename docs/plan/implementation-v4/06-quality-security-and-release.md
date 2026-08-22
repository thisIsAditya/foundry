# Quality, security, and release

**Status:** proposed implementation plan  
**Implements:** all v4 releases and the legacy cleanup gate  
**Depends on:** [v4 overview](00-README.md)

## 1. Engineering practices adopted for v4

This plan was checked against current primary guidance. These sources inform
implementation practice; the product requirements remain the authority for
product behavior.

| Practice | v4 application | Source |
| --- | --- | --- |
| Server-first App Router rendering, production build checks, bundle analysis, streaming-aware deployment | Default route content to server components; isolate interactive client code; test `next build` and production startup before release. | [Next.js production checklist](https://nextjs.org/docs/app/guides/production-checklist) |
| Browser journeys against production-like app | Add Playwright to the existing `test:e2e` script; run core journeys against built web/worker services in CI. | [Next.js Playwright guide](https://nextjs.org/docs/app/guides/testing/playwright) |
| Diagnostics and accessible browser testing | Retain traces/screenshots on failure or retry; run focused axe scans plus manual keyboard/screen-reader review. | [Playwright test configuration](https://playwright.dev/docs/test-use-options), [accessibility testing](https://playwright.dev/docs/accessibility-testing) |
| RLS as a database backstop | Enable and force RLS on every new tenant table; test `USING` and `WITH CHECK` paths; keep runtime and migration roles separate. | [PostgreSQL row security policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html), [CREATE POLICY](https://www.postgresql.org/docs/current/sql-createpolicy.html) |
| Least privilege and human approval for AI tools | Gateway tools are minimal, actor-scoped, downstream-authorized, and draft-only; founder approval lives outside the runtime. | [OWASP Top 10 for LLM Applications 2025](https://owasp.org/www-project-top-10-for-large-language-model-applications/assets/PDF/OWASP-Top-10-for-LLMs-v2025.pdf) |
| Privacy-first GenAI telemetry | Record operation/model/tokens/duration by default; do not capture prompts, responses, or tool arguments without explicit, protected opt-in. | [OpenTelemetry GenAI observability](https://opentelemetry.io/blog/2026/genai-observability/) |

## 2. Code-quality rules

1. **Separate pure rules from I/O.** Journey transition, readiness, provenance,
   staleness, and proposal-selection logic lives in domain functions with
   table-driven tests. Services own transactions and repositories own SQL.
2. **Make invalid states unrepresentable where practical.** Use discriminated
   schemas/status types and exhaustive matching rather than stringly typed
   stage, proposal, or runtime behavior.
3. **Validate at every trust boundary.** Parse web input, worker payloads,
   model output, capability input/output, external sources, and persisted JSON
   before use. Validate semantic authorization after shape validation.
4. **Use explicit version and idempotency control.** Mutations that accept or
   replace material content carry `expectedRevision` and an idempotency key.
5. **Keep public interfaces narrow.** A router calls a service; a runtime sees
   a context packet and capability manifest; a capability exposes one
   purpose-built action. Do not export repositories or generic admin helpers to
   model-facing code.
6. **Prefer additive compatibility to broad rewrites.** Migrate source data,
   dual-read briefly, compare outputs, then remove the old reader. Never dual
   write two meanings of current journey state.
7. **Delete dead architecture completely at the cutover.** Remove its tests,
   prompts, configs, stream events, limits, dependency declarations, docs, and
   UI—not only the top-level class.
8. **Document meaningful decisions near the change.** Migration rationale,
   feature-flag criteria, data disposition, and public contract changes need a
   test and an ADR-equivalent note in the pull request or plan, not a comment
   that repeats code.

## 3. Test strategy

The repository already uses Vitest, Turbo, database test harnesses, a memory
queue/stream test context, and CI services for PostgreSQL/pgvector and Valkey.
v4 adds browser journeys and expands integration coverage.

| Layer | Scope | Minimum v4 tests |
| --- | --- | --- |
| Domain unit | Pure domain package | Stage transitions, status/provenance validity, staleness, readiness explanations, proposal selection. |
| Repository/RLS | PostgreSQL harness | Policies, tenant isolation, expected revision, record version immutability, migration conversion fixtures. |
| Service/command | Web server test harness | Authorization, idempotency, transactional activity/outbox, duplicate worker retries, cancellation recovery. |
| Runtime/capability | Agent-runtime tests with fake provider/gateway | Context redaction, schema rejection, capability scope, operation limits, safe event mapping. |
| Router/API | tRPC tests | Public input/error contracts and query model authorization. |
| Browser E2E | Playwright against a production-like build | Founder journeys, deep links, focus/keyboard behavior, narrow layouts, error/retry flows. |
| Harness POC | Separate sidecar test harness | Plugin/environment/network isolation, process-kill safety, no descendant sessions, gateway authorization. |

### 3.1 Browser test setup

Add Playwright deliberately; no browser suite exists today.

- Configure a production-like `webServer` setup for `next build` + `next start`
  and the required worker/dependencies. Use an existing local server only
  outside CI.
- Keep tests deterministic with seeded workspace/project fixtures and a fake
  direct runtime by default.
- Store a trace on first retry and screenshots on failure. Do not upload
  founder content or production secrets as test artifacts.
- Run WCAG A/AA axe checks on primary routes, then manually verify keyboard
  order, focus movement, dialogs, screen-reader labels, reduced motion, and
  mobile touch targets.
- Add a small visual/ARIA snapshot set only for stable primitives such as
  `ProposalReview` and `JourneyStageStrip`; do not use snapshots as the sole
  behavior test.

The cleanup release must pass:

```text
idea → pause → return → step → evidence/decision
  → proposal review → accepted version → validation experiment
```

It must additionally prove that unmet Gate A evidence lowers a readiness
explanation without blocking a founder from documenting, deferring, revisiting,
or selecting another appropriate step.

## 4. Security and privacy gates

### Application data

- Use current workspace/venture authorization in every service and enforce it
  again through RLS.
- Apply `ENABLE ROW LEVEL SECURITY`, `FORCE ROW LEVEL SECURITY`, least grants,
  indexed tenancy predicates, and `WITH CHECK` update/insert policies to every
  new tenant table.
- Enter a transaction before applying `SET LOCAL`-style tenant context; never
  use session-level context on pooled runtime connections.
- Store immutable audit/record versions separately from mutable view
  projections.
- Treat uploads, documents, citations, web pages, and extracted text as
  untrusted data, never as instructions or authorization.

### Co-founder and external capabilities

- Give each capability the smallest purpose, scope, and credential possible.
- Reauthorize in the downstream application service; do not trust model tool
  selection or a gateway token alone.
- Keep material and all external effects draft-only until a separately approved
  execution design exists.
- Bind usage, budgets, and audit to venture operation and initiating actor, not
  an agent name.
- Keep raw user MCP out of the co-founder and Harness paths.
- Make secret exposure, cross-tenant context, unapproved tool calls, raw model
  content in logs, and accepted mutation on cancellation release-blocking
  defects.

## 5. Observability and operations

Use the existing `apps/web/instrumentation.ts`, worker initialization,
structured logger, `AppError`, and `domain_events` foundations. Refocus them on
founder outcomes and bounded operations.

### Required operation telemetry

Record safe metadata:

- correlation, workspace, venture, and operation IDs;
- runtime/provider/model version;
- interaction type and capability name/risk;
- duration, queue latency, retry/cancel/timeout state;
- input/output token totals and attributable cost;
- schema-validation outcome and safe error category; and
- record/proposal/step IDs rather than their raw text.

Use a stable operation root span with child model/capability spans. Keep GenAI
content capture off by default. If a future incident process needs content,
require explicit tenant-scoped approval, redaction before export, strict
retention, and separate access control.

### Product activity

`domain_events` is an audit substrate, not the activity feed. Project only
founder-readable events such as `evidence_added`, `proposal_ready`,
`record_version_accepted`, `journey_step_completed`, and
`cofounder_operation_failed`. Do not turn internal tool calls, token deltas,
worker retries, or hidden reasoning into product UI.

## 6. Release engineering

### Before each merge

- run focused unit/integration tests for changed contracts;
- run formatting, lint, typecheck, and relevant Turbo tests;
- inspect migration SQL, RLS policies, indexes, and query plans for changed
  tenant tables;
- validate feature flags have an owner, default, removal condition, and
  rollback behavior;
- update migration fixtures and public API read-model tests; and
- review any runtime/capability change as both security and product-control
  work.

### Before each environment promotion

1. Apply additive migration and verify schema/RLS health.
2. Run backfill in resumable batches and compare expected counts/projections.
3. Deploy readers before writers when introducing a new format.
4. Enable the feature for a controlled cohort with mismatch/error/cost
   monitoring.
5. Expand only after migration, journey, proposal, and tenant-isolation
   assertions remain healthy.
6. Delete old readers before schema cleanup; never drop data while a rollback
   could restore an old reader.

### Cleanup release gate

Do not remove the custom runtime, sprint queue, job APIs, score-first UI, or
legacy tables until all active code paths satisfy:

- no production import reaches `FoundryAgent`, specialist skills, worker pool,
  critic, sprint runner, or agent-definition runtime;
- no founder page, route, prompt, event, or environment variable exposes
  sprint, worker count, specialist, role, or agent trace behavior;
- migrated data has a counted disposition and fixture coverage;
- the new RLS, command, proposal, cancellation, and browser journey suites
  pass; and
- deleting the old path cannot mutate an accepted record or impair an active
  founder workflow.

DeepSeek Harness evaluation is a separate release gate. It cannot block the
core v4 journey release or bypass any cleanup requirement.
