# Domain model

## 1. Modeling rules

The domain model is designed around a versioned company journey, not around conversations or agent personas.

1. `CompanyPack` is the canonical business state.
2. Evidence is separate from interpretation.
3. Numbers carry provenance and units.
4. Generated documents, slides, and sheets are projections of a pack revision.
5. Agent outputs are proposals until accepted by a domain service or founder.
6. Every object is tenant-scoped through a workspace or project relationship.
7. Records that support audit or provenance are append-only or versioned.
8. Identifiers are opaque and stable; user-visible names are not identifiers.
9. Timestamps are stored in UTC; the project also stores a display timezone.
10. Deletion is policy-driven. Evidence may require a tombstone rather than silent removal when it is referenced by a decision or artifact.

## 2. Aggregate roots

### Workspace

The collaboration and billing boundary. It owns members, provider connections, budgets, policies, integrations, and projects.

Important properties:

- display name;
- owner;
- plan and usage limits;
- default provider policy;
- default data retention policy;
- locale and timezone;
- status.

### Project / Venture

A founder’s business journey within a workspace. It owns the current pack pointer, phase, goals, constraints, and project-level permissions.

Important properties:

- name and description;
- geography and jurisdiction;
- business category;
- founder objective: bootstrap, venture, grant, loan, lifestyle, or undecided;
- current phase;
- current `CompanyPack` revision;
- current risk and evidence summaries;
- archived status.

### CompanyPack

The canonical aggregate for the business model. It is a versioned collection of structured business facts, hypotheses, evidence links, assumptions, decisions, gates, and artifact references.

It should support:

- immutable revisions;
- diff between revisions;
- accepted, draft, rejected, and superseded states;
- source revision and actor for every field change;
- an exportable JSON representation;
- derived human-readable views.

Do not store the entire pack as an unvalidated JSON blob. Use relational entities for important records and maintain a versioned pack projection for export and context assembly.

### Sprint

A bounded unit of agent work. It owns its contract, budget reservation, worker tasks, progress ledger, tool calls, approvals, outputs, checks, and closure reason.

### Artifact

A generated or imported deliverable with a type, source revision, rendering job, citations, version, and current/stale status.

## 3. Core entity catalogue

### Identity and collaboration

| Entity | Purpose | Relationships |
|---|---|---|
| User | Human identity and account preferences | Belongs to many workspaces through memberships |
| WorkspaceMembership | Role and access boundary | Connects user to workspace; may have project overrides |
| ProjectMembership | Optional project-specific permission | Connects user to project |
| WorkspacePolicy | Data retention, provider, tool, and approval defaults | Belongs to workspace |
| NotificationEndpoint | Push, email, or in-app delivery target | Belongs to user; scoped by workspace consent |

### Journey and business model

| Entity | Purpose | Relationships |
|---|---|---|
| Phase | Current and historical journey position | Belongs to project; references gates and transitions |
| Problem | Specific customer problem statement | Belongs to pack revision; linked to evidence and assumptions |
| Beachhead | Narrow first customer segment | Belongs to pack revision; linked to persona, DMU, market, and interviews |
| Persona | Behavioral and contextual customer profile | Belongs to beachhead; must cite evidence |
| DMU | Decision-making unit | Belongs to beachhead; contains user, champion, buyer, approver, veto, and procurement roles |
| Alternative | Existing substitute, workaround, or do-nothing behavior | Belongs to project; linked to problem and competitor research |
| Competitor | Named provider or substitute with comparable evidence | Belongs to project; linked to sources and wedge analysis |
| Wedge | Specific reason the initial offer could win | Belongs to pack revision; linked to alternatives, evidence, and assumptions |
| MarketModel | Bottom-up market-sizing model | Belongs to pack revision; contains formulas, inputs, filters, and source links |
| BusinessModel | Who receives value, who pays, unit of sale, delivery mechanism, and revenue pattern | Belongs to pack revision; references `MoneyRules` |
| MoneyRules | Canonical price, units, currency, billing, cost, and revenue logic | One current object per project revision; all artifacts reference it |
| UnitEconomicsModel | Margin, CAC, LTV, payback, and sensitivity calculations | Belongs to pack revision; references MoneyRules and numeric assumptions |
| Offer | Customer-facing package and promise | Belongs to business model; linked to price and WTP experiments |

### Evidence and learning

| Entity | Purpose | Relationships |
|---|---|---|
| Source | Registered external or founder-provided source | Has many source snapshots and citations |
| SourceSnapshot | Immutable fetched or uploaded version | Belongs to source; includes hash, time, and parser metadata |
| Document | A logical uploaded or generated document | Has one or more source snapshots and content blocks |
| ContentBlock | Normalized text, table, image, or structured data segment | Belongs to document snapshot; indexed for retrieval |
| Citation | Locator connecting a claim or artifact statement to a source block | Belongs to source snapshot; referenced by claims and artifacts |
| EvidenceItem | Interpreted evidence record | References one or more sources, quotes, events, or documents |
| Interview | Human conversation record | Belongs to project; contains consent and participant metadata |
| Quote | Verbatim excerpt from an interview or document | Belongs to interview or source snapshot; may support evidence |
| Assumption | Explicit claim that can be tested | Belongs to project; linked to evidence, experiments, and decisions |
| Experiment | Planned test with hypothesis, method, threshold, and result | Belongs to project; tests one or more assumptions |
| WTPEvent | Concrete willingness-to-pay signal | Belongs to an experiment or offer; identifies friend/stranger status and instrument |
| MetricDefinition | Measurement name, unit, source, and calculation | Belongs to project; used by experiments and Gate C |
| MetricObservation | Time-stamped observed value | Belongs to a metric; may support a gate or decision |

### Execution and governance

| Entity | Purpose | Relationships |
|---|---|---|
| SprintContract | Objective, scope, checks, workers, budget, and approvals | Belongs to sprint |
| TaskLedger | Facts, guesses, plan, and plan version | Belongs to sprint |
| ProgressLedger | Progress, loop/stall status, next speaker, and instruction | Belongs to sprint; append-only updates |
| AgentDefinition | Role, instructions, capabilities, and policy defaults | Versioned registry record |
| AgentRun | One model execution under an agent definition | Belongs to sprint; records model profile and usage |
| ProposedChange | Structured mutation proposed by an agent | Belongs to an agent run; applies to a pack revision only after validation |
| Decision | Human or system decision with options, evidence, and rationale | Belongs to project; may reference a gate, sprint, or assumption |
| Gate | Configured evidence threshold and evaluation result | Belongs to project phase; may be passed, failed, waived, or deferred |
| ApprovalRequest | Pending permission for a side effect or high-risk choice | Belongs to project and action; has decision and expiry |
| Policy | Rule for tool, data, provider, or project behavior | Belongs to workspace or project |
| BudgetLedger | Reservations, actual usage, refunds, and limits | Belongs to workspace and optionally project/sprint |
| UsageRecord | Model, tool, storage, or rendering consumption | Belongs to a run, sprint, workspace, and provider |

### Output and integration

| Entity | Purpose | Relationships |
|---|---|---|
| Artifact | Exportable document, slide deck, sheet, dashboard, or pack view | Derived from pack revision and template |
| ArtifactVersion | Immutable rendered or exported file | Belongs to artifact; has object-storage reference |
| RenderJob | Asynchronous conversion or generation job | Belongs to artifact version |
| Template | Versioned document, slide, or sheet structure | Used by artifact generation |
| ProviderConnection | Encrypted reference to managed, BYOK, or local inference | Belongs to workspace or user |
| ModelProfile | Capability and cost policy for a task class | References provider connection and model ID |
| IntegrationConnection | OAuth/API connection to calendar, email, storage, payment, or CRM | Belongs to workspace; tool policy controls use |
| ToolDefinition | Registered capability and risk metadata | Versioned registry record |
| ToolCall | Proposed, approved, executed, blocked, or failed invocation | Belongs to agent run and approval policy |

## 4. Value types

These are reusable conceptual types. They should be represented consistently across all entities.

| Value type | Required fields or behavior |
|---|---|
| `Identifier` | Opaque ID, entity kind, creation time |
| `Provenance` | `founder_asserted`, `workflow_derived`, `externally_verified`, `human_reviewed`, or `unknown`; includes source references and verification time |
| `NumericClaim` | Value, unit, currency if relevant, formula or calculation reference, provenance, source IDs, assumption IDs, and confidence |
| `MoneyAmount` | Decimal value, ISO currency, tax inclusion status, and effective date |
| `TimeWindow` | Start, end, timezone, and whether it is observed or forecast |
| `Confidence` | Confidence label, basis, reviewer, and expiry; never a substitute for evidence |
| `CitationLocator` | Source snapshot ID plus page, paragraph, table, cell, URL fragment, or character range |
| `AccessScope` | Workspace, project, member role, document, or connection scope |
| `RiskClass` | Read, compute, draft, side effect, forbidden |
| `LifecycleState` | State, actor, timestamp, reason, and previous state |
| `VersionRef` | Entity ID plus immutable version/revision |
| `CostEstimate` | Provider, model/tool, input estimate, output estimate, currency, and uncertainty |
| `SchemaRef` | Schema name and version used to validate structured output |

## 5. CompanyPack composition

The pack’s logical sections are:

1. Context and founder constraints.
2. Problem and beachhead.
3. Persona and DMU.
4. Alternatives and competitors.
5. Evidence and source index.
6. Assumptions and experiments.
7. Market model.
8. Business model and MoneyRules.
9. Pricing and unit economics.
10. WTP results.
11. MVBP, out-of-scope, metrics, and kill lines.
12. GTM and first-100 plan.
13. Team, technology, and operating costs.
14. Legal, privacy, and compliance checklists.
15. Launch and operations playbooks.
16. Gates, decisions, waivers, and open risks.
17. Artifact references.

Each section has a status:

- not started;
- draft;
- evidence required;
- review required;
- accepted;
- stale;
- blocked;
- superseded.

## 6. Critical relationships

Use these relationships as invariants:

- One workspace has many projects; one project belongs to one workspace.
- One project has one current accepted pack revision and many historical revisions.
- A pack revision references evidence and assumptions; evidence does not depend on a generated artifact.
- One `MoneyRules` source is referenced by pricing, unit economics, financial views, invoices, and slides.
- An artifact records the exact pack revision and template version from which it was generated.
- If MoneyRules or a cited claim changes, dependent artifacts become stale.
- An assumption may be tested by many experiments; an experiment may test many assumptions.
- A gate evaluates a pack revision and stores the exact rule version and inputs used.
- A sprint may propose many changes, but only accepted changes create a new pack revision.
- Every external claim in a pack or artifact must link to a source, founder input, or explicit assumption.
- Every WTP event identifies the evidence instrument and whether the participant is a friend, known contact, or independent prospect.
- Every approval request references one action payload hash; changing the payload creates a new approval request.

## 7. Lifecycle examples

### Assumption lifecycle

`untested → testing → supported → held`

or:

`untested → testing → contradicted → killed`

An assumption can return to `testing` if the market, price, or customer segment changes. State changes require evidence or a founder decision.

### Artifact lifecycle

`requested → generating → current`

or:

`requested → failed`, `current → stale`, `current → superseded`.

An artifact is stale when any referenced pack revision, MoneyRules version, source snapshot, or template version changes.

### Approval lifecycle

`pending → approved → executed`

or:

`pending → rejected`, `pending → expired`, `approved → execution_failed`.

Execution failure must not be treated as approval failure. The user should be able to retry the same approved payload only when idempotency guarantees make that safe.

## 8. Domain service classes

These are responsibility boundaries, not implementation commitments.

| Service class | Owns |
|---|---|
| `ProjectService` | Project creation, phase, members, archive, and constraints |
| `PackService` | Pack revisions, proposed changes, conflict detection, diffs, and export |
| `EvidenceService` | Sources, quotes, evidence links, provenance, and verification state |
| `AssumptionService` | Assumption creation, ranking, state transitions, and experiment links |
| `GateService` | Gate rules, evaluation, waiver, deferral, and history |
| `MoneyRulesService` | Single-source money configuration and dependent artifact invalidation |
| `ExperimentService` | Experiment plans, WTP events, thresholds, and observations |
| `SprintService` | Sprint contract, worker tasks, progress, closure, and cost settlement |
| `ApprovalService` | Policy evaluation, pending actions, approval, expiry, and audit |
| `PolicyService` | Workspace/project/member/tool/provider permissions |
| `ArtifactService` | Artifact requests, dependency graph, stale status, and export |
| `DocumentService` | Upload intent, parsing state, content blocks, indexing, and deletion |
| `ProviderService` | Provider connections, model profiles, capabilities, and health |
| `ToolRegistryService` | Tool definitions, versions, allowlists, and risk metadata |
| `BudgetService` | Reservations, usage, limits, and provider fallback cost |
| `NotificationService` | In-app, email, and push delivery with consent |

## 9. Pack revision policy

A pack revision should include:

- revision number;
- parent revision;
- actor type and actor ID;
- source sprint or command;
- proposed changes;
- accepted changes;
- validation results;
- gate results;
- dependency invalidations;
- created and accepted timestamps.

The system should support a human-readable diff that answers:

- What changed?
- Why did it change?
- Which evidence supports it?
- Which assumptions were created or killed?
- Which artifacts became stale?
- Did the change alter MoneyRules or gate status?
