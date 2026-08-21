# Application and co-founder requirements

**Status:** current
**Date:** 22 August 2026
**Implements:** [Shared founder-journey requirements](./01-shared-product-requirements.md)

## 1. Architectural boundary

The application is the product engine. An AI runtime is a replaceable
implementation detail behind a narrow co-founder contract.

The application owns:

- authentication, workspace membership, and tenant isolation;
- venture, journey, step, and record persistence;
- state-machine transitions and next-step selection;
- evidence, assumptions, decisions, experiments, provenance, and staleness;
- proposal review and accepted-record versioning;
- context selection and redaction;
- authorization, budget, and capability policy;
- audit and activity history; and
- all external-system intent, approval, and execution policy.

No model, prompt, harness process, sub-agent, queue worker, or connector may
write accepted business state directly.

## 2. Core services

### 2.1 Journey service

`JourneyService` manages the explicit state machine. It:

- creates a journey for each venture;
- stores current stage, objective, stage states, and transition history;
- creates and prioritizes founder-sized steps;
- validates transition commands;
- supports defer, block, resume, and revisit behavior;
- identifies affected record items after a change; and
- returns the next recommended step with its explanation.

The journey state is persisted application data. It may not be inferred only
from chat text, pack-section completion, a model classification, a score, or an
asynchronous operation status.

### 2.2 Business-record service

`BusinessRecordService` maintains accepted, versioned business state. It:

- stores record sections and typed material items;
- validates item status and provenance;
- links items to evidence, assumptions, decisions, and experiments;
- creates immutable accepted versions;
- renders founder-readable model sections and exports;
- detects dependent content that becomes stale; and
- maintains a compatibility projection for retained legacy pack data during
  migration.

Generated artifacts are projections of an accepted record version. They are not
independent truth and cannot overwrite it.

### 2.3 Step, evidence, decision, and experiment services

These services manage the founder's actual work:

- `JourneyStepService` creates, starts, defers, receives, and reviews a
  founder-sized step.
- `EvidenceService` stores observations, notes, citations, documents, and
  source reliability metadata.
- `AssumptionService` ranks uncertain claims and links them to proposed tests.
- `DecisionService` records an authorized founder's choice, rationale,
  alternatives, and downstream effects.
- `ExperimentService` records a validation plan, success criteria,
  observations, and outcome.

These services are application APIs, not model tools that mutate the database
without a command-level authorization check.

### 2.4 Proposal service

`ProposalService` receives founder drafts and AI-generated suggestions. It:

- schema-validates proposed changes;
- records input context, evidence references, uncertainty, and source;
- produces section and field-level before/after comparisons;
- determines stale downstream items;
- supports accept-all-safe only when each material change is independently
  represented and explainable;
- creates the next accepted record version only after an authorized action; and
- preserves rejected and expired proposals for audit without treating them as
  accepted facts.

### 2.5 Context service

`ContextService` builds bounded co-founder context from application state. Its
default packet includes only what is relevant to the current interaction:

- venture identity, current stage, and objective;
- current accepted record items and their provenance;
- open assumptions, active steps, recent evidence, and decisions;
- relevant pending proposals;
- a bounded conversation summary and relevant recent messages;
- the current readiness explanations; and
- allowed capabilities and limits.

It must prioritize accepted, current, and authorized data over stale drafts. It
records the material context references used by a co-founder turn for audit and
reproducibility. It must not send an unbounded transcript, another tenant's
data, plaintext secrets, or a private hidden-reasoning trace.

### 2.6 Co-founder service and runtime interface

`CofounderService` orchestrates one founder-facing interaction. It calls a
replaceable `CofounderRuntime` with an application-built context packet and
returns a validated response.

The runtime interface receives:

- a correlation and operation identifier;
- a bounded context packet;
- the founder message or requested action;
- a schema version;
- an allowlisted capability manifest; and
- cancellation and duration limits.

The runtime returns:

- user-facing explanation;
- interaction type: `ask`, `inform`, `recommend`, `generate`, `review`, or
  `change`;
- references to application record items or evidence;
- optional draft content;
- optional proposed record changes;
- optional suggested journey steps;
- uncertainty and blocked conditions; and
- safe, user-visible activity events.

The application validates this response before storing it. It stores proposal
data separately from accepted record data.

### 2.7 Capability gateway

`CapabilityGateway` is the only path from the co-founder runtime to application
or external capabilities. Each capability has:

- a stable name and input/output schema;
- tenant and venture authorization;
- an explicit risk class;
- bounded inputs, time, and spend;
- an idempotency policy where relevant;
- an audit record; and
- a user-visible explanation of its outcome.

Initial capabilities are application-owned and limited to:

- read current venture state;
- search or retrieve approved public evidence through a bounded, citation-preserving adapter only after that adapter returns real results;
- create evidence drafts with citations;
- perform deterministic business calculations;
- generate a draft artifact;
- create a proposal; and
- prepare founder-owned materials.

The capability gateway must not expose a general shell, filesystem, raw
database, unrestricted browser, arbitrary user MCP server, credential store,
or unscoped connector API to the co-founder.

## 3. Core domain model

The target model is composed of the following aggregates. Existing compatible
tables and repositories may be migrated incrementally, but their semantic
contracts must converge on these responsibilities.

| Aggregate                     | Responsibility                                                              |
| ----------------------------- | --------------------------------------------------------------------------- |
| Venture                       | Ownership, founder intent, geography, constraints, and settings             |
| Journey                       | Current stage/objective, status, transitions, recommendations, and blockers |
| JourneyStep                   | One bounded action, effort, inputs, completion evidence, and outcome        |
| BusinessRecordVersion         | Immutable accepted snapshot of the founder-readable model                   |
| RecordItem                    | Typed material content with status, provenance, and links                   |
| Evidence                      | Observation, source, document, interview note, or experiment result         |
| Assumption                    | Testable uncertain claim and current support                                |
| Decision                      | Founder-approved choice, rationale, alternatives, and impact                |
| Experiment                    | Validation plan, criteria, observation, and result                          |
| Proposal                      | Reviewable founder or AI change before acceptance                           |
| ConversationMessage / Summary | Supporting history, never the canonical record                              |
| CofounderOperation            | A bounded, auditable runtime invocation when asynchronous work is necessary |
| ActivityEvent                 | User-readable record of a meaningful state or operation event               |

The following legacy concepts are not target aggregates: `Sprint`,
`SprintWorkerSpec`, `AgentDefinition`, `AgentRun`, `TaskLedger`,
`ProgressLedger`, a custom worker pool, a critic runtime, or a specialist skill
registry.

## 4. Persistence and migration requirements

### 4.1 Additive migration first

The migration must preserve tenant scope, accepted record history, and audit
links. It may add new tables or reinterpret retained pack tables through
compatibility projections, but it must not modify historical database
migrations or delete data before conversion checks pass.

The migration creates or formalizes:

- one authoritative journey state per venture;
- persisted journey transitions and step lifecycle;
- record-item provenance and status;
- proposal-level change sets and review outcome;
- explicit links between evidence, assumptions, decisions, experiments, and
  record items;
- staleness relationships;
- conversation summaries linked to the venture; and
- application-owned co-founder operation and capability audit records.

### 4.2 Legacy-data mapping

Existing projects, accepted pack revisions, evidence, assumptions, decisions,
experiments, conversation messages, founder tasks, and artifacts are migration
sources. The migration must:

1. create a journey with an explicit migration reason;
2. map retained pack content to the twelve founder-readable sections;
3. mark unmapped, unsupported, or legacy operational content as retired or
   deferred rather than silently deleting it;
4. preserve old revision identifiers and source references where possible;
5. mark uncertain migrated content with honest provenance; and
6. test representative projects before destructive schema cleanup.

`projects.current_phase` must be replaced with, or made a projection of, a
single authoritative journey-state representation. The system must not retain
two independently meaningful phase fields.

## 5. Co-founder execution

### 5.1 Initial implementation

The initial co-founder may use a single direct provider call with structured
output and application-owned capabilities. This is not a new agentic harness:
the loop, state, approvals, and policy remain in application services.

A failed or canceled turn must:

- leave accepted state unchanged;
- preserve the founder's message or draft;
- emit a recoverable activity event;
- provide a retry or continuation path; and
- avoid duplicating a proposal or side effect.

### 5.2 Later DeepSeek Harness integration

DeepSeek Harness may be evaluated only as an implementation of
`CofounderRuntime`. It is not a drop-in dependency or an authority for founder
state.

The integration must run as an isolated process or service with:

- a custom, version-pinned Cordis composition;
- one root co-founder session per authorized venture interaction;
- no registered subagent provider or subagent tool;
- no Bash, PowerShell, PTY, local filesystem, workspace instruction loading,
  browser, or default JSONL business-context persistence;
- no direct database, object-store, or secret-store access;
- only typed application-gateway capabilities;
- a session mapping owned by the application;
- application-controlled cancellation, timeout, usage attribution, and audit;
- schema validation before the application stores a result; and
- no descendant sessions or autonomous background work.

The harness's session history may be an ephemeral execution aid. The
application's business record, summaries, and audit data remain the durable
source of truth.

Harness adoption is conditional on a proof of concept demonstrating that this
boundary is simpler and no less safe than the direct runtime. The detailed
evaluation plan is in
[DeepSeek Harness evaluation](../plan/16-deepseek-harness-evaluation.md).

## 6. Background work and integrations

The worker remains useful for application-owned, bounded background operations:

- document ingestion and extraction;
- artifact rendering;
- notification delivery;
- source retrieval where the founder explicitly starts a bounded operation;
- deterministic recalculation; and
- a single co-founder operation when it cannot safely finish in a request.

It must not run an app-defined orchestration loop, fan out specialist workers,
select agent roles, synthesize worker opinions, invoke a critic agent, or
change accepted business state.

Future connectors follow this sequence:

1. application-owned read/draft capability;
2. clear proposed payload and impact;
3. durable founder approval;
4. separate, idempotent execution command;
5. auditable result and recovery state.

No future connector may use a harness-provided shell, raw MCP connection, or
direct user credential as a shortcut around that sequence.

## 7. Security, policy, and reliability

- Every command and capability enforces workspace and venture authorization on
  the server.
- Row-level security remains enforced for all tenant-scoped persistence.
- All material state changes are idempotent and auditable.
- Context and logs redact secrets and avoid exposing hidden model reasoning.
- Runtime event streams are reduced to user-safe activity and audit fields before
  entering application observability; raw model chunks, attachments, and harness
  session logs are not forwarded.
- User-provided documents and web content are untrusted input, not
  instructions.
- Provider and runtime failures degrade to a recoverable application state.
- Bounded operations have cancellation, timeout, retry, and duplicate-prevention
  behavior.
- Cost, provider use, and capability invocation are attributable to a venture
  operation, not a named agent.
- External writes are disabled until a separately approved execution policy
  exists.

## 8. Application acceptance criteria

The backend and worker implementation meets this specification when:

1. one authoritative journey state is available for every active venture;
2. an authorized founder action is required to accept material record changes;
3. evidence, assumptions, decisions, and experiments link to record items with
   provenance;
4. the co-founder receives bounded application context and returns
   schema-validated results;
5. a runtime cannot directly change a record, exceed a capability policy, or
   read another tenant's data;
6. a failed co-founder operation leaves accepted state intact and recoverable;
7. the worker executes no specialist roster, fan-out, critic, or agent
   conference; and
8. a DeepSeek Harness proof of concept, if enabled, cannot reach shell,
   filesystem, subagent, raw MCP, database, or external write capabilities.
