# DeepSeek Harness adapter

**Status:** conditional proof-of-concept plan  
**Implements:** V4.7 only, after the direct runtime is live  
**Depends on:** [co-founder and capability gateway](04-cofounder-and-capability-gateway.md)
and [DeepSeek Harness evaluation](../16-deepseek-harness-evaluation.md)

## 1. Decision boundary

DeepSeek Harness may become a second implementation of `CofounderRuntime`. It
must not become an in-process dependency, durable memory system, product UI,
tool authority, or orchestration model.

The local source inspected for this plan is `deepseek-harness` `0.1.1-rc.2`.
It is a developer-preview coding-agent system with plugin defaults that can
mount shell, filesystem, session persistence, credentials, MCP, web, jobs, and
subagents. Its TypeScript 6 / pnpm 11 workspace must remain separate from this
repository's TypeScript 5.9 / pnpm 10 workspace.

The decision to adopt it is conditional. The direct provider adapter is the
baseline. If the Harness adapter is less safe, less reliable, or more complex,
do not adopt it.

## 2. Reserved architecture seam

v4 makes space for the adapter through a stable process boundary:

```text
apps/web request or apps/worker operation
  → CofounderService
  → CofounderRuntime interface
      ├─ DirectAiSdkRuntime                 ← default, first
      └─ DeepSeekHarnessRuntime             ← optional, later
           → isolated Linux worker/sidecar
              → dsh-jsonrpc-agent
                 → custom minimal Cordis composition
                    → custom gateway-tools plugin
                       → authenticated CapabilityGateway RPC
```

Expected code ownership once P0 is approved:

| Location | Responsibility |
| --- | --- |
| `packages/agent-runtime/src/runtime/` | Portable runtime interfaces, direct adapter, common response validation, and an interface-level Harness client. |
| `apps/worker/src/cofounder/` | Operation execution, spawn/timeout/cancel policy, redacted event mapping, and gateway-token issuance. |
| `apps/web/server/services/` | `CofounderService`, `ContextService`, `CapabilityGateway`, proposal/record authorization, and audit. |
| `integrations/deepseek-harness-adapter/` | Separately built Harness adapter source, custom Cordis composition, gateway plugin, lockfile, container build, and license inventory. It must not join the root pnpm workspace. |

Do not create the `integrations/deepseek-harness-adapter/` build artifact until
V4.5 is working. The interface and worker boundary are the “space” needed now.

## 3. Process and protocol rules

Use the harness JSON-RPC agent as an isolated child process or sidecar, not its
Web host, headless profile, Python zero-config SDK, ACP path, or default
`dsh-base` composition.

For each authorized `CofounderOperation`:

1. create one root harness session bound to one venture, actor, and operation;
2. spawn the JSON-RPC binary from the worker with an app-owned config;
3. replace—not merge—the child environment with a small allowlist;
4. set an empty scratch working directory that is not the repository, project
   folder, object store mount, or venture record;
5. send the bounded context packet and founder request;
6. collect protocol events only through the operation's terminal idle state;
7. validate the structured result inside BusinessGenerator;
8. create a draft/proposal only through application commands; and
9. shut down or kill the child before the operation ends.

`session/prompt` is an enqueue acknowledgement rather than a causally isolated
reply, and JSON-RPC has no prompt-level cancellation. Never reuse sessions
across operations or ventures. Cancellation and timeout mean process teardown,
followed by application-level recovery.

## 4. Minimal custom composition

Build from an empty plugin list. Do not inherit a shipped coding-agent profile
or rely on a runtime `disabled` flag to neutralize inherited capabilities.

The P0 composition may contain only:

- JSON-RPC server transport with protocol-clean stdout;
- an in-memory session;
- one explicit model adapter and model policy;
- minimal prompt/tool/agent-loop components;
- a local timer/retry/token-meter implementation if it does not emit sensitive
  content; and
- one custom plugin that calls the BusinessGenerator capability gateway.

The composition must omit and assert absent:

- Bash, PowerShell, persistent PTY, terminal, code runtime, or code mode;
- local/sandbox filesystem, file search/editor, workspace instructions, skills,
  `$DSH_HOME` settings, and local credential stores;
- JSONL/SQLite session persistence for business context;
- browser, web search/fetch, MCP client, raw connector configuration, or web
  UI;
- jobs, workflow, Ralph, self-modification, agent teams, subagent providers,
  subagent tools, and descendant-session behavior;
- telemetry export and anonymous home-directory identity; and
- automatic provider fallback through ambient credentials.

At boot, emit a machine-readable plugin inventory to an internal test-only
channel. Fail P0 if a forbidden plugin, child session, filesystem, shell,
telemetry, or unauthorized network dependency appears.

## 5. Gateway tools and secrets

JSON-RPC does not provide a safe reverse tool callback into the parent process.
Model-facing tools must therefore live in the isolated adapter but call
BusinessGenerator over authenticated RPC.

The gateway token is:

- short-lived and audience-bound;
- scoped to one workspace, venture, actor, operation, and capability set;
- unable to reach database, object, secret, identity, or arbitrary connector
  APIs; and
- invalid after operation completion or cancellation.

The child environment is an explicit allowlist such as `PATH`, `NODE_ENV`,
the app-owned config path, a selected provider credential or short-lived
provider token, gateway endpoint, and operation credential. It never inherits
`DATABASE_URL`, Better Auth/session data, cloud profiles, generic app
environment, repository `.env`, `$DSH_HOME`, or user home credentials.

The gateway repeats actor/venture authorization and enforces schema, risk,
budget, timeout, idempotency, and audit rules. Harness in-turn approval cannot
replace durable founder proposal review.

## 6. Event, persistence, and observability policy

Harness session memory is ephemeral execution state. BusinessGenerator resumes
from its record, summaries, proposals, and activity history in a new session.
Do not mount Harness JSONL or SQLite persistence for venture data.

Map only this safe subset to application activity/telemetry:

```text
operation started / waiting / completed / failed / canceled
selected model and runtime version
safe capability name and outcome category
duration, token totals, cost totals, retry count
schema-validation result
```

Drop assistant reasoning chunks, system prompts, founder messages, raw
attachments, tool arguments/results, other-session events, source documents,
and provider credentials. Disable Harness telemetry rather than attempting to
redact its raw session export after the fact.

## 7. Proof-of-concept phases

### P0 — isolated headless turn

Scenario: given an accepted record and active Problem stage, explain current
state, ask one useful clarifying question, and return a structured proposed
next step. No tool is needed, or use one non-network echo tool.

Pass only when the intended Linux service image proves:

- the custom composition has no forbidden plugins;
- there are no descendant sessions;
- child environment replacement prevents app and database secret leakage;
- no session file is written under the venture store or user home;
- no raw telemetry leaves the process;
- a process kill leaves accepted record state unchanged; and
- the selected provider works without ambient home-directory credentials.

Windows development may use the Node JSON-RPC path for local validation, but
the Linux production image is the P0 gate. Do not use the unsupported bundled
Python runtime as a production carrier.

### P1 — one read-only/citation-preserving capability

Add one `readCurrentState` or `searchApprovedEvidence` gateway capability.
It may produce a cited evidence draft, but cannot change an accepted record.
Block this phase if the application research adapter still returns empty or
uncited results.

### P2 — durable proposal bridge

Add one `proposal.createDraft` gateway capability. Verify that:

- a tool call creates a reviewable application proposal, not an accepted value;
- reject and keep-current leave record state unchanged;
- a founder acceptance uses the normal version command;
- a kill during the call cannot duplicate a proposal; and
- a new process resumes from application summaries, not harness files.

## 8. Adoption and release gate

Adopt the adapter only when P0–P2 pass and all of the following are true:

1. it remains behind the portable runtime interface;
2. it reduces complexity or offers a measurable capability over the direct
   adapter;
3. the exact upstream commit, license notices, package closure, provider
   configuration, and plugin inventory are pinned and reviewed;
4. its container/service is independently patched, rebuilt, and security
   scanned;
5. cancel, crash, timeout, and provider failure preserve accepted state and
   produce recoverable operations;
6. its tool and tenant isolation tests pass in CI; and
7. no production source imports `@deepseek-ai/*` into `apps/web`, `apps/worker`,
   or the root pnpm workspace.

If any condition fails, retain `DirectAiSdkRuntime` and close the evaluation.
The founder journey remains fully supported either way.
