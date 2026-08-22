# Implementation v4 — Founder journey execution plan

**Status:** proposed implementation plan  
**Date:** 22 August 2026  
**Scope:** the executable transition from the shipped chat/sprint product to the
founder-controlled journey, versioned business record, and one co-founder
defined by the reset requirements.

## 1. Why v4 exists

The reset plans define the product and migration boundary. This folder turns
them into an ordered implementation program for the current repository.

The current codebase has valuable foundations—tenant isolation, project and
pack persistence, evidence, decisions, conversations, queues, provider
resolution, and a web shell. Its control plane is still misaligned: stored and
derived phases disagree, a 17-section score-gated pack represents progress, and
`FoundryAgent` delegates work through sprints, specialist skills, and a worker
pool.

v4 changes that control plane without discarding retained founder data or
weakening security. It delivers these outcomes in order:

1. one authoritative journey and an honest record skeleton;
2. real Overview, Journey, Model, Evidence, and Decisions destinations;
3. reviewable proposals and immutable accepted record versions;
4. one application-controlled co-founder; and
5. removal of the legacy multi-agent runtime before any optional DeepSeek
   Harness adoption.

DeepSeek Harness has a reserved implementation seam in v4. It is not a
dependency or a prerequisite for the first founder journey release.

## 2. Authority and reading order

Product behavior is defined by:

1. [Product reset](../../02-product-requirements/00-product-reset.md)
2. [Shared founder-journey requirements](../../02-product-requirements/01-shared-product-requirements.md)
3. [Web requirements](../../02-product-requirements/02-web-requirements.md)
4. [Application and co-founder requirements](../../02-product-requirements/04-worker-backend-requirements.md)
5. [Delivery slices](../../02-product-requirements/05-delivery-slices.md)

The reset plans remain the source for migration facts:

- [Retirement inventory](../15-current-state-and-retirement-inventory.md)
- [DeepSeek Harness evaluation](../16-deepseek-harness-evaluation.md)
- [Canonical journey and business model](../17-canonical-journey-and-business-model.md)
- [Implementation contracts and cleanup runbook](../18-implementation-contracts-and-cleanup.md)

Read this folder in order:

1. [Foundation and contracts](01-foundation-and-contracts.md)
2. [Persistence and migration](02-persistence-and-migration.md)
3. [Web journey experience](03-web-journey-experience.md)
4. [Co-founder and capability gateway](04-cofounder-and-capability-gateway.md)
5. [DeepSeek Harness adapter](05-deepseek-harness-adapter.md)
6. [Quality, security, and release](06-quality-security-and-release.md)

The core V4 plans are followed by the
[Phase 2 product cutover and Harness evaluation](phase2/00-README.md). Phase 2
executes the deferred end-to-end work: legacy retirement, the dedicated
co-founder chat experience, bounded operations, browser and release proof,
native-mobile completion, bounded draft capabilities, and the conditional
Harness adoption decision.

The historical `implementation/`, `implementation-v2/`, and
`implementation-3/` folders describe existing constraints, not v4 behavior.
Do not implement a historical requirement merely because a current component
uses it.

## 3. Non-negotiable decisions

| Decision | v4 rule |
| --- | --- |
| State authority | `JourneyService` owns the persisted current stage and objective. `projects.current_phase` becomes a compatibility projection, then retires. |
| Durable truth | Accepted `BusinessRecordVersion` and linked items are canonical. Conversation, model output, queues, and harness sessions are supporting state. |
| Founder control | A model or worker may create a draft or proposal, never accepted material business state. |
| Progress | Founder-sized `JourneyStep`s replace jobs and sprints as the primary work unit. |
| Uncertainty | Status, provenance, evidence support, and staleness replace a 0–100 business-success score. |
| AI shape | One `CofounderRuntime` contract has a direct provider adapter first. A Harness adapter is conditional and isolated. |
| Tool boundary | `CapabilityGateway` is the only runtime path to business or external capabilities. It is least-privilege, typed, audited, and draft-only. |
| Data safety | Historical migrations stay immutable. New migrations are additive until conversion, RLS, and compatibility checks pass. |

## 4. Delivery sequence

Each release should leave a usable product boundary, not a partially converted
architecture.

```text
V4.0  Freeze legacy expansion and capture conversion fixtures
  ↓
V4.1  Domain/API contracts and additive journey/record schema
  ↓
V4.2  Authoritative journey and honest venture creation
  ↓
V4.3  Overview, Journey, Model, Evidence, and Decisions web shell
  ↓
V4.4  Proposal review, accepted versions, readiness explanations
  ↓
V4.5  Direct single-cofounder runtime and bounded operations
  ↓
V4.6  Convert active references and remove legacy sprint/agent surfaces
  ↓
V4.7  Optional DeepSeek Harness P0–P2 adapter evaluation
  ↓
V4.8  Bounded integrations and native-mobile work, prioritized in Phase 2 after core release gates
```

`V4.7` may start only after the portable runtime contract is running in
production through the direct adapter. A failed Harness evaluation leaves the
product unchanged.

## 5. Cross-cutting implementation rules

- Keep business decisions in explicit commands with authorization,
  idempotency, expected-version checks, audit events, and predictable error
  results.
- Use one transaction for a command's accepted state, version, relationship,
  and activity event. Publish asynchronous work only after the transaction
  commits.
- Treat model output, uploaded documents, external pages, and user text as
  untrusted input. Schema validation is necessary but never substitutes for
  venture authorization.
- Build server-rendered route shells by default; make only interactive
  controls, stream consumers, and draft forms client components.
- Make every founder-relevant state deep-linkable. Query parameters may control
  a transient drawer or sheet, but primary destinations must have routes.
- Treat loaded data as stale only by explicit status and relationship rules;
  never silently replace an accepted field because a newer model output exists.
- Add tests alongside each migration and contract. Legacy deletion is a
  separately gated release, not cleanup folded into the first replacement PR.

## 6. Program exit criteria

v4's core journey release is complete when an authorized founder can:

1. start from a short idea and receive an honest, incomplete record plus a
   recommended first step;
2. return later to an overview with stage, objective, changes, uncertainty, and
   a useful continuation;
3. capture evidence, make or revise a decision, and see downstream staleness;
4. review an AI or founder proposal as before/after content, then accept,
   modify, or keep the current state;
5. use a single co-founder whose failed or canceled turn does not alter
   accepted state; and
6. export a versioned business model without reading the conversation history.

The legacy runtime is not considered removed until the replacement has passing
migration, tenant-isolation, transition, proposal, and end-to-end journey
tests. Harness evaluation is complete only when it meets the separate adoption
gate in [the adapter plan](05-deepseek-harness-adapter.md).

## 7. Deliberately outside v4's core release

- a new visual brand or wholesale design-system rewrite;
- native-mobile parity;
- autonomous research, outreach, publishing, scheduling, filing, payment, or
  other external write capabilities;
- user-configured raw MCP tools in the co-founder path;
- named agent roles, critic decisions, worker fan-out, or visible effort
  tuning; and
- making the DeepSeek Harness process a system of record.
