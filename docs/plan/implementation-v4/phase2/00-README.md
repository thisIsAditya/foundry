# Implementation v4 — Phase 2: product cutover and Harness evaluation

**Status:** proposed execution plan  
**Date:** 22 August 2026  
**Scope:** finish the deferred V4 delivery work, retire the replaced
multi-agent/sprint architecture safely, rebuild the co-founder interaction with
dedicated UI primitives, and evaluate DeepSeek Harness behind the existing
application-owned runtime boundary.

## 1. Purpose

Phase 2 turns the V4 replacement implementation into a releasable product. It
does not change the product reset:

- the journey and accepted business record remain the durable truth;
- the founder remains the only authority that accepts material business state;
- one co-founder remains the only founder-facing AI identity; and
- DeepSeek Harness remains optional infrastructure, never a product control
  plane.

The work is intentionally ordered. A polished chat UI cannot substitute for a
safe operation model; a Harness adapter cannot justify retaining a worker pool;
and legacy code cannot be dropped until migration, RLS, and end-to-end behavior
are proven.

## 2. Authority and reading order

Product rules remain authoritative:

1. [Product reset](../../../02-product-requirements/00-product-reset.md)
2. [Shared founder-journey requirements](../../../02-product-requirements/01-shared-product-requirements.md)
3. [Web requirements](../../../02-product-requirements/02-web-requirements.md)
4. [Application and co-founder requirements](../../../02-product-requirements/04-worker-backend-requirements.md)
5. [Delivery slices](../../../02-product-requirements/05-delivery-slices.md)

Read the existing V4 plans before this directory, especially:

- [Persistence and migration](../02-persistence-and-migration.md)
- [Web journey experience](../03-web-journey-experience.md)
- [Co-founder and capability gateway](../04-cofounder-and-capability-gateway.md)
- [DeepSeek Harness adapter](../05-deepseek-harness-adapter.md)
- [Quality, security, and release](../06-quality-security-and-release.md)

Read this Phase 2 directory in order:

1. [Product cutover and legacy retirement](01-product-cutover-and-legacy-retirement.md)
2. [Co-founder chat experience](02-cofounder-chat-experience.md)
3. [Bounded operations and runtime boundary](03-bounded-operations-and-runtime-boundary.md)
4. [DeepSeek Harness isolated adapter](04-deepseek-harness-isolated-adapter.md)
5. [End-to-end quality and release](05-end-to-end-quality-and-release.md)
6. [Responsive web, native mobile, and bounded integrations](06-responsive-web-native-mobile-and-bounded-integrations.md)

## 3. Decisions locked for planning

| Area | Phase 2 decision |
| --- | --- |
| Durable truth | `Journey`, accepted `BusinessRecordVersion`, linked record items, evidence, decisions, and proposals remain canonical. Conversation and Harness sessions are supporting state only. |
| Chat UI | Use **assistant-ui** with `ExternalStoreRuntime` as the primary presentation layer. It fits the existing TanStack Query, Zustand, persisted-message, and resumable-SSE model without taking ownership of founder data. |
| Chat fallback | Use **AI Elements** as the source-owned component fallback if an assistant-ui production-build spike cannot preserve application ownership without broad Shadcn adoption. Do not use a hosted chat vendor or let a client runtime become the message system of record. |
| Runtime baseline | `DirectAiSdkRuntime` remains the default and reference implementation until an isolated Harness adapter passes every adoption gate. |
| Harness placement | DeepSeek Harness runs only as an isolated Linux worker-side process/service through a custom minimal composition. It is never an in-process root-workspace dependency or a web UI. |
| Tools | `CapabilityGateway` remains the only model-facing path to application or external capabilities. No raw user MCP, shell, filesystem, browser, database, object store, or connector access is introduced. |
| Legacy cleanup | Classify each item as retained, migrated, archived, or deleted based on active reachability and data disposition. Never use age or lack of UI exposure alone as evidence that data can be dropped. |
| Rollout | Readers switch before writers are removed; code and schema retire only after counted conversion, tenant isolation, cancellation, and browser-journey gates pass. |

### 3.1 Why assistant-ui is the planned primary UI library

The current web app already owns conversation messages in the database, uses
TanStack Query and Zustand for client state, and resumes project events through
SSE with `Last-Event-ID`. `assistant-ui`’s `ExternalStoreRuntime` is designed
for this situation: its thread is a presentation layer over an external,
application-owned store rather than a client/runtime that becomes the message
authority.

The compatibility spike must pin `@assistant-ui/react`, production-build the
Next 16 / React 19 application, use only core/external-store primitives or
selectively adopted source components, and prove keyboard, persistence, and
operation recovery behavior. It must not enable Assistant Cloud, LocalRuntime,
generic tool/reasoning displays, hosted history/file storage, or provider
ownership.

AI Elements remains the fallback because its copied React/Tailwind components
fit the stack and keep source in the repository. It does not solve the existing
external-store/operation-state problem by itself, so do not adopt its
`useChat` transport unless a separate app-owned UI-message endpoint is
deliberately designed. Stream Chat is not selected because its channel and
hosted-conversation model would add a second authority for a product that
already owns its conversation persistence.

## 4. Execution sequence

```text
P2.0  Establish an executable delivery baseline and close the dual control plane
  ↓
P2.1  Replace the co-founder presentation and interaction transport
  ↓
P2.2  Extract bounded operation execution and complete direct-runtime recovery
  ↓
Direct runtime is the exclusive production co-founder path
  ├─ P2.3  Convert active references and retire legacy runtime/sprint architecture
  └─ P2.4  Run Harness P0 → P1 → P2 in an isolated adapter
                 ↓
P2.5  Run end-to-end, accessibility, security, and web-release gates
  ↓
P2.6  Complete responsive web, then the separately gated native/mobile companion
  ↓
P2.7  Promote Harness only if its adoption gate passes; otherwise retain direct runtime
```

Each phase has a usable stopping point:

- P2.0 produces a reliable test/fixture baseline and a data disposition.
- P2.1 produces a better co-founder experience without changing authority.
- P2.2 produces recoverable, auditable bounded operations.
- P2.3 leaves no active multi-agent or sprint path.
- P2.4 can end with an explicit rejection decision without harming the product.
- P2.5 establishes the web founder-product release proof independently of
  Harness adoption or native parity.
- P2.6 completes the field-friendly product surface without forking state.

## 5. Phase outcomes

### P2.0 — establish the baseline

1. Start local PostgreSQL/Valkey services in the documented development
   environment and make all existing database and router suites runnable.
2. Capture anonymized conversion fixtures and a counted disposition for legacy
   projects, packs, sprints, jobs, runs, usage, tool calls, findings, tasks,
   decisions, artifacts, and conversation history.
3. Add a release flag/owner/removal condition for the legacy cutover and,
   separately, for the Harness POC.
4. Freeze new usages of `FoundryAgent`, worker pools, sprints, agent
   definitions, specialist skills, score-led progression, and raw MCP in
   founder-facing paths.

### P2.1 — replace the co-founder interaction

1. Prove `assistant-ui` `ExternalStoreRuntime` over application-owned
   conversation and operation state; fall back to source-owned AI Elements only
   if that compatibility spike fails.
2. Replace the bespoke scrolling/composer/message implementation with
   accessible typed interaction blocks for Ask, Inform, Recommend, Generate,
   Review, and Change.
3. Keep initial page history server-rendered; make only the composer, live
   operation state, attachment selection, and proposal controls client islands.
4. Preserve draft text and attachment intent across retryable failure, network
   loss, and cancellation.

### P2.2 — complete bounded operations

1. Make `CofounderOperation` the stable request/worker lifecycle for turns
   that do not safely fit in a request.
2. Extract a narrow host-neutral command port so the worker can run an
   operation without importing Next.js services or route handlers.
3. Make direct runtime cancellation, timeout, idempotency, replay, operation
   recovery, capability audit, and safe event reduction fully testable.
4. Keep accepted state unchanged until the normal founder proposal-review
   command succeeds.

### P2.3 — cut over and remove legacy architecture

1. Switch every founder path, active worker, router, contract, stream event,
   test, prompt, environment variable, and documentation reference to the
   replacement journey/operation model.
2. Archive or rebind legacy data before an additive cleanup migration removes
   obsolete foreign keys, RLS policies, tables, enums, indexes, and packages.
3. Remove the custom agent orchestration, named-agent registry, specialist
   prompts, worker pool, sprint queue, score-first surfaces, old job APIs,
   raw MCP co-founder loading, and code-mode sandbox where their disposition
   is deletion.

### P2.4 — evaluate DeepSeek Harness

1. Build a separate adapter workspace and production Linux image pinned to an
   exact Harness revision.
2. Pass P0 (isolated headless turn), P1 (one safe application capability;
   cited evidence only when the source adapter is real), then P2 (durable
   proposal bridge).
3. Stop immediately and retain the direct runtime if any isolation, provider,
   cost, cancellation, session, or recovery gate fails.

### P2.5–P2.7 — web release, field companion, and adoption decision

1. Run the full browser, RLS, migration, operation, accessibility, and
   security suites in CI.
2. Roll out the direct-runtime web product path to a controlled cohort with safe
   mismatch, error, duration, and cost monitoring.
3. After web GA, complete responsive/mobile companion and bounded draft-only
   flows on the same application contracts.
4. Promote the Harness adapter only if it is demonstrably no less safe and
   materially simpler or more capable than the direct baseline. Otherwise
   record the rejection and remove the POC flag and deployment artifact.

### 5.1 Sequencing resolutions

- **Web GA does not require Harness adoption.** Harness P0 can begin once the
  direct runtime is the exclusive production co-founder path and P2.2 operation
  gates pass. It may run alongside final archival/rebinding work, but Harness
  promotion waits for the legacy cutover and all adoption gates.
- **Harness P1 has no raw web-read exception.** It uses
  `venture.readCurrentState` first. `evidence.searchApproved` remains disabled
  until the application returns real, citation-preserving results.
- **Harness P2 creates a proposal only.** Founder acceptance runs the normal
  selected-change record-version command; no Harness approval or draft-pack
  revision is accepted business state.
- **`stale` is a record-item status, not provenance.** Existing status,
  provenance, and staleness relationship rules are authoritative.
- **Responsive web gates core delivery.** Native mobile is a separately gated
  companion after web GA; it must not preserve or prolong a legacy sprint API
  merely to achieve feature parity.

## 6. Product exit criteria

Phase 2 is complete only when an authorized founder can:

1. create an idea, pause, and return to a truthful overview and next action;
2. complete, defer, revisit, or skip a small step with visible consequences;
3. capture evidence, assumptions, decisions, and an experiment without
   implying validation;
4. review a proposal as current value, proposed value, rationale, evidence,
   uncertainty, and downstream impact before accepting selected changes;
5. use an accessible co-founder interface that retains unsent work and shows
   explainable, safe operation state; and
6. export a versioned business record without reading chat history.

The product is not complete if any primary founder path still requires or
exposes a sprint, worker count, specialist persona, agent trace, score-as-
validation, raw MCP, or a default Harness capability.

## 7. Explicit non-goals

Phase 2 does not authorize:

- autonomous business operation, external writes, or unbounded research;
- a DeepSeek Harness web UI, default `dsh-base` composition, persistent
  Harness business sessions, or direct Harness database access;
- new specialist personas, critic loops, agent conferences, worker fan-out,
  or user-configured raw MCP tools;
- a wholesale visual-brand or design-system rewrite; or
- deletion of historical migration files or data without a recorded,
  fixture-proven disposition.
