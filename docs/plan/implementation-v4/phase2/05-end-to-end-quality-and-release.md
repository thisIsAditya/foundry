# End-to-end quality and release

**Status:** proposed Phase 2 plan  
**Implements:** P2.0, P2.5, and release gates for P2.3/P2.4  
**Depends on:** all other Phase 2 plans

## 1. Objective

Make the founder journey releasable through deterministic automated proof, not
manual confidence in individual components. The required product path is:

```text
idea → pause → return → step → evidence / decision
     → proposal review → accepted version → validation experiment
```

That path must work with the direct runtime before legacy deletion and must
continue to work whether the Harness POC is accepted or rejected.

Web founder GA does not wait for native-mobile parity or Harness promotion. The
Harness POC remains a separately gated runtime decision; the native companion
starts only after the same web contracts and release proof are stable.

## 2. Test architecture

### 2.1 Browser suite

Add Playwright and `@axe-core/playwright` to the web test toolchain. The
browser suite must:

- run the built Next.js application through a production-like `next build` +
  `next start` web server;
- use PostgreSQL and Valkey service dependencies;
- seed deterministic workspace, project, membership, journey, evidence,
  proposal, and operation fixtures through a test-only application/database
  helper—not public production routes;
- select a fake/direct deterministic runtime by test configuration;
- create an authenticated browser session without exposing a production secret;
- use an isolated database/schema or transactional reset for each worker;
- retain a trace on first retry and screenshots only on failure; and
- never upload founder content, raw prompt data, or production credentials in
  test artifacts.

Add an `apps/web` `test:e2e` command and keep the root Turbo `test:e2e` task
dependent on the built packages it exercises. Use an explicit port and clean
teardown so local developer servers are not accidentally reused in CI.

### 2.2 Test levels

| Level | Required focus |
| --- | --- |
| Domain | journey transitions, record/provenance invariants, staleness, readiness, proposal outcomes, operation states. |
| Repository/RLS | tenant visibility/mutation, direct ownership predicates, version immutability, data backfill, cleanup migration. |
| Service/command | authorization, idempotency, transaction boundaries, cancellation, retry, timeout, proposal/record separation. |
| Runtime/capability | bounded context, schema failure, interaction types, allowed capabilities, event reduction, secret redaction. |
| Worker | claim/lease behavior, duplicate delivery, process shutdown, operation retry/recovery, no sprint worker after cutover. |
| Browser | founder outcomes, keyboard/focus, responsive layouts, reconnect and error recovery. |
| Harness | process/plugin/environment/session/tool/network isolation in a separately built adapter image. |

## 3. Mandatory browser journeys

### 3.1 Idea to honest overview

1. A founder creates a venture from a short idea.
2. The app displays an Idea-stage record skeleton, founder input, explicit
   empty sections, and one recommended step.
3. The app does not show a complete 17-section plan, score-as-validation,
   research sprint, worker count, or specialist identity.
4. The founder can open Journey, Model, Evidence, Decisions, and Co-founder
   routes directly.

### 3.2 Pause and return

1. The founder starts or defers a step with a reason.
2. The founder leaves and returns in a fresh session.
3. Overview explains what changed, current stage/objective, uncertainty, and
   one appropriate continuation without requiring chat history.

### 3.3 Evidence, decision, and staleness

1. The founder captures an observation or interview note quickly.
2. The item is marked as founder input/unverified rather than proof.
3. The founder changes a customer, problem, or offer through a proposal.
4. The application preserves older evidence and marks affected record items
   stale with an explanation.

### 3.4 Proposal review and versioning

1. A direct runtime creates a material proposal.
2. The founder sees current/proposed content, rationale, evidence,
   uncertainty, source, and affected sections.
3. The founder accepts one change, modifies another, and keeps another
   current.
4. Only accepted/modified changes create the next immutable record version.
5. Reload confirms no unrelated change was silently accepted.

### 3.5 Co-founder operation recovery

1. The founder submits a co-founder turn with an unsent draft.
2. The operation shows safe queued/running status and can be canceled.
3. A cancel/provider failure/reconnect preserves the draft and leaves accepted
   record state unchanged.
4. Retry with the same idempotency key does not create duplicate messages,
   proposals, or evidence.
5. The next successful turn shows a structured interaction type and one clear
   next action.

### 3.6 Validation experiment

1. The founder creates or reviews one validation experiment with explicit
   success criteria.
2. Readiness may be weak or a Gate A signal may be unmet.
3. The founder can still document, defer, revisit, or choose an appropriate
   next step; no score or gate locks the journey.

### 3.7 Narrow viewport and accessibility

At 375px, 768px, 1024px, and 1440px:

- no horizontal scroll appears;
- the five-item mobile navigation remains usable;
- evidence capture, a co-founder turn, cancellation, and proposal review are
  possible without a desktop-only control;
- skip link, headings, landmarks, keyboard order, focus movement, and visible
  focus work; and
- axe scans pass at WCAG A/AA with documented exceptions only where a manual
  review shows a false positive.

## 4. Migration and data-release gates

Before legacy schema cleanup:

1. run fixture backfills against a production-equivalent PostgreSQL/RLS setup;
2. compare source and target counts, record sections, evidence, decisions,
   artifacts, and provenance;
3. prove a duplicate backfill produces no extra record version or relation;
4. run cross-workspace read/update/ownership-change attacks for every new or
   reworked tenant table;
5. prove historical agent/sprint data has a retained, converted, or archived
   disposition;
6. verify no live code or RLS policy joins through a table being dropped; and
7. test a forward corrective migration/flag rollback rather than editing
   history.

The cleanup migration cannot be applied in an environment where an old reader
could be rolled back into service.

## 5. Security and privacy gates

Treat the following as release blockers:

- cross-tenant context, operation, proposal, evidence, or event visibility;
- accepted record mutation caused by a model, worker, canceled operation, or
  duplicate delivery;
- raw model reasoning, prompt text, attachment content, tool arguments, or
  credentials in product streams/logs/telemetry;
- raw MCP, shell, filesystem, browser, database, object-store, or connector
  access from the co-founder or Harness adapter;
- an unscoped/expired capability credential working after cancellation;
- a Harness child process inheriting app/database/cloud/user-home credentials;
- a founder-facing screen exposing agent roles, workers, sprint controls, or
  implementation traces after cutover; and
- an accessibility regression that prevents keyboard or touch operation of a
  founder decision.

Use safe telemetry only: correlation/workspace/project/operation ids, runtime
kind/provider/model version, interaction type, capability name/risk, duration,
queue latency, retry/cancel/timeout, token/cost totals, schema result, and
durable object ids. Never use raw business text as standard telemetry.

## 6. CI topology

Split CI into independent, cached jobs:

1. **Static:** install with frozen lockfile; lint, typecheck, package build,
   dependency/export checks.
2. **Unit and integration:** PostgreSQL/Valkey services; domain, repository,
   service, router, and worker suites.
3. **Browser:** build web, seed fixtures, run Playwright across required
   viewport projects, retain failure diagnostics safely.
4. **Migration/RLS:** run forward migrations, fixture conversion, direct RLS
   attacks, and cleanup dry-run verification.
5. **Harness POC:** build the isolated Linux adapter image; run P0/P1/P2
   isolation matrix. It is a separate required job only while the Harness
   flag is eligible for promotion.
6. **Deployment validation:** deploy readers before writers, run readiness and
   operation health probes, and check safe error/cost/mismatch telemetry.

The current CI service setup already supplies PostgreSQL and Valkey. Extend it
rather than bypassing it with mocks for database/RLS or worker behavior.

## 7. Release controls and rollback

Use explicit, independently owned flags:

| Flag | Default | Removal condition |
| --- | --- | --- |
| Founder journey cutover | Off until migration/read-model/browser gates pass | Remove after all active readers use the new path and legacy rollback is no longer supported. |
| assistant-ui co-founder UI | Off until the ExternalStoreRuntime production-build, direct-runtime behavior, and a11y journeys pass | Remove after the new conversation is the only founder interface. |
| Cofounder worker operations | Off until idempotency/cancel/recovery tests pass | Remove after inline/worker mode selection is stable. |
| Harness POC | Off; never exposed to founders by default | Remove after explicit adopt or reject decision. |
| Harness runtime rollout | Off | Remove after controlled cohort, security review, and adoption gate; delete on rejection. |

Rollback disables a reader/writer flag or deploys a forward corrective migration
while retained compatibility data is still available. It never restores old
multi-agent writes or edits historical migrations.

## 8. Release exit criteria

The Phase 2 release is ready only when:

- all mandatory browser journeys pass against the production-like stack;
- database/RLS, operation/recovery, migration, runtime/capability, and
  accessibility suites pass in CI;
- all legacy code/data classifications have a counted disposition;
- no remaining founder route or public API makes legacy orchestration the
  primary workflow;
- direct runtime operation metrics are healthy for the controlled cohort; and
- the Harness decision is recorded as **adopted** only after P0–P2 pass, or
  **rejected** with the direct runtime retained. Neither outcome delays the web
  founder-product release once its own gates pass.
