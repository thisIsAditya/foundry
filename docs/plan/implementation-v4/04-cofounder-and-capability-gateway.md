# Co-founder and capability gateway

**Status:** proposed implementation plan  
**Implements:** V4.5  
**Depends on:** [foundation and contracts](01-foundation-and-contracts.md),
[web journey experience](03-web-journey-experience.md), and
[application requirements](../../02-product-requirements/04-worker-backend-requirements.md)

## 1. Deliver the application contract first

The first co-founder release uses a single direct provider adapter. It does not
wait for, import, or emulate DeepSeek Harness. This proves the durable
application boundary and creates a safe comparison baseline for the later
Harness proof of concept.

Target call path:

```text
Founder message or contextual request
  → CofounderService.authorizeAndPrepare
  → ContextService.buildPacket
  → CofounderRuntime.run
  → schema and policy validation
  → Conversation / Proposal / Step application commands
  → safe stream and activity events
```

The model returns a structured suggestion. It cannot issue an accepted-record
write, change a stage, approve a proposal, or choose an external side effect.

## 2. Portable runtime contract

Create the runtime contract in `packages/agent-runtime`, with no dependency on
web services, database repositories, or a Harness package. The direct adapter
and future Harness adapter implement the same interface.

```text
CofounderRuntime.run({
  operationId,
  actor: { workspaceId, ventureId, userId },
  contextPacket,
  founderRequest,
  schemaVersion,
  capabilityManifest,
  timeoutMs,
  abortSignal
}) → {
  explanation,
  interactionType,
  references,
  draft?,
  proposalDraft?,
  suggestedSteps?,
  uncertainty,
  blockedConditions,
  activity
}
```

`interactionType` is exactly one of `ask`, `inform`, `recommend`, `generate`,
`review`, or `change`. The response schema must distinguish:

- cited facts from an AI interpretation;
- founder-approved items from unresolved assumptions;
- draft content from an acceptance request;
- tool/capability result references from model prose; and
- a recoverable runtime error from a completed operation.

Model output that fails schema, reference, policy, or authorization validation
is retained only as a safe diagnostic when appropriate. It never becomes a
record item, evidence claim, proposal, or user-visible success message.

## 3. ContextService

`ContextService` creates a bounded packet from application state, in this
precedence order:

1. actor, workspace, venture, and requested interaction;
2. current journey stage and objective;
3. accepted record items and current version;
4. active/blocked/deferred steps and pending proposals;
5. relevant evidence, decisions, experiments, and assumptions with provenance;
6. readiness explanations;
7. an approved bounded conversation summary and only relevant recent messages;
8. allowed capability names, limits, and a correlation identifier.

The packet contains record IDs/references sufficient for later validation; it
does not include another tenant's data, database credentials, access keys,
session cookies, raw documents unless explicitly selected, a full transcript,
or hidden model reasoning.

Context selection is deterministic and tested. When a source is omitted due to
size or authorization, record that fact in an internal audit field rather than
asking the model to guess.

## 4. Direct runtime adapter

The initial `DirectAiSdkRuntime`:

- uses the existing provider-resolution and secret-envelope mechanisms;
- receives one stage-aware instruction set, not specialist prompts or skill
  selection;
- performs one bounded structured output interaction;
- uses a narrow capability manifest;
- observes model and cost limits from application policy;
- maps final, user-safe output into the runtime response; and
- ends with a clear continuation, never an autonomous background plan.

The adapter may use a short server request for a predictable interaction. Move
long-running retrieval, document processing, or a model turn that cannot fit
the web request's timeout into a `CofounderOperation` on the worker. The
operation remains a single application task; it is not a sprint, job board
item, or worker-pool coordinator. Its worker calls a host-neutral application
command port, never a Next.js route handler or a Next-only server module.

Rewrite `cofounder-turn.ts` around this contract. Then remove the active path
through `FoundryAgent`, `FOUNDRY_SKILLS`, critic output, worker selection, and
`submit_decision` action semantics. Keep useful provider, context compression,
stream normalization, secret, and error primitives only where their behavior
matches this plan.

## 5. CapabilityGateway

`CapabilityGateway` is the sole runtime tool boundary. Each capability has a
stable name and version, input/output schema, actor/venture scope, risk class,
time and spend limit, idempotency rule, audit record, and safe
founder-visible outcome.

### Initial capability manifest

| Capability | Rule |
| --- | --- |
| `venture.readCurrentState` | Read only, limited to the scoped venture; normally satisfied by the context packet. |
| `evidence.searchApproved` | Disabled until a citation-preserving source adapter returns real results. |
| `evidence.createDraft` | Creates a reviewable evidence draft with citation/provenance metadata; does not claim validation. |
| `business.calculate` | Runs deterministic calculators with bounded, schema-valid input. |
| `artifact.createDraft` | Produces a draft artifact linked to the current accepted record version. |
| `proposal.createDraft` | Creates a reviewable proposal through `ProposalService`; never accepts it. |
| `material.prepareDraft` | Drafts interview guides, outreach, experiments, and founder-owned materials. |

The initial manifest explicitly excludes:

- shell, code execution, filesystem, browser automation, unrestricted web
  fetch, raw database, object store, or secret store access;
- arbitrary user MCP configuration;
- direct connector access, send/publish/schedule/file/payment behavior; and
- broad “admin” or cross-venture capabilities.

Every capability repeats authorization downstream. A valid model tool request
is not proof that the actor can perform the operation.

## 6. Operations, cancellation, and streaming

`CofounderOperation` has explicit states such as `queued`, `running`,
`awaiting_founder`, `completed`, `failed`, `canceled`, and `timed_out`. It
stores the correlation ID, initiating actor, runtime kind, safe usage totals,
and recovery information. It does not store a raw prompt, reasoning trace, or
unbounded transcript.

Cancellation is a state transition:

1. the founder cancels or a timeout occurs;
2. the app stops/aborts the runtime;
3. in-flight capabilities use idempotency keys and enforce cancellation where
   possible;
4. the app records a recoverable activity event;
5. accepted record state remains unchanged; and
6. a retry creates or resumes a fresh operation from application context.

Map only safe lifecycle events into `StreamEvent` and the activity timeline:

```text
cofounder_started
cofounder_waiting
capability_completed
proposal_ready
journey_step_suggested
cofounder_completed
cofounder_failed
cofounder_canceled
```

Do not stream hidden reasoning, prompt text, attachments, raw capability
arguments/results, provider credentials, internal agent topology, or traces
from other operations.

## 7. Recovery rules

| Failure | Required result |
| --- | --- |
| Invalid structured model response | Preserve founder message/draft; return a recoverable error; no proposal or accepted mutation. |
| Provider timeout/unavailable | Mark operation failed or timed out; keep active step and record unchanged; offer retry. |
| Capability policy denial | Explain the unavailable action in plain language; do not let the model retry with a broader tool. |
| Duplicate request or worker retry | Return original operation/proposal result through idempotency. |
| Concurrent record change | Reject stale acceptance with a focused review of current versus proposed state. |
| Cancellation during a capability call | Record the result safely, avoid duplicate effects, and require a new authorization path for any retry. |

## 8. Tests before legacy runtime removal

Add tests for:

- context selection, workspace isolation, secret redaction, and stale-content
  precedence;
- each runtime interaction type and its output schema;
- malformed/unsupported model output;
- proposal creation versus accepted-version separation;
- capability authorization, schema, risk, timeout, budget, and idempotency;
- worker retry/cancel/timeout behavior;
- user-safe stream reduction; and
- a full co-founder flow that creates a proposal, rejects it, modifies it, then
  accepts selected changes.

Only after these pass may the production call path stop importing custom
orchestration, named skills, agent definitions, critic output, or sprint
worker logic. The direct adapter stays available while the Harness adapter is
evaluated.
