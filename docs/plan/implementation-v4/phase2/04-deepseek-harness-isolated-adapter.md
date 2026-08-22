# DeepSeek Harness isolated adapter

**Status:** conditional Phase 2 proof-of-concept plan  
**Implements:** P2.4 and P2.7  
**Depends on:** [Phase 2 overview](00-README.md), [bounded operations and runtime
boundary](03-bounded-operations-and-runtime-boundary.md), and an exclusive,
observed direct-runtime production path

## 1. Decision

DeepSeek Harness is evaluated as a second implementation of `CofounderRuntime`.
It is not embedded into the root workspace, not used as the founder UI, not
given durable business memory, and not allowed to become a tool, policy,
approval, or orchestration authority.

The local evaluation source is `C:\Magna\Discovery\deepseek-harness`, currently
`@deepseek-ai/dsh-root` `0.1.1-rc.2`, MIT licensed, with pnpm 11 and TypeScript
6, inspected at commit `b150a551b8d465e31e418e1b2eaf5e79bbb7d28e`. The
BusinessGenerator workspace uses pnpm 10 and TypeScript 5.9. Those toolchain
and developer-preview boundaries are sufficient reason to keep the adapter out
of the root workspace.

The direct runtime remains the production baseline. An adopted Harness adapter
must prove a material advantage without weakening any founder-control,
tenant-isolation, cancellation, privacy, or operational guarantee.

## 2. Target topology

```text
Founder command
  → application-owned CofounderOperation
  → cofounder worker
      → CofounderRuntime
          ├─ DirectAiSdkRuntime
          └─ DeepSeekHarnessRuntime
               → isolated Linux child process / sidecar
                    → `dsh-jsonrpc-agent` with custom minimal composition
                         → typed gateway-tools plugin
                              → authenticated CapabilityGateway RPC
```

The adapter package lives outside the root pnpm workspace:

```text
integrations/deepseek-harness-adapter/
  package.json
  pnpm-lock.yaml
  src/
  config/
  Dockerfile
  third-party-notices/
  test/
```

Pin:

- exact upstream repository commit and release version;
- Harness package closure and lockfile;
- custom composition/plugin inventory;
- container image digest and base image;
- provider adapter configuration;
- third-party licenses and vulnerability scan result.

Do not import `@deepseek-ai/*` from `apps/web`, `apps/worker`, root workspace
packages, or the browser bundle.

The adapter owns its pnpm 11 install, build, lockfile, Linux image, and
JSON-RPC client. BusinessGenerator sees only its own `DeepSeekHarnessRuntime`
client interface and structured application result.

## 3. Mandatory isolation rules

### 3.1 Process and working directory

For every authorized operation:

1. start one root Harness session bound to one workspace, venture, actor, and
   operation;
2. use an empty operation-specific scratch directory, never the repository,
   project folder, object-store mount, founder device, or durable venture store;
3. launch the JSON-RPC process from the cofounder worker with a complete
   application-owned config;
4. replace the child environment with a small explicit allowlist;
5. send the bounded context packet and founder request;
6. collect only safe lifecycle/result signals;
7. validate the final structured result in BusinessGenerator; and
8. stop the child and remove the scratch directory before the operation becomes
   terminal.

The parent environment must not leak `DATABASE_URL`, Better Auth/session data,
cloud profiles, provider-secret envelopes, repository `.env`, user home,
`$DSH_HOME`, object-store credentials, or raw feature flags.

`session/prompt` is an enqueue acknowledgement, not a causally isolated reply,
and the JSON-RPC protocol has no prompt-level cancellation. The host waits only
for the operation’s terminal idle condition, uses one process/session per
operation, and maps application cancellation/timeout to process teardown. It
never multiplexes another operation into the same process because session
events are not tenant-filtered.

### 3.2 Minimal custom composition

Start from an empty plugin list. Do not load a default coding-agent profile and
attempt to disable dangerous plugins later.

Do not use `dsh-base`, the Web or headless profile, the Python zero-config SDK,
the JSON-RPC demo composition, or the agent-spine demo as a starting point.
Those profiles/compositions inherit coding-agent capabilities such as
persistence, credentials, filesystem, shell, jobs, skills, or subagents.
Relying on a runtime `disabled` flag to neutralize an inherited plugin is not
an acceptable safety control.

The P0 composition may contain only:

- JSON-RPC server transport with protocol-clean stdout;
- in-memory ephemeral session support;
- one model adapter selected by application policy;
- minimal prompt/agent-loop components;
- bounded timeout/retry/token-meter components that do not export raw content;
- a structured-result adapter; and
- one custom `gateway-tools` plugin.

Boot must emit a machine-readable plugin inventory to an internal test channel.
The adapter fails closed if the inventory contains any forbidden capability.
Its system prompt must disable Harness identity/runtime-context injection and
use only the application-owned co-founder instruction set.

### 3.3 Forbidden Harness capabilities

The composition must prove the absence of:

- Bash, PowerShell, terminal, PTY, code mode, code runtime, or self-modification;
- local/sandbox filesystem, file search/editor, workspace instructions, skill
  loading, home-directory settings, or local credential store;
- JSONL/SQLite session persistence for founder or business context;
- web UI, browser, web fetch/search, MCP client, raw connector configuration,
  or arbitrary user-provided MCP;
- jobs, workflows, Ralph, teams, subagents, descendant sessions, or
  background autonomous work;
- direct database, object store, secret store, session cookie, or internal
  service credential access;
- ambient provider fallback through inherited credentials; and
- telemetry export that can carry raw session events, prompts, attachments, or
  tool payloads.

Harness’s in-turn approval is not accepted as a durable founder approval. The
application remains responsible for proposal review and accepted-version
creation.

## 4. Gateway bridge

Harness cannot receive general application credentials. The custom plugin calls
an application-owned RPC gateway using a short-lived operation credential.

The credential must be:

- audience-bound to the gateway;
- scoped to one workspace, venture, actor, operation, and capability list;
- expiring before the operation deadline;
- revocable on cancel/terminal state;
- unusable against database, identity, object store, provider-secret, or raw
  connector APIs; and
- independently authorized by `CapabilityGateway` on every call.

The RPC transport may use a local socket/pipe or a loopback network service
with authenticated encryption; the P0 spike chooses one and demonstrates it
cannot be reached by another tenant or process without the scoped credential.
Do not tunnel a raw tRPC session, browser cookie, or database connection into
the child.

Initial model-facing capabilities are intentionally small:

1. `venture.readCurrentState` or a no-network echo capability in P0;
2. `venture.readCurrentState` in P1, with evidence read/draft enabled only
   after the application can preserve real citations;
3. `proposal.createDraft` in P2.

No capability can accept a record, transition a journey stage, send/publish,
charge, schedule, write an external system, or broaden its own permission.

## 5. Session, event, and telemetry policy

### 5.1 Protocol, provider, and logging constraints

`dsh-jsonrpc-agent` stdout is protocol-only; diagnostics go to a controlled
stderr channel. A console logger, headless text output, or Web host must never
share stdout with JSON-RPC.

The P0 provider is explicitly selected by application policy. Harness’s
JSON-RPC initialization has a DeepSeek-specific fallback, while the existing
application relies on Vercel AI SDK providers and may use Bedrock IAM. Do not
permit ambient provider fallback or inject ambient AWS credentials into the
child. A non-DeepSeek provider route is eligible only after the Linux image
and short-lived credential design prove it can satisfy the environment
allowlist.

Harness sessions are transient execution state. A new process resumes from the
application’s accepted record, bounded summaries, selected evidence, pending
proposal, and operation state—not from Harness files.

Map only:

```text
operation lifecycle
runtime/provider/model version
safe capability name and outcome category
duration, queue latency, retry count
token/cost totals
schema validation outcome
```

Never map:

- chain-of-thought/reasoning chunks;
- raw prompt, founder message, attachment, record content, or source document;
- raw tool arguments/results;
- provider credentials;
- other session events; or
- plugin topology beyond the internal allowlist assertion.

Application telemetry remains opt-in/redacted according to the existing
observability rules. Harness telemetry stays disabled rather than redacted
after export.

## 6. POC sequence

### P0 — isolated headless structured turn

**Scenario:** Given an accepted record and active Problem stage, the Harness
adapter explains current state, asks one useful clarifying question, and
returns a schema-valid suggested next step.

**No capability is required**, except an explicit non-network test echo or
`venture.readCurrentState` that returns only the scoped fixture.

**Required pass conditions:**

- custom composition starts with no forbidden plugin/capability;
- no descendant session, workflow, or child agent occurs;
- child environment replacement prevents secret inheritance;
- no Harness file is written under a venture store or user home;
- no raw telemetry leaves the process;
- only the configured provider is reachable;
- process kill/timeout leaves accepted record state unchanged;
- result passes `CofounderRuntimeResultSchema`; and
- Linux production image succeeds. Windows may use the Node JSON-RPC path for
  local development only; the unsupported bundled Python runtime is not a
  production carrier.

### P1 — one safe application capability

Start with `venture.readCurrentState`, which returns only the already scoped
application fixture. Add `evidence.searchApproved` only after the application
can return real citations and provenance. P1 has no raw web-read exception and
may not claim research succeeded when the source adapter has no cited result.

**Required pass conditions:**

- invalid/foreign venture references fail closed;
- returned state/citation references exist in the scoped application fixture;
- capability timeout/cancel cannot create a duplicate draft;
- the adapter cannot invoke a second/unregistered capability; and
- an evidence draft, when enabled, is never presented as validation.

### P2 — durable proposal bridge

Add `proposal.createDraft` through the gateway. It creates a normal
application proposal and reaches accepted state only through the existing
founder review flow.

**Required pass conditions:**

- one tool call creates one reviewable proposal with current/proposed content,
  rationale, uncertainty, and affected sections;
- keep-current/reject leaves record state unchanged;
- accepting selected changes creates the normal immutable record version;
- crash/cancel/retry cannot duplicate a proposal; and
- a new Harness process resumes from application state, not a persisted
  Harness session.

## 7. Test matrix

| Concern | Required proof |
| --- | --- |
| Context isolation | An operation cannot access another workspace/venture context. |
| State authority | Harness cannot write accepted state or stage state without application command and founder approval. |
| Tool isolation | Shell, filesystem, MCP, browser, unregistered capability, and external write attempts fail closed. |
| Secret isolation | No database URL, server environment, session cookie, cloud profile, or user-home credential reaches the child. |
| Session isolation | No child/descendant session; no durable Harness business session file. |
| Cancellation | Killing the child leaves no partial accepted mutation and returns a recoverable operation. |
| Idempotency | Duplicate submit/delivery/tool call returns original operation/proposal only. |
| Observability | Product/telemetry events contain safe metadata only. |
| Deployment | Exact container and adapter build reproducibly run on the target Linux service image. |
| Supply chain | Pinned commit, license inventory, dependency scan, and image scan pass review. |

## 8. Adoption decision

Promote `DeepSeekHarnessRuntime` only when P0–P2 pass **and** it:

1. remains behind `CofounderRuntime`;
2. is no less safe than the direct adapter;
3. offers a measured capability or complexity advantage over direct runtime;
4. has repeatable Linux deployment, patching, and rollback procedures;
5. has bounded cost, timeout, cancellation, and provider-failure behavior;
6. passes tenant/tool/session/secret isolation tests in CI; and
7. adds no founder-facing Harness language, UI, controls, or persistent memory.

If any condition fails, explicitly reject the adapter, remove its feature flag
and deploy artifact, and keep `DirectAiSdkRuntime`. Rejection is a successful
outcome of this evaluation and does not delay the founder product.
