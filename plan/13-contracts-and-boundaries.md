# Type boundaries and application contracts

## 1. Why these boundaries exist

The app is TypeScript end to end, but sharing a language does not mean sharing every internal object.

Keep these boundaries explicit:

- domain objects are not database rows;
- model messages are not domain commands;
- tool inputs are not provider-specific arguments;
- client read models are not write permissions;
- workflow state is not chat history;
- rendered artifacts are not canonical business state.

The shared TypeScript layer should contain stable concepts and validation rules. Server-only packages should contain secrets, provider adapters, tools, persistence, and workflows. The mobile and web clients should receive safe read models and commands.

## 2. Recommended logical package boundaries

This is a responsibility map, not a required repository layout.

| Package or module boundary | Owns | Must not own |
|---|---|---|
| Shared domain | IDs, value types, status vocabulary, permissions vocabulary, validation rules, pack concepts | Provider SDKs, database clients, secrets |
| Shared UI/domain view models | Evidence cards, sprint cards, artifact summaries, responsive status presentation | Gate decisions, privileged actions |
| Web client | Next.js pages, web navigation, desktop inspectors, web streaming transport | Model credentials, direct tool execution |
| Mobile client | Expo/React Native navigation, capture, push approvals, mobile transport | Model credentials, direct tool execution |
| API/BFF | Authenticated commands, read models, streaming, upload intents, idempotency | Long-running worker ownership |
| Domain services | Pack revisions, gates, MoneyRules, permissions, approvals, budgets | Prompt wording, provider-specific logic |
| Agent runtime | Agent definitions, context assembly, model profiles, structured outputs, tool manifests | Direct database mutation without domain service |
| Workflow runtime | Durable sprint, ingestion, rendering, retry, pause, resume | User-facing business truth |
| Provider adapters | AI SDK providers, capability detection, usage normalization | Product phase or gate logic |
| Tool registry | Tool schema, risk, policy metadata, execution adapter | Bypassing approvals |
| Document intelligence | Parsers, normalized blocks, retrieval, citations | Business-model interpretation |
| Artifact service | Templates, render jobs, previews, exports, dependencies | Independent prices or assumptions |
| Persistence adapters | Database, object storage, search, queues | User authorization decisions |

## 3. Type families

### Entities

Have stable identity and lifecycle:

- `Workspace`;
- `Project`;
- `CompanyPack`;
- `Sprint`;
- `EvidenceItem`;
- `Assumption`;
- `Experiment`;
- `Artifact`;
- `ProviderConnection`;
- `IntegrationConnection`.

### Value objects

Are meaningful only by their values:

- `NumericClaim`;
- `MoneyAmount`;
- `Provenance`;
- `CitationLocator`;
- `TimeWindow`;
- `CostEstimate`;
- `AccessScope`;
- `VersionRef`;
- `RiskClass`.

### Commands

Represent an intentional request to change state:

- create workspace;
- create project;
- answer clarification;
- propose pack change;
- accept pack revision;
- open sprint;
- pause or stop sprint;
- approve action;
- reject action;
- upload document;
- start ingestion;
- generate artifact;
- export pack;
- connect provider;
- rotate credential;
- record interview;
- record WTP event;
- evaluate gate;
- record waiver.

Commands require actor, scope, idempotency key, and expected version where a concurrent edit is possible.

### Events

Represent facts that already happened:

- project created;
- pack revision accepted;
- source registered;
- quote extracted;
- assumption transitioned;
- sprint started;
- worker completed;
- tool blocked;
- approval granted;
- gate evaluated;
- artifact marked stale;
- provider fallback used.

Events should be immutable and versioned. They are used for audit, projections, notifications, and replay.

### Queries and read models

Queries are optimized for a screen or workflow:

- Founder Desk summary;
- mobile next-action view;
- web evidence matrix;
- sprint activity view;
- pack section view;
- approval queue;
- artifact dependency view;
- cost/usage summary.

Read models may denormalize data. They must show the source revision and update time.

### Proposals

Agents and extractors return proposals rather than authoritative updates:

- proposed pack change;
- proposed evidence item;
- proposed assumption transition;
- proposed gate recommendation;
- proposed artifact;
- proposed tool call;
- proposed decision.

Every proposal includes source snapshot, actor/run, schema version, expected pack revision, confidence, and validation status.

## 4. API surface categories

The external API should be organized around user intent rather than internal agent names.

### Project and pack

- create and list workspaces;
- create and archive projects;
- read current pack;
- read pack diff;
- answer founder question;
- accept/reject proposed revision;
- add founder assertion;
- export pack.

### Work

- preview sprint;
- approve sprint plan;
- start sprint;
- read sprint activity;
- pause, resume, stop sprint;
- retry failed task where safe;
- read next action.

### Evidence

- create upload intent;
- register URL;
- read source status;
- search evidence;
- inspect citation;
- add interview;
- review quote;
- delete or redact source.

### Decisions and approvals

- list pending decisions;
- read approval payload;
- approve or reject;
- record waiver;
- record founder decision;

### Artifacts

- list artifact versions;
- generate or regenerate;
- preview;
- export;
- share with selected scope;

### Providers and integrations

- list provider connections;
- connect and validate;
- set model profile policy;
- set privacy mode;
- connect integration;
- revoke connection;

The API should not expose “run agent X” as the primary user contract. Specialist selection is an internal orchestration decision.

## 5. Stream event vocabulary

Streaming responses should use semantic events:

| Event | Meaning |
|---|---|
| `message_started` | User-facing response began |
| `text_delta` | Safe text fragment |
| `question_ready` | Clarification is ready for the founder |
| `tool_planned` | Tool is proposed with risk and scope |
| `tool_started` | Approved or auto-approved tool began |
| `tool_progress` | Safe progress update |
| `tool_completed` | Tool returned a result summary |
| `evidence_found` | Candidate evidence is available |
| `proposal_ready` | Pack/artifact/decision proposal is ready |
| `approval_required` | Workflow paused for approval |
| `sprint_progress` | Durable work status changed |
| `artifact_ready` | Preview or file is available |
| `warning` | Unverified, stale, conflict, or budget warning |
| `blocked` | Policy, evidence, or provider blocked progress |
| `message_completed` | User-facing response finished |

Do not stream raw provider objects directly to clients. Normalize them into stable UI events.

## 6. Versioning rules

- Domain command and event schemas are versioned.
- Client read models may evolve independently from storage.
- Model/provider messages are treated as integration details.
- Tool input/output schemas are versioned and retained for replay.
- Artifact templates are versioned.
- Pack revisions are immutable.
- Migration must preserve source and provenance links.

When a breaking change is required, support both versions during a migration window or provide an explicit export/import migration.

## 7. Error vocabulary

Expose actionable categories:

- unauthorized;
- not found;
- stale revision;
- invalid input;
- missing evidence;
- gate blocked;
- approval required;
- provider unavailable;
- capability unsupported;
- budget exceeded;
- rate limited;
- document rejected;
- artifact render failed;
- policy forbidden;
- workflow paused;
- workflow failed;
- deletion pending.

Each error should include a safe explanation, retryability, next action, and correlation ID.

## 8. Shared client contract

The web and mobile clients should be able to render a project from:

- project summary;
- current phase;
- next action;
- current sprint;
- pending approvals;
- pack section summaries;
- evidence health;
- assumptions;
- artifact summaries;
- budget summary;
- notifications.

The client should not need to understand which specialist agent produced a result in order to render it.
