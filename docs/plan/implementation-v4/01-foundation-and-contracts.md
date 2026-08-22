# Foundation and contracts

**Status:** proposed implementation plan  
**Implements:** V4.0–V4.2  
**Depends on:** [v4 overview](00-README.md) and
[implementation contracts and cleanup runbook](../18-implementation-contracts-and-cleanup.md)

## 1. Target application boundary

The application remains responsible for all durable state and decision-making
rules. AI is a bounded caller of application services, not a second control
plane.

```text
Founder route or API command
  → authenticated tRPC procedure
  → application service and transaction
  → journey / record / evidence / proposal persistence
  → founder-readable activity and readiness projection
  → ContextService selects authorized context
  → CofounderRuntime returns a validated draft or proposal
  → founder reviews material change
```

No runtime, queue, or tool may bypass the command boundary. In particular, a
worker may process a `CofounderOperation`, but it may only create a proposal or
draft through the same application authorization, idempotency, and audit
checks as a web request.

## 2. Package and service boundaries

Keep the existing monorepo split. Add contracts beside the code that owns their
meaning instead of creating a catch-all application package.

| Boundary | Target responsibility | Current sources to retain or replace |
| --- | --- | --- |
| `packages/domain` | Pure statuses, transition rules, record/proposal invariants, and value objects | Replace `journey-status.ts`, `derive-journey-phase.ts`, 17-section status vocabulary, and sprint contracts as active domain concepts. |
| `packages/api-contracts` | Command inputs/results, error envelopes, read models, stream/activity event schemas | Replace `DeskSummary.derivedPhase`, `AiJobSummary`, and sprint/job-shaped co-founder outputs. |
| `packages/db` | Migrations, repositories, RLS helpers, test truncation, transactional scopes | Retain existing workspace/project/evidence/decision/pack repositories as migration sources. |
| `apps/web/server/services` | Transactional use cases and projections | Add journey, business-record, proposal, context, and co-founder services; adapt project, pack, evidence, decision, experiment, and conversation services. |
| `apps/web/server/routers` | Authenticated command/query boundary | Add `journey`, `record`, `proposal`, `readiness`, and bounded co-founder procedures; sunset primary `sprint`, `job`, `score`, and `gate` procedures. |
| `packages/agent-runtime` | Portable runtime interface, bounded context selection, direct adapter, streaming normalization | Retain provider, context, secret, and streaming primitives; remove orchestration semantics after replacement. |
| `apps/worker` | Ingestion, render, notification, retrieval, and bounded co-founder operations | Retain application queues; replace the sprint worker only after the operation worker is proven. |

Services must depend inward: a router calls a service; a service calls
repositories and pure domain rules; a runtime calls `CapabilityGateway` rather
than repositories. Do not import `apps/web` services from a runtime or expose
database repositories as model tools. When a co-founder operation needs the
same command in web and worker hosts, extract a narrow, host-neutral command
port and inject it in both composition roots; the worker must not import a
Next.js route or Next-only module.

## 3. Canonical domain vocabulary

Introduce the following contracts once in `packages/domain`; derive UI labels
and colors from them rather than maintaining competing string unions.

```text
JourneyStage =
  idea | problem | customer | evidence | opportunity | offer | validation_next_step

JourneyStageStatus =
  not_started | draft | in_progress | awaiting_founder | ready_for_review |
  complete | deferred | blocked | revisited

JourneyStepStatus =
  proposed | ready | in_progress | awaiting_founder | submitted | reviewed |
  complete | deferred | skipped_with_reason | blocked | canceled | superseded

RecordItemStatus =
  empty | draft | needs_evidence | review | accepted | stale | deferred | blocked

Provenance =
  founder_input | cited_evidence | derived | ai_proposal |
  founder_approved | unverified | contradicted

ProposalStatus =
  draft | awaiting_founder | accepted | partially_accepted | rejected |
  expired | superseded
```

The product may use a display label such as “needs evidence,” but must not
collapse `unverified`, `contradicted`, founder input, AI recommendation, and
founder acceptance into a single “complete” state.

The 12 founder-readable sections are:

1. Idea and founder context
2. Problem
3. Beachhead customer
4. Current alternatives
5. Evidence and learning
6. Assumptions and open questions
7. Opportunity and differentiation
8. Value proposition
9. Offer, pricing, and business model
10. Economics and constraints
11. Decisions and changes
12. Next validation experiment

GTM, legal, launch, build, and operating content are migrated as deferred
extension data. They are not required to make an initial v4 record appear
complete.

## 4. Command rules

Every mutation has a typed input, command idempotency key, authorization scope,
expected revision where the command modifies known state, and an auditable
result. The first command set is:

```text
journey.create
journey.setObjective
journey.startStep
journey.submitStep
journey.deferStep
journey.revisitStage
evidence.capture
assumption.record
decision.record
experiment.define
proposal.create
proposal.review
record.acceptChanges
cofounder.respond
```

`proposal.review` expresses the founder's intent—accept selected changes,
modify, or keep current—not just an implementation event. `record.acceptChanges`
is the only command that can create a material accepted version from one or
more proposal changes.

### 4.1 Transaction boundary

For a material command, one database transaction must:

1. authorize the workspace, venture, and actor;
2. verify idempotency and expected revision;
3. validate journey and proposal invariants;
4. persist the draft, accepted change, or outcome;
5. create an immutable record version when acceptance is requested;
6. mark dependent items stale with a reason;
7. write an audit event and a founder-readable activity event; and
8. record an outbox item when later worker delivery is needed.

The worker only claims an outbox item after the transaction commits. If the
same command is retried, it returns the original result instead of duplicating
a version, operation, or proposal.

### 4.2 Read models

Build intentional query models instead of making clients reconstruct state from
pack rows, chat, scores, and jobs:

| Read model | Required contents |
| --- | --- |
| `JourneyOverview` | Current stage/objective, recommended and alternative steps, change summary, pending proposals, active/deferred/blocked work, and readiness explanations. |
| `JourneyMap` | Seven stages, status, goal, key outcomes, steps, blockers, and revisit consequences. |
| `RecordSectionDetail` | Current accepted content, provenance, linked evidence and decisions, version, stale relationships, and the smallest improving action. |
| `ProposalDetail` | Before/after values, rationale, uncertainty, evidence references, affected items, selectable changes, and review history. |
| `EvidenceLibrary` | Founder observations, interviews, documents, citations, assumptions, support/contradiction links, and untrusted-source state. |
| `CofounderTurn` | User-facing explanation, interaction type, proposal/step references, uncertainty, plain-language activity, and recoverable state. |

`overallScore`, Gate A, and deterministic score dimensions may remain inputs to
`ReadinessExplanation`, but they are not the primary journey state or a
founder-facing success score.

## 5. Service responsibilities

Implement services in this order:

1. **`JourneyService`** creates journeys, validates transitions, prioritizes
   steps, records defer/revisit reasons, and determines the next recommended
   step.
2. **`BusinessRecordService`** validates material items, creates immutable
   versions, maps legacy pack sections, and detects staleness.
3. **`ProposalService`** validates before/after changes, preserves review
   history, calculates affected items, and delegates accepted-version creation
   to the record service.
4. **`JourneyStepService`** manages bounded founder work and completion
   evidence. It replaces jobs as the primary work object.
5. **`ContextService`** selects the minimum authorized context for a
   co-founder action and records the selected references.
6. **`CofounderService`** invokes a runtime, validates its structured result,
   and persists only safe messages, drafts, and proposals.
7. **`CapabilityGateway`** authorizes, validates, bounds, audits, and executes
   each runtime capability.

Existing `ProjectService`, `PackService`, `PlanSectionAggregatorService`,
`EvidenceService`, `DecisionService`, `ExperimentService`,
`ConversationService`, and `FounderTaskService` are migration sources. Do not
extend their legacy phase, score, task, or sprint semantics while v4 contracts
are landing.

## 6. Initial venture creation

Replace the present “complete first pass plus research sprint” behavior with a
small, truthful flow:

1. create the venture from the founder's words;
2. create a journey in the `idea` stage and one recommended first step;
3. create a record skeleton with explicit empty, founder-input, or unverified
   items only;
4. record provided geography, goal, constraints, and urgency when supplied;
5. create no automatic research job, score, founder task, or complete-looking
   17-section draft.

`InitialDraftService` and `buildInitialDraft` may remain temporarily as
conversion names, but their output must satisfy this new contract before the
web creates new ventures from it.

## 7. Contract acceptance tests

Before wiring the first new route, add package-level tests for:

- every allowed and forbidden journey transition;
- create, defer, revisit, submit, and complete step behavior;
- record item status/provenance validation;
- partial proposal acceptance, rejection, expiry, and duplicate review;
- expected-revision conflict behavior;
- stale dependency propagation and no silent accepted-state mutation;
- idempotent command retries; and
- tenant/venture authorization for every new command and read model.

The result is a stable application seam for v4 web work and for either runtime
implementation. The DeepSeek Harness adapter must not introduce another
command, state machine, or proposal model.
