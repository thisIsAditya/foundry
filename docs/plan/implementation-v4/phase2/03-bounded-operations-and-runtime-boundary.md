# Bounded operations and runtime boundary

**Status:** proposed Phase 2 plan  
**Implements:** P2.2  
**Depends on:** [Phase 2 overview](00-README.md) and [co-founder and capability
gateway](../04-cofounder-and-capability-gateway.md)

## 1. Objective

Finish the direct co-founder execution path before deleting the sprint system
or evaluating DeepSeek Harness. The application must be able to run a short
turn inline when safe, dispatch a longer turn to a bounded worker operation
when necessary, and recover correctly from duplicate requests, cancellation,
timeout, worker retry, runtime failure, and concurrent record changes.

The worker is an execution host, not a business-state authority. It does not
select agents, compose a worker roster, write accepted record state, or call a
Next.js route handler.

## 2. Target boundary

```text
Web command / contextual action
  → CofounderOperation command port
      → persist founder message + operation + idempotency receipt
      → inline executor OR cofounder queue

Inline executor / worker processor
  → ContextService port
  → CofounderRuntime.run()
  → response validator
  → CapabilityGateway / ProposalService command ports
  → safe activity, operation state, and stream-event ports
```

The portable `CofounderRuntime` stays in `packages/agent-runtime` and has no
dependency on web services, database repositories, or Harness code. Direct and
Harness adapters implement the same input/output contract.

## 3. Extract a narrow host-neutral operation module

Do not make `apps/worker` import `apps/web/server`. Extract a focused,
co-founder-specific module (for example `packages/cofounder-operations`) with
only:

- validated operation command/result contracts;
- an operation-state transition function;
- `CofounderOperationPort` interfaces for context construction, runtime
  execution, proposal creation, message persistence, capability invocation,
  activity, and safe event publication;
- an `executeCofounderOperation` processor that coordinates these ports; and
- fake in-memory ports for unit tests.

It must not become a generic “application” package. Journey, record, proposal,
and evidence policy remain in their existing owning services and are injected
as narrow ports. Both the web composition root and worker composition root
provide their own adapter implementations.

## 4. Operation lifecycle

### 4.1 Durable states

Use the existing `CofounderOperation` entity as the state machine:

```text
queued → running → awaiting_founder → completed
                 ↘ failed | timed_out | canceled
```

Rules:

- a `project_id + idempotency_key` identifies one operation;
- the founder message and operation row are written atomically;
- only one executor may claim `queued` work;
- an executor records a lease/attempt/recovery category without persisting
  prompts, chain-of-thought, raw attachments, or raw tool payloads;
- terminal results replay from durable application data, not from browser
  state or a harness session;
- `awaiting_founder` means the user must take a durable proposal-review or
  focused follow-up action, not that a model is waiting on a hidden tool; and
- accepted record state remains unchanged in every non-completed and
  non-founder-approved path.

### 4.2 Inline versus worker selection

Use an explicit policy, not user-facing “effort” controls:

| Execution mode | Allowed use |
| --- | --- |
| Inline direct runtime | Short, bounded explanation/ask/review turn that fits request duration and does not wait on retrieval or a long capability. |
| Cofounder worker operation | Retrieval, document processing, provider latency, Harness process execution, or any operation that exceeds the inline deadline. |

The caller records the selected mode and reason in safe operation metadata. The
UI shows a plain-language objective and status, never a worker count, agent
role, or hidden execution topology.

### 4.3 Cancellation and timeout

Cancellation is a durable command:

1. authorize the founder for the project;
2. atomically mark the operation canceled unless it is terminal;
3. publish a scoped cancellation signal to the active executor;
4. abort the direct runtime or terminate the Harness child process;
5. require in-flight capabilities to check cancellation and honor their
   idempotency keys;
6. publish one safe terminal event; and
7. return a retryable user-facing state without an accepted mutation.

Timeout follows the same terminal path with `timed_out` and a safe recovery
category. A worker restart must recover by inspecting the durable operation
state and claim lease; it must not assume an in-memory `AbortController`
survived a process boundary.

### 4.4 Command vocabulary and state semantics

Reconcile product command names with the public tRPC catalog before deleting
legacy routes. In particular:

- either make `submitStep` explicitly aggregate
  `submitted → reviewed → complete`, or expose distinct ready-for-review and
  complete commands with founder-visible consequences;
- add explicit block/unblock commands before a UI presents a blocked state as
  actionable;
- preserve defer, skip-with-reason, and revisit as founder commands with a
  recorded reason;
- treat `stale` as a record-item **status** with a staleness relationship, not
  as provenance; and
- keep readiness explanatory only—no command or capability silently advances a
  stage.

## 5. Queue and worker transition

Add an app-owned `cofounder` queue with:

- a queue job id derived from the operation id;
- explicit retry/backoff policy appropriate to an idempotent operation;
- a worker processor that claims, executes, and finalizes one operation;
- cancellation and shutdown handling;
- dead-letter/recovery observability with no raw founder content; and
- separate health/metrics from ingestion, rendering, and notification queues.

Only after it is proven, remove the `sprint` queue and worker. The new queue
must not reuse the sprint job schema, sprint retries, worker pool, MCP loading,
agent definition lookup, or pack-synthesis path.

## 6. Runtime and capability rules

### 6.1 Direct runtime baseline

`DirectAiSdkRuntime` must:

- receive only the bounded `CofounderContextPacket`, founder request, capability
  manifest, schema version, timeout, and cancellation signal;
- return a schema-validated structured result with exactly one interaction
  type;
- produce a proposal draft instead of an accepted change;
- expose only safe token/duration/model metadata to the operation layer; and
- fail to a recoverable application result without treating a malformed
  response as a successful message.

The current direct adapter performs one `generateObject` call and does not
invoke the existing `CapabilityGateway`; the gateway is neither a dead
candidate nor a sufficient implementation merely because its manifest exists.
Before Harness P1/P2, prove one typed direct-runtime capability call through
the same gateway contract or explicitly keep the direct runtime tool-free.
Harness must not become the first runtime that exercises application tools.

If a direct-runtime tool loop is enabled, add a narrow
`RuntimeCapabilityPort` to the runtime boundary. It accepts only a typed,
allowlisted capability request/result and is injected by the application
composition root. `packages/agent-runtime` must not import web services,
repositories, or database clients, and no generic model tool can bypass the
port.

### 6.2 Capability gateway completion

`CapabilityGateway` needs an explicit per-capability contract:

- stable name and version;
- Zod input and output schema;
- actor/workspace/project/operation authorization;
- risk class, duration, token/spend budget, and cancellation behavior;
- idempotency rule and audit result;
- allowed runtime kinds; and
- a safe founder-visible summary.

The gateway remains the only runtime tool path. It does not expose generic
database access, filesystem, shell, browser, object storage, raw MCP, provider
credentials, arbitrary URLs, or external write execution.

Start with only:

1. `venture.readCurrentState` (normally satisfied by the context packet);
2. deterministic `business.calculate`;
3. `material.prepareDraft`;
4. `artifact.createDraft`;
5. `proposal.createDraft`; and
6. `evidence.createDraft`.

`evidence.searchApproved` remains disabled until the application has a real
citation-preserving source adapter and corresponding evidence model tests.

## 7. Safe event reduction

Expose only the following application events to the UI and product activity:

```text
cofounder_started
cofounder_waiting
capability_completed
proposal_ready_v4
journey_step_suggested
cofounder_completed
cofounder_failed
cofounder_canceled
```

Every event must include a project and operation identifier; event consumers
filter to the operation they initiated. Do not add token deltas, reasoning,
prompts, attachments, tool arguments/results, provider credentials, worker
identities, or Harness event payloads to `StreamEvent`.

## 8. Tests

### Unit and contract tests

- legal and illegal operation-state transitions;
- exactly-once operation creation and terminal-result replay;
- direct runtime structured-output validation for all six interaction types;
- context selection precedence, omission recording, and secret/tenant
  redaction;
- capability schema, authorization, risk, budget, cancellation, and
  idempotency behavior; and
- stream-event reduction that rejects unsafe runtime payloads.

### Database/service tests

- one workspace cannot read, cancel, or finalize another workspace’s operation;
- duplicate queue delivery cannot create a second proposal or founder message;
- cancellation before runtime, during runtime, and during capability invocation
  leaves accepted state unchanged;
- timeout/retry/resume retains the current journey step and supports a new
  operation;
- proposal creation, reject, modify, selected acceptance, and stale-record
  conflict behavior; and
- worker crash after draft/proposal creation but before terminal publication.

### Browser tests

- a long operation progresses from queued to terminal state without exposing
  worker terminology;
- cancel and retry preserve the founder draft;
- a completed operation rehydrates after refresh or reconnect; and
- one operation’s status cannot appear in another venture’s co-founder view.

## 9. Exit gate

P2.2 passes when the direct runtime and bounded operation worker provide the
same founder-controlled semantics, no worker imports Next.js server modules,
all terminal paths leave accepted state intact until founder approval, and the
new operation path has replaced the last active sprint/job write path.
