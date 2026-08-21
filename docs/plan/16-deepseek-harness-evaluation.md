# DeepSeek Harness evaluation and integration boundary

**Status:** proposed proof-of-concept plan
**Date:** 22 August 2026
**Decision:** evaluate as an isolated implementation of the co-founder runtime; do not embed or adopt its default configuration.

## 1. Why this is not a drop-in dependency

The local `deepseek-harness` source contains a configurable, plugin-based agent runtime. Its documented SDK starts a subprocess and communicates over newline-delimited JSON-RPC. Its bundled Python-SDK configuration visibly mounts a model adapter, JSONL session persistence, local Bash, and a local filesystem provider. The default `dsh-base` composition also includes child-agent capabilities. The source and SDK expose descendant-session lifecycle events; the selected composition must prove that no subagent provider or tool is mounted.

Those defaults conflict with the product boundary:

- BusinessGenerator must have one user-facing co-founder and no custom sub-agent architecture.
- The application must own durable business state, policy, approvals, and audit data.
- An agent process must not receive direct database access, an unrestricted shell, or broad filesystem access.
- Model sessions are not the source of truth for founder context.

Therefore “take it as is and plug it in” is not an acceptable implementation path. The harness can be useful only when configured behind an application-owned adapter and with unsafe defaults absent.

## 2. What may be useful

- a provider-independent interactive-agent execution loop;
- durable, checkpointed session mechanics;
- structured JSON-RPC interaction across a process boundary;
- configurable tool registration;
- model-session compaction and resumability;
- observability events that can be mapped to application traces.

These are runtime concerns. They do not replace the journey service, business-record service, context assembler, policy engine, tool gateway, or approval workflow.

## 3. Verified fit and incompatibilities

The local source is DeepSeek Harness `0.1.1-rc.2`, a developer-preview local coding-agent product. Its MIT license is compatible with evaluation and use, but it explicitly makes no compatibility promise. The primary adoption risk is operational instability and ownership of a large runtime fork, not copyleft licensing.

It has useful mechanics: a turn/step loop, tool pre- and post-execution hooks, compaction, session logs, a JSON-RPC SDK, and a fail-closed *in-turn* tool-approval mechanism. It does not model a founder journey, business-record revision, provenance, evidence ledger, decision, or durable role-gated approval.

It also has material incompatibilities:

- Its normal profiles target trusted, single-user coding-agent use cases and may compose Bash/PowerShell, filesystem, browser, MCP, and subagent capabilities.
- Its local JSONL/SQLite session stores, settings, and plaintext home-directory credentials are not a multi-tenant system of record.
- Its built-in approval mechanism is a one-shot, in-turn permission check. It cannot replace application approvals that survive a process restart, show affected state, expire, and require a founder decision.
- Its bundled Python runtime distributions currently target Linux and macOS, not Windows. Its Windows support matrix includes non-blocking and observational gates. This makes local development convenience a poor reason to grant it filesystem or shell access.
- Its TypeScript workspace targets TypeScript 6 and pnpm 11 while this application targets TypeScript 5.9 and pnpm 10. Importing its packages into the web or worker process is not an acceptable proof-of-concept approach.
- Its primary provider path is DeepSeek, while this application uses Vercel AI SDK providers and Bedrock IAM. Bedrock access through the harness's `pi-ai` adapter remains unproven.
- Its JSON-RPC prompt API acknowledges enqueueing, not a causally isolated reply, and has no prompt-level cancellation. Cancelling an in-flight turn requires terminating the child process; the adapter must preserve application state and recover without relying on a partially flushed harness session.
- Its local Web host is not an authenticated, TLS-protected founder surface. The Web UI and its default host must not be embedded, exposed, or used as the product interface.
- Its optional telemetry can export raw session events. Harness telemetry must remain disabled; application observability receives only mapped and redacted lifecycle events.

## 4. Non-negotiable integration boundary

```text
BusinessGenerator API
  └─ CofounderRuntime interface
       └─ DeepSeek Harness adapter
            └─ isolated harness process
                 └─ only application gateway tools over authenticated RPC
```

### The adapter must

- create an application-to-harness session mapping per venture and authorized actor;
- provide a bounded, app-assembled context packet for each turn;
- call only an allowlisted custom configuration;
- run from an application worker or isolated service, never inside a Next.js request process;
- translate harness events into application observability without exposing private reasoning;
- require schema-valid co-founder responses;
- store only the validated result, proposal, and relevant summary in application data;
- replace—not inherit—the parent process environment, using only short-lived, audience-bound credentials needed for the selected operation;
- cancel, time out, and restart the process safely, treating process termination as the JSON-RPC cancellation mechanism;
- attribute model and tool usage to a venture and user-visible operation.

### The harness must not

- connect directly to the application database, object store, workspace directory, or user device;
- use its bundled Bash, local filesystem, browser, MCP servers, or other tools unless the application explicitly supplies a narrower replacement;
- persist authoritative user or venture data in local JSONL session files;
- create descendant agents or run autonomous background work;
- decide authorizations, budgets, state transitions, or proposal acceptance;
- receive secrets other than a narrowly scoped runtime credential necessary to call the application gateway; or
- emit raw session events, prompts, attachments, or hidden reasoning to third-party telemetry.

## 5. Required custom configuration

The proof of concept begins from a minimal configuration, not the default runtime composition:

1. one root co-founder session;
2. no subagent registration or spawning capability;
3. no Bash or PTY;
4. no filesystem provider or workspace-instruction loading;
5. no default JSONL persistence for business context;
6. no arbitrary MCP configuration supplied by an end user;
7. only typed application gateway tools, initially read-only and draft-only;
8. no harness Web host, workspace-instruction/skill loading, workflow, Ralph, agent-team, or self-modification plugin;
9. disabled harness telemetry and no home-directory credential store; and
10. a provider configuration driven by BusinessGenerator policy rather than process environment inherited from a web server.

The exact upstream revision, licensing obligations, dependencies, supported deployment targets, and custom configuration must be recorded before implementation approval.

## 6. Proof-of-concept scope

Use one safe scenario:

> Given a venture with an accepted record and an active `Problem` stage, explain the current state, ask one high-value clarifying question, and return a structured proposal for a founder-sized next step.

The proof of concept may read an app-provided context packet and call one read-only application tool. It must not research the public web, write business state, start a descendant session, call a shell, or perform an external action.

### Phases

1. **P0 — Headless ping:** Start the JSON-RPC runtime with a stripped custom composition, submit one prompt, and collect lifecycle events through idle. Assert that every forbidden plugin is absent, harness telemetry is disabled, the parent environment was not inherited, and the process can be terminated without an accepted state mutation. Validate the isolated process packaging and provider authentication on the intended Linux service image. For Windows development, use the Node/TypeScript runtime path rather than the unsupported bundled Python runtime.
2. **P1 — Read-only research draft:** Allow a bounded web-read or application research capability. Persist only evidence drafts with citations in BusinessGenerator; do not change the accepted record.
3. **P2 — Durable approval bridge:** Have a custom tool create an application approval request for a proposed record revision. Rejecting it must leave the record unchanged; approving it may create a draft revision but never silently accepts it.

Stop evaluation if P0 cannot run with the intended provider, P1 cannot preserve citation/provenance boundaries, or P2 cannot recover correctly after an interrupted process. Descendant-agent and parallel-work features are deliberately excluded: they would reintroduce the architecture this reset removes.

### Test matrix

| Concern | Pass condition |
| --- | --- |
| Context isolation | A session cannot retrieve another workspace or venture's context |
| State authority | The harness cannot modify a record without an application command and founder approval |
| Tool isolation | Attempts to use shell, filesystem, unregistered MCP, or unapproved tool access fail closed |
| Single co-founder | No descendant session or separate user-facing persona is created |
| Resume | A new process can continue from application summaries without relying on local session files |
| Cancellation | Killing an interrupted JSON-RPC process leaves no partial accepted mutation and returns a recoverable application state |
| Cost and audit | Usage and relevant tool events are attributable to the initiating venture operation |
| Failure | Provider or process failure returns a recoverable application error and preserves the active step |
| Deployment | The selected service image supports the target production platform and development workflow |
| Secret isolation | The child has no database URL, workspace credentials, inherited server environment, or founder session cookie |
| Telemetry isolation | No raw harness session event, attachment, or prompt leaves the application telemetry boundary |

## 7. Adoption decision

Adopt the harness only if the proof of concept:

- reduces implementation or operational complexity versus the existing direct model adapter;
- meets every test-matrix condition;
- has acceptable license and supply-chain posture;
- runs in the intended production environment without the bundled unsafe capabilities;
- keeps the application’s `CofounderRuntime` contract portable.

If any condition fails, retain the application contract and implement the co-founder with a simpler provider adapter. The business journey design does not depend on this choice.
