# System architecture

## 1. Architectural stance

Use the Vercel AI SDK as the **model interaction layer**, not as the whole application architecture.

The system needs three different kinds of reliability:

1. **Interactive reliability** — stream a response and show tool progress.
2. **Workflow reliability** — pause for a founder, retry a failed worker, resume a sprint tomorrow, and enforce a budget.
3. **Data reliability** — preserve versions, provenance, approvals, and artifact consistency.

The AI SDK is a strong fit for the first concern and parts of the agent loop. A separate durable workflow and persistence boundary is still required for the second and third.

## 2. Logical layers

### Experience layer

Two clients consume the same authenticated application contract:

- Web: React with a Next.js application shell.
- Mobile: React Native with Expo.

The clients render shared concepts — `CompanyPack`, `Sprint`, `Approval`, `Evidence`, `Artifact`, and `Decision` — but may use different layouts and interaction patterns.

The clients must never hold provider secrets, execute privileged tools, or decide whether a gate passes.

### Application/API layer

The application layer is the single entry point for clients and external integrations.

Responsibilities:

- authentication and workspace authorization;
- request validation and rate limits;
- chat and activity streaming;
- commands such as “start sprint”, “approve”, “upload”, “export”, or “revise”;
- read models optimized for mobile and web;
- signed upload/download URLs;
- notification registration;
- idempotency for retries;
- translation between client requests and domain commands.

The application layer should be deployable as TypeScript server code. Interactive routes may stream. Long-running work must be handed to a durable job or workflow boundary.

### Domain layer

The domain layer owns the rules that must not depend on a model:

- pack versioning;
- evidence and provenance;
- MoneyRules single-source enforcement;
- assumption state transitions;
- gate evaluation;
- approval policy;
- artifact staleness;
- budget reservations and usage;
- workspace and project authorization.

An agent may propose a change. The domain layer validates and applies it.

### Agent runtime layer

The agent runtime contains:

- the orchestrator;
- specialist agents;
- evaluator/critic;
- prompt and instruction versions;
- provider model selection;
- tool allowlists;
- context assembly;
- structured output validation;
- streaming event translation;
- model usage accounting.

The runtime should expose a small internal interface such as “run bounded task with pack snapshot, contract, tools, model profile, budget, and output schema.” It must not let each agent invent its own persistence or approval behavior.

### Workflow layer

The workflow layer handles:

- sprint lifecycle;
- parallel research workers;
- retries and timeouts;
- approval pauses;
- human clarification pauses;
- document ingestion jobs;
- artifact rendering jobs;
- scheduled reminders;
- resume after process or deployment failure;
- maximum rounds, stalls, resets, and spend.

The first implementation may use a hosted TypeScript-friendly workflow provider. A Temporal-compatible abstraction is preferable if the product later requires complex, multi-day, high-volume workflows. The important design decision is durability and explicit state, not a particular vendor.

### Tool layer

Tools are registered capabilities with:

- a stable name and version;
- input and output schema;
- required permissions;
- risk class;
- data access scope;
- cost estimate;
- approval requirement;
- idempotency behavior;
- audit event mapping.

Tools may read, compute, draft, or cause side effects. The policy engine decides which category is allowed for the current sprint.

### Evidence and document layer

This layer owns:

- uploaded files and remote sources;
- MIME detection and safe parsing;
- normalized content blocks;
- OCR and table extraction;
- full-text and vector indexes;
- citations and source snapshots;
- document deletion and retention;
- retrieval context assembly.

It is deliberately separate from agent memory. A source remains inspectable and reusable even when the model or prompt changes.

### Persistence layer

Recommended first storage shape:

| Need | Recommended responsibility |
|---|---|
| Relational source of truth | PostgreSQL for users, workspaces, projects, pack versions, evidence metadata, decisions, approvals, runs, and usage |
| Raw and generated files | Object storage such as S3-compatible storage, Vercel Blob, or equivalent |
| Retrieval | PostgreSQL full-text plus vector extension initially; move to a dedicated search service only when scale or retrieval quality requires it |
| Event and audit history | Append-only domain event records in PostgreSQL, with trace identifiers |
| Ephemeral coordination | Queue/cache only for short-lived locks, rate limits, and streaming fan-out |
| Secrets | Managed secret store or encrypted database fields backed by a key-management service |

The canonical pack should be reconstructable from relational records and immutable artifact/source references. A JSON export is a view of the pack, not the only database.

## 3. Recommended deployment shape

### Web and API

Use a Next.js web application for the web experience and API/BFF routes. Keep the server runtime on Node for orchestration, provider adapters, file operations, and code mode. Use Edge only for deliberately simple, low-risk streaming or caching paths after measurements prove it is safe.

### Mobile

Use Expo and React Native for the mobile client. Mobile calls the same HTTPS API and stream endpoint as web. The mobile client does not call model providers directly.

Mobile uploads should use short-lived signed URLs, then notify the API that an upload is complete. This avoids sending large files through the mobile JavaScript process.

### Workers

Run long tasks outside the request lifecycle:

- conference sprints;
- multi-source web research;
- ingestion and indexing;
- PDF/OCR/table extraction;
- document, slide, and spreadsheet rendering;
- scheduled digests;
- notification delivery.

Each worker receives a job identifier and a versioned input snapshot. It reports progress events and writes proposed outputs or artifacts through domain services.

## 4. Request and workflow paths

### Interactive founder message

1. Client sends a message with project ID, optional attachments, and client idempotency key.
2. API authenticates the user and checks project access.
3. API assembles a compact context: current phase, next action, relevant pack summary, open approvals, and selected evidence.
4. Orchestrator decides whether to answer, ask a clarification, call a bounded agent, or open a sprint.
5. AI SDK streams text, structured cards, tool progress, and proposed changes.
6. Domain services validate proposed changes.
7. Client receives a final summary and any pending approval or next action.

### Budgeted conference sprint

1. Orchestrator creates a `SprintContract`.
2. Budget service reserves the maximum permitted model and tool spend.
3. Workflow starts a durable sprint.
4. Workers run in parallel only when their inputs and writes are independent.
5. Workers write evidence or draft artifacts; they do not overwrite canonical truth blindly.
6. Critic reads the resulting snapshot in a separate context.
7. Code gates, provenance checks, and financial checks run.
8. Workflow pauses for approval, asks for clarification, revises, closes, or fails closed.
9. Budget is settled against actual usage.
10. The founder receives a compact digest and links to changed artifacts.

### Document ingestion

1. Client creates an upload intent.
2. API returns a signed upload target.
3. File is uploaded to object storage.
4. Ingestion job validates file type, size, malware status, and tenant scope.
5. Parser creates normalized blocks and metadata.
6. Extractor identifies tables, claims, numbers, and candidate citations.
7. Indexer creates lexical and vector retrieval records.
8. Evidence Librarian can cite the document in the pack.
9. Client receives progress and a reviewable extraction summary.

## 5. State ownership

| State | Owner | Mutability |
|---|---|---|
| Chat transcript | Conversation service | Append-only, user-visible |
| CompanyPack | Domain service | Versioned proposals become approved revisions |
| Agent instructions | Prompt registry | Versioned and immutable once used |
| Sprint ledger | Workflow service | Versioned progress updates |
| Tool execution | Tool/audit service | Append-only execution record |
| Source file | Object storage + source registry | Immutable snapshot; deletion creates a tombstone |
| Search index | Indexer | Rebuildable projection |
| Artifact | Artifact service | Immutable versions; current pointer may move |
| Usage and budget | Usage ledger | Append-only usage, controlled budget state |
| Approval | Approval service | Append-only request and decision |

## 6. Event categories

Use domain events to update read models and make long-running work observable. Important events include:

- project created;
- phase changed;
- pack revision proposed;
- pack revision accepted or rejected;
- source registered or deleted;
- document ingestion started, completed, or failed;
- evidence extracted;
- assumption state changed;
- sprint opened, paused, resumed, stalled, replanned, or closed;
- gate evaluated;
- approval requested, approved, rejected, or expired;
- tool proposed, executed, blocked, or failed;
- artifact created, regenerated, or marked stale;
- provider connection added, rotated, disabled, or failed;
- usage recorded;
- decision recorded;
- notification sent or failed.

Events should carry workspace ID, project ID, actor type, actor ID, correlation ID, causation ID, and schema version.

## 7. Reliability rules

- Every external tool call has a timeout, retry policy, and idempotency key.
- Every workflow has a maximum duration, round count, stall count, and spend cap.
- Every mutation includes the pack version it was based on.
- A stale mutation must be rejected or explicitly rebased; it must not silently overwrite newer founder work.
- A worker may fail without corrupting the pack.
- An artifact renderer may fail without losing the canonical data.
- A provider failure must produce a clear provider-specific error and a recovery choice.
- A user must be able to stop an active sprint.
- Resuming a sprint must not duplicate payment, email, publishing, or other side effects.
