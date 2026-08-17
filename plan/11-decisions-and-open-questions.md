# Decisions, trade-offs, and open questions

## 1. Confirmed design decisions

### D1 — The product is a contractor, not an agent marketplace

The user interacts with one coherent system. Specialist agents are internal capabilities selected by the orchestrator.

**Reason:** agent directories create cognitive load and encourage roleplay instead of progress.

### D2 — CompanyPack is the source of truth

Chat, artifacts, retrieval indexes, and agent memories are projections or inputs. Accepted pack revisions are canonical.

**Reason:** plans, slides, numbers, and operating playbooks must remain consistent and exportable.

### D3 — Use a durable gated graph plus budgeted sprints

The company journey is durable and gate-controlled. Each bounded work burst uses orchestrator-worker behavior with explicit ledgers.

**Reason:** the app needs human pauses, retries, re-planning, and evidence gates; an unbounded chat loop cannot provide those reliably.

### D4 — Use Vercel AI SDK as the model/tool interface

The AI SDK handles provider-neutral generation, streaming, tool loops, and UI transport. It does not own domain persistence, approvals, or durable workflows.

**Reason:** this preserves the user’s TypeScript/Vercel preference without coupling core business state to a model SDK.

### D5 — Critic is a separate execution context

The generator cannot grade its own work. The critic reads files, pack snapshots, evidence, and a rubric.

**Reason:** self-evaluation is too generous when the same context wrote the result.

### D6 — Code mode is computation, not authority

Code mode can transform approved data and calculate bounded results. It cannot directly access secrets, databases, or side effects.

**Reason:** generated code and its inputs are untrusted; current code-mode approval boundaries are not sufficient for arbitrary side effects.

### D7 — Evidence gates are functions

Gate A, B, and C are evaluated from structured pack data. An LLM can recommend a waiver, but the founder must record it.

**Reason:** “consensus” should not convert weak evidence into a passed gate.

### D8 — Web and mobile share the domain, not the layout

Both clients use the same API, permissions, pack, events, and approvals. Web is optimized for dense work; mobile is optimized for capture and decisions.

**Reason:** platform-specific ergonomics matter, but divergent business logic would create trust-breaking inconsistency.

### D9 — Provider fallback is explicit

The app never silently changes from a user’s provider or privacy mode to managed credentials.

**Reason:** fallback changes cost and data trust boundaries.

### D10 — Export is a product feature

Users can export the structured pack and its evidence manifest.

**Reason:** the founder should own the work and remain able to review it independently.

## 2. Important trade-offs

### AI SDK versus a dedicated agent framework

**Choice:** start with AI SDK primitives and a domain-specific orchestration layer. Add a specialized framework only if it solves a measured problem.

**Trade-off:** more workflow code is owned by the product team, but the system avoids framework leakage into the data model and keeps provider choice flexible.

### PostgreSQL plus vector search versus a separate knowledge graph

**Choice:** start with relational records, full-text search, and vector retrieval. Represent relationships explicitly in domain tables.

**Trade-off:** a graph database may eventually help with complex relationship exploration, but introducing it before the evidence and pack model is stable creates duplication and synchronization cost.

### Managed gateway versus direct provider connections

**Choice:** support both behind one provider connection abstraction.

**Trade-off:** managed routing simplifies model catalog and failover; direct connections give stronger control over credentials, data policy, and provider-specific features.

### Synchronous versus asynchronous workers

**Choice:** synchronous for quick, bounded interactions; asynchronous durable workflows for research, ingestion, rendering, and multi-day work.

**Trade-off:** async behavior is more complex to present, but forcing long tasks into a request/response loop makes failures and resume behavior unreliable.

### Full agent debate versus evaluator pass

**Choice:** evaluator by default; bounded adversarial debate only for high-conflict decisions.

**Trade-off:** debate can surface alternatives, but costs more and can produce conformity or endless conversation.

### Full offline/local mode

**Choice:** design the provider boundary for local endpoints now; defer fully local storage/index/sync.

**Trade-off:** a truly offline product changes storage, notifications, collaboration, retrieval, and artifact rendering. It should be a deliberate product line, not an accidental promise.

## 3. Open questions to answer before implementation

### Product

1. Is the first customer a solo founder, a small founding team, or an advisor serving many founders?
2. Should the initial market be India-first in onboarding and legal content, or globally neutral with an India pack?
3. Which artifact is the first “aha”: evidence report, business model, unit economics workbook, or company pack?
4. What is the smallest founder action the first release must reliably produce?
5. Which professional reviewer role is most valuable first: CA, mentor, lawyer, or investor?

### Data and privacy

1. What document sizes and retention periods are acceptable for the first release?
2. Which data types are forbidden entirely in the initial version?
3. Which providers may process personal interview transcripts?
4. Is private mode a paid feature, a technical policy, or both?
5. What is the required deletion SLA for source documents and derived embeddings?

### Providers

1. Will managed inference be a product revenue line or only a convenience?
2. Should the app use Vercel AI Gateway as the default route or direct provider packages?
3. Which local endpoints must be certified for structured output and tool calling?
4. What is the fallback policy when the selected model lacks a required capability?
5. How should provider-specific web search and code execution be normalized?

### Workflow

1. Which durable workflow product is acceptable for the first deployment?
2. What is the maximum length of a sprint before a human checkpoint is mandatory?
3. Which events need exactly-once side-effect semantics?
4. How should a user edit the pack while a sprint is running?
5. How many retries and replans are useful before the system fails closed?

### Artifacts

1. Which export formats must be high fidelity on day one?
2. Is PPTX generation required immediately, or is a web/PDF deck sufficient for the first release?
3. Which spreadsheet formulas need professional review?
4. Should users be allowed to edit generated artifacts directly, or only edit pack inputs?
5. How should edits made outside the app be re-imported and reconciled?

### Commercial and operations

1. Is usage priced per workspace, sprint, artifact, seat, or provider spend?
2. Will users be allowed to bring arbitrary MCP servers, or only a curated catalog?
3. Who owns support for provider keys and local connectors?
4. When does the operations runtime become a product rather than an experiment?
5. What evidence is required before enabling outbound communication or payment tools?

## 4. Risks to monitor

| Risk | Early indicator | Mitigation |
|---|---|---|
| The app produces plans faster than truth | High artifact volume, low interview/WTP completion | Enforce stage routing and gates |
| Agent conference becomes theatrical | Long traces, little state change | Hide transcripts; measure accepted pack changes |
| Provider abstraction hides capability differences | Tool failures or malformed structured output | Capability matrix and task-specific model profiles |
| Retrieval creates false confidence | Many citations but low locator precision | Retrieval evaluation and source review |
| User data leaks through traces or fallback | Sensitive content appears in logs/provider usage | Data classification, redaction, no silent fallback |
| Artifact drift | Different prices in canvas, sheet, and deck | MoneyRules and dependency invalidation |
| Local model disappointment | Users expect cloud features from a weak endpoint | Capability health check and explicit limitations |
| Scope explosion | ERP, CRM, legal filing, and code builder built before validation | Phase roadmap and vertical-slice gates |
| Human approvals become fatigue | Users approve everything without inspection | Batch only low-risk actions; make high-risk payloads concise and specific |
| Cost becomes unpredictable | Research sprints exceed estimates | Reservations, caps, model routing, and cost meter |

## 5. Working definition of “solid”

The app may describe a model as **solid enough for the next decision** when:

- the problem and beachhead are specific;
- evidence is traceable and sufficient for the current gate;
- alternatives and do-nothing behavior are named;
- MoneyRules are single-sourced and reconciled;
- assumptions are explicit and testable;
- WTP evidence is real or explicitly deferred;
- legal and privacy uncertainties are surfaced;
- the critic has found no unaddressed instant fail;
- the founder understands and accepts the next experiment.

It must not describe a business as guaranteed, validated by simulated users, legally compliant, or investable merely because the generated artifacts look polished.

## 6. Implementation decisions (build)

### I1 — Local Docker Compose vs AWS `dev`

**Choice:** Day-to-day local development uses Docker Compose Postgres + Valkey. AWS `dev` is the shared environment auto-deployed on merge to `main`. Local `.env` stays on Compose URLs (`localhost:5432` / `localhost:6379`) and is not pointed at RDS.

**Reason:** Laptop-to-RDS adds latency, security-group complexity, and idle cost. Compose already matches Milestone 0 and keeps feature work offline-capable. `plan/implementation/14` § Milestone 3 allows either choice; this is the team's.

### I2 — Custom domain and ACM are follow-ups

**Choice:** Milestone 3 serves `dev` on the CloudFront default domain (`*.cloudfront.net`). The ALB origin is HTTP:80 (no ACM certificate on the ALB yet). HTTPS for a custom domain is a later CDK change: ACM on CloudFront (and optionally on the ALB), then `BETTER_AUTH_URL` switches to that hostname.

**Reason:** CloudFront is in front of the ALB from day one (`10` §6). Waiting on a product domain/ACM would block the "hello world on Fargate" risk-reduction step.

### I3 — Worker Fargate service waits for Milestone 4

**Choice:** `EcrStack` creates `foundry-worker`. `EcsStack` in Milestone 3 runs only the `web` service. Worker task definition, Service Connect health port, and queue-depth alarms land with `apps/worker`.

**Reason:** There is no worker image or process yet. An empty Fargate service would fail health checks and burn the same baseline cost as web.

### I4 — Application deploys do not `cdk deploy`

**Choice:** First-time infrastructure is a human `cdk bootstrap` + `cdk deploy` of Network, Data, Ecr, Observability, Ci, then (after the first image is in ECR) Ecs. After that, `.github/workflows/deploy-dev.yml` builds `linux/arm64`, pushes ECR, `RunTask`s the migrate command on the web image, and `update-service`s. The GitHub deploy role cannot create or delete CloudFormation stacks.

**Reason:** `10` §7 and §9: schema must exist before the new tasks start, and CI must not be able to mutate VPC/RDS.

### I5 — First EcsStack deploy needs an image

**Choice:** `EcsStack` references `foundry-web:${webImageTag}` (CDK context `webImageTag`, default `latest`). Push that tag to ECR before the first `cdk deploy` of `Foundry-Dev-Ecs`. Later releases only change the registered task definition in `deploy-dev.yml`.

**Reason:** ECS cannot start a service against an empty repository. Splitting EcrStack from EcsStack is how we break that chicken-and-egg without a dummy public image.
