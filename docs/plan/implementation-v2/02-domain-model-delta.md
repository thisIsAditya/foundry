# Domain model delta

**Implements:** `docs/02-product-requirements/04-worker-backend-requirements.md` §2; `01-shared-product-requirements.md` §2.5, §8, §9.
**Package:** `@foundry/domain` (`packages/domain/src`). All new types below follow the existing convention exactly: a TypeScript type plus a `<Thing>Schema` Zod schema, no React/Next/postgres/AI SDK imports, `ids.ts` gets a branded ID per new entity.

## 1. New entities

### `ConversationMessage` (`entities/conversation-message.ts`)

Backs the durable co-founder conversation (shared requirements §6.1; backend requirements §2 "Conversation").

```ts
interface ConversationMessage {
  id: ConversationMessageId;
  projectId: ProjectId;
  actor: 'founder' | 'co_founder' | 'system';
  actorUserId?: UserId;
  text: string;
  blocks: ConversationBlock[];
  references: ConversationReference[];
  visibility: 'founder_visible' | 'internal';
  createdAt: Instant;
}
```

`ConversationBlock` is a discriminated union matching the web requirements §4 response types: `concise_answer | cited_finding | assumption_card | proposed_plan_change | research_plan | founder_task | job_request | draft_action | decision_card | blocker`. Each variant carries only IDs (`jobId`, `founderTaskId`, `evidenceItemId`, `sectionKey`, `revisionId`) plus the minimal display payload — never a denormalized copy of the referenced entity, per modeling rule 3 in `docs/plan/03-domain-model.md`.

`ConversationReference` is `{ kind: 'job' | 'founder_task' | 'evidence' | 'section' | 'revision' | 'decision'; id: string }`, used to render "jump to" links without a join at write time.

### `ConversationSummary` (`entities/conversation-summary.ts`)

```ts
interface ConversationSummary {
  id: ConversationSummaryId;
  projectId: ProjectId;
  summaryText: string;
  coveredThroughMessageId: ConversationMessageId;
  tokenCount: number;
  createdAt: Instant;
}
```

Versioned by insertion order (append-only, like `sprint_progress_events`); the context assembler always reads the latest row. See `05-agent-runtime-and-cofounder-delta.md` §3 for how it is produced.

### `FounderPreference` (`entities/founder-preference.ts`)

Backs backend requirements §2 "FounderPreference."

```ts
interface FounderPreference {
  id: FounderPreferenceId;
  scope: { type: 'project'; projectId: ProjectId } | { type: 'workspace'; workspaceId: WorkspaceId };
  key: string;
  value: unknown;
  sourceMessageId?: ConversationMessageId;
  confidence: Confidence;
  founderConfirmed: boolean;
  createdAt: Instant;
  updatedAt: Instant;
}
```

`key` is a free-text namespaced string (`"customer_type"`, `"risk_tolerance"`, `"geography"`, `"communication_style"`), not an enum — new preference kinds must not require a migration, matching shared requirements §2.5's philosophy that assumptions/preferences are not facts until confirmed. Reuses the existing `Confidence` value object unchanged.

### `FounderTask` (`entities/founder-task.ts`)

Backs backend requirements §2 "FounderTask"; distinct from `ApprovalRequest` per decision D17.

```ts
interface FounderTask {
  id: FounderTaskId;
  projectId: ProjectId;
  title: string;
  explanation: string;
  owner: 'founder';
  linkedJobId?: SprintId;
  linkedSectionKeys: BusinessModelSectionKey[];
  linkedScoreDimensions: ScoreDimension[];
  preparation: FounderTaskPreparation;
  evidenceSchema: FounderTaskEvidenceSchema;
  status: FounderTaskStatus;
  dueOrSuggestedAt?: Instant;
  deferOrSkipReason?: string;
  completionEvidenceRef?: ConversationReference;
  createdAt: Instant;
  updatedAt: Instant;
}
```

`FounderTaskStatus` (new status file, `status/founder-task-status.ts`): `proposed → active → completed`, alternative terminal `deferred | skipped`, matching web requirements §7 ("complete, defer, skip, and discuss"). `FounderTaskPreparation` is `{ script?: string; questionnaire?: string[]; template?: string; helpMessageId?: ConversationMessageId }` — the co-founder's "Help me" output is a `ConversationMessage`, referenced here, not duplicated.

### `ResearchFinding` (`entities/research-finding.ts`)

Backs backend requirements §2 "ResearchSource and ResearchFinding." `ResearchSource` is **not** a new entity — it is the existing `Source`/`SourceSnapshot` pair with two additive fields (see `03-database-schema-delta.md` §3). `ResearchFinding` is new because a finding is a claim derived from one or more sources, distinct from an `EvidenceItem` (which may be founder-asserted, not just research-derived):

```ts
interface ResearchFinding {
  id: ResearchFindingId;
  projectId: ProjectId;
  jobId: SprintId;
  claim: string;
  citationIds: CitationId[];
  confidence: Confidence;
  affectedSectionKeys: BusinessModelSectionKey[];
  conflictsWithFindingIds: ResearchFindingId[];
  staleAt?: Instant;
  extractionMethod: 'web_search' | 'web_fetch' | 'company_profile' | 'academic' | 'market_report';
  createdAt: Instant;
}
```

An accepted `ResearchFinding` is promoted into an `EvidenceItem` when the founder accepts the revision it proposed — findings themselves stay in the research job's record for audit even after promotion.

### `PlanScore` (`entities/plan-score.ts`)

Full spec in `08-scoring-service-spec.md`; the entity shape:

```ts
interface PlanScore {
  id: PlanScoreId;
  packRevisionId: PackRevisionId;
  overall: number;
  dimensions: Record<ScoreDimension, DimensionScore>;
  ruleVersion: string;
  reasons: ScoreReason[];
  topActions: ScoreImprovementAction[];
  calculatedAt: Instant;
}
```

`ScoreDimension` = `customer_clarity | evidence_strength | market_support | business_economics | willingness_to_pay | execution_readiness | risk_control` (new status file `status/score-dimension.ts`). `DimensionScore` = `{ raw: number; weight: number; contribution: number; basis: 'known' | 'insufficient_data' }` — the `insufficient_data` basis is what implements shared requirements §7.1's "missing data is scored as unknown, not as a neutral average."

## 2. Changed entities

### `Sprint` / `SprintContract` → presented as `AiJob` (decision D13)

No new entity file. `entities/sprint.ts` and `entities/sprint-contract.ts` gain fields, all optional for backward read compatibility with existing rows:

```ts
interface SprintContract {
  // ...existing fields unchanged...
  objective: string;        // already present
  whyNow?: string;          // NEW — was missing; shared req §9.2 "why it matters now"
  roleLabel?: string;       // NEW — plain-language work role, e.g. "Market researcher"
  owner: 'co_founder' | 'ai' | 'founder'; // NEW, defaults to 'ai'
  jobKind: 'research' | 'draft' | 'analysis' | 'clarification' | 'synthesis'; // NEW
  parentJobId?: SprintId;   // NEW — supports the co-founder delegating a follow-up job
}
```

A new `read-models/ai-job-summary.ts` in `@foundry/api-contracts` (not `@foundry/domain` — it is a projection, not a domain type) maps `Sprint` + `SprintContract` + latest `AgentRun` + latest `ProgressLedgerEntry` into the `AiJob` shape the web/mobile requirements describe (job card fields in web requirements §6). See `04-backend-services-and-trpc-delta.md` §3.

### `Sprint.status` state machine (decision D20)

`status/execution-status.ts`'s `SprintStatuses` gains the shared requirements §9.1 vocabulary as additional allowed values, and `canTransition` gains the new edges. The mapping from old → new is a pure presentation function, not a data migration:

| Existing value | Product-facing value it now also supports transitioning through |
|---|---|
| `draft` | `proposed` (a previewed-but-not-approved job) |
| `contracted` | `queued` |
| `running` | `running` (unchanged) |
| `paused`/`stalled` | `needs_founder` |
| — (new, no prior equivalent) | `needs_approval` (a side-effect-risk-class output is pending an `ApprovalRequest`) |
| `closed` (success) | `complete` |
| `closed` (blocked) | `blocked` |
| `failed` | `failed` |
| — | `canceled`, `expired` (new terminal values, additive) |

### `Gate` (decision D12)

No schema change. `entities/gate.ts` is unchanged. Only its consumers change: `GateService.evaluate` is called from `ScoringService` instead of from request-blocking middleware. `AppError` code `gate_blocked` is removed from `docs/plan/implementation/05-api-and-backend-architecture.md`'s error map; the `403`/`FORBIDDEN` mapping for that code is deleted from `apps/web/server/trpc.ts`'s error formatter.

### `PackSection` → generalized into `BusinessModelSectionKey` (decision D11)

`entities/pack-section.ts`'s `PackSection` enum (`mvbp | gtm | org_cost | legal | launch`) is superseded as the *complete* list of sections by a new `status/business-model-section.ts`:

```ts
type BusinessModelSectionKey =
  | 'context' | 'problem' | 'beachhead' | 'persona_dmu' | 'alternatives_competitors'
  | 'evidence_ledger' | 'assumptions_experiments' | 'market_model' | 'business_model_money_rules'
  | 'pricing_unit_economics' | 'willingness_to_pay' | 'mvbp_kill_lines' | 'gtm_first_100'
  | 'team_cost_runway' | 'legal_compliance' | 'launch_operate' | 'gates_decisions_artifacts';
```

This is the 17-item list in shared requirements §4, given stable machine keys. The existing narrow `pack_sections` table and its five-value enum are **not** deleted — `mvbp`, `gtm`, `org_cost`, `legal`, and `launch` map 1:1 onto `mvbp_kill_lines`, `gtm_first_100`, `team_cost_runway`, `legal_compliance`, and `launch_operate`. The other 12 keys are backed by the other relational tables listed in `03-database-schema-delta.md` §2's mapping table. No entity file is deleted.

## 3. Value objects — no changes required

`Provenance`, `Confidence`, `NumericClaim`, `MoneyAmount`, `CitationLocator`, `RiskClass`, `AccessScope`, `TimeWindow`, `CostEstimate`, `VersionRef`, `SchemaRef`, `LifecycleState` are reused unchanged. The evidence taxonomy in shared requirements §2.5 (`known | cited | derived | assumption | needs_founder | stale | blocked`) maps onto the existing `Provenance` kinds plus `LifecycleState`; no new value object is needed — only a presentation mapping in `@foundry/ui` (see `06-web-frontend-ia-delta.md` §3).

## 4. Status vocabulary additions (full list, for the ESLint "no local string union for status" rule)

| File | New export |
|---|---|
| `status/founder-task-status.ts` | `FounderTaskStatuses = ['proposed', 'active', 'completed', 'deferred', 'skipped']`, `canTransition`, `nextStates` |
| `status/score-dimension.ts` | `ScoreDimensions` (the 7 keys above), `ScoreDimensionWeights` (the weights from shared requirements §7.1, re-exported from `@foundry/scoring` for UI display) |
| `status/business-model-section.ts` | `BusinessModelSectionKeys` (the 17 keys above), `BusinessModelSectionStatuses = ['draft', 'assumption_heavy', 'researching', 'needs_founder', 'supported', 'stale', 'blocked', 'accepted']` (web requirements §5) |
| `status/execution-status.ts` | additive `SprintStatuses` values per §2 table above; `AiJobOwners = ['co_founder', 'ai', 'founder']`; `AiJobKinds = ['research', 'draft', 'analysis', 'clarification', 'synthesis']` |
| `status/conversation-status.ts` | `ConversationBlockKinds` (the 10 web requirements §4 response types), `ConversationVisibilities = ['founder_visible', 'internal']` |

## 5. IDs (`ids.ts`)

Add branded IDs: `ConversationMessageId`, `ConversationSummaryId`, `FounderPreferenceId`, `FounderTaskId`, `ResearchFindingId`, `PlanScoreId`. Follow the existing `Brand<'ProjectId', string>`-style pattern exactly; no new ID-generation strategy.
