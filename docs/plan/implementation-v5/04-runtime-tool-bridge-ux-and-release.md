# V5.3–V5.4 — Runtime tool bridge, UX, and release gates

## 1. Objective

Enable a small, observable tool loop for the existing isolated co-founder
runtime while keeping application commands, policy, evidence, and founder
approval authoritative.

DeepSeek Harness remains an execution engine. It does not acquire persistent
memory, arbitrary web access, raw application credentials, a filesystem,
browser, database, MCP configuration, or a direct mutation path.

## 2. Tool protocol

Replace the current “context only / final JSON” sidecar behavior with a typed,
authenticated RPC bridge:

```text
Harness session
  → typed tool request
  → operation-scoped gateway token
  → CapabilityGateway
  → application query or command
  → redacted typed result
  → structured co-founder result
```

The operation token is short-lived and binds:

- user, workspace, project, and operation ID;
- named capability versions and maximum invocation count;
- runtime kind, expiry, and cancellation state; and
- optional query/spend budget.

The adapter validates both directions. It rejects unexpected tool names,
schema-invalid input, more calls than policy permits, calls after cancellation,
cross-project references, and raw/oversized response payloads.

Start with one read capability and one draft capability in staging:

1. `evidence.searchApproved@1`
2. `evidence.createDraft@1`

Only then add deterministic calculation, material preparation, and
proposal-draft creation. No tool can directly accept a proposal or write an
accepted business record.

## 3. Interaction and review model

The co-founder UI must make the tool-assisted state legible without exposing
hidden reasoning:

- show the action type: ask, inform, recommend, generate, review, or change;
- identify the records and sources considered;
- distinguish found facts, founder assertions, interpretation, and uncertainty;
- show a draft/proposal before/after summary and affected sections;
- expose a focused “review extraction” route for interview imports;
- show safe operation progress: retrieving evidence, preparing a draft,
  waiting for review, completed, failed, canceled;
- render validated suggested next steps as a durable founder-visible
  recommendation linked to the Journey route, not as an unpersisted model
  field that disappears after the turn; and
- keep primary actions close to the relevant result; and
- link to the app page that owns the next manual action.

Do not add a generic chat-only control plane. Every new co-founder ability must
have a deep-linkable app surface where the founder can inspect and complete the
same workflow without AI.

## 4. Evaluation and observability

Create a fixture suite from sanitized, versioned project scenarios:

- sparse new idea with no evidence;
- mature record with stale assumptions;
- contradictory source material;
- a manual interview;
- a three-interview bundle with missing consent;
- a research request with sufficient citations;
- a research request with no permissible/credible result;
- duplicate import, canceled operation, timed-out provider, stale proposal, and
  unauthorized capability attempt.

Measure:

- citation coverage and invalid-reference rate;
- unsupported factual-claim rate;
- source-to-candidate and candidate-to-accepted-interview traceability;
- proposal acceptance, modification, rejection, and stale-conflict rate;
- manual completion rate versus AI-assisted completion rate;
- operation latency, cancellation success, retry duplication, and policy denial;
- context selection omissions and memory correction/deletion rate.

Log only safe operation metadata, capability names/outcome categories, latency,
token/cost totals, validation results, and reference IDs. Do not retain hidden
reasoning, raw prompts, raw tool payloads, unredacted sensitive documents, or
provider credentials in product telemetry.

## 5. Rollout gates

| Gate | Required proof |
| --- | --- |
| V5.0 command parity | Manual workflow exists before its capability is enabled; policy and idempotency tests pass. |
| V5.1 grounding | Inline and worker context parity, reference validation, workspace isolation, and inspectable memory pass. |
| V5.2 imports | Candidate review, consent handling, source provenance, batch idempotency, and recovery pass. |
| V5.3 tool bridge | Isolated sidecar tool token, typed gateway, cancellation, budget, and cross-tenant tests pass. |
| V5.4 release | End-to-end founder flows pass with co-founder enabled and disabled; evaluation thresholds meet agreed targets. |

On any gate failure, disable only the affected capability/import path. The
manual app, accepted record, journey, and existing evidence remain available.

## 6. Explicit non-goals

V5 does not add:

- autonomous validation claims;
- unreviewed interview or evidence creation;
- implicit consent, synthetic quotes, or fabricated citations;
- broad browser, shell, filesystem, database, object-store, MCP, or connector
  tools;
- external sending, publishing, purchasing, filing, or payment actions; or
- multi-agent coordination, self-modification, or a Harness-owned memory
  system.
