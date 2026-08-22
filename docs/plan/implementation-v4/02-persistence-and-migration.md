# Persistence and migration

**Status:** proposed implementation plan  
**Implements:** V4.1, V4.2, V4.4, and V4.6  
**Depends on:** [foundation and contracts](01-foundation-and-contracts.md)

## 1. Migration strategy

This is an additive, forward-only migration. Do not edit the historical
`packages/db/migrations/0001`–`0016` files, delete active data, or use a
temporary score/phase field as a second source of truth.

The migration sequence is:

```text
Add schema and RLS
  → backfill and validate
  → read from new projections
  → stop old writes
  → convert active references
  → remove legacy readers
  → retire obsolete schema in a later migration
```

Use the next available migration ordinal (currently expected to begin with
`0017_`). Every migration must have:

- an explicit data disposition;
- indexes required by the new query/RLS path;
- `ENABLE ROW LEVEL SECURITY` and `FORCE ROW LEVEL SECURITY` where the table
  contains tenant data;
- policies with both `USING` and `WITH CHECK` semantics for mutable rows;
- a fixture-backed backfill test before its cutover flag is enabled; and
- a rollback **plan** that uses a forward corrective migration or feature flag,
  not a rewrite of production history.

## 2. Canonical schema

The exact column types should follow existing UUID, timestamp, audit, and
workspace conventions. The ownership and lifecycle below are required.

| Store | Purpose | Key relationships |
| --- | --- | --- |
| `journeys` | One authoritative journey per project | Unique `project_id`; workspace scope; current stage/objective; accepted record version reference; revision. |
| `journey_stage_states` | Status and outcome for each of the seven stages | `journey_id`, stage, status, completion/defer/block reason, latest relevant version. |
| `journey_steps` | One founder-sized unit of work | Journey/stage, objective, effort, input/completion evidence, status, source proposal, revision. |
| `journey_transitions` | Immutable history of stage and step state changes | Journey, actor, cause, from/to state, command/correlation id, metadata safe for audit. |
| `business_record_versions` | Immutable accepted snapshots | Project, sequential version, accepted by/at, source proposal set, export metadata, compatibility source reference. |
| `record_items` | Typed material business content | Project, canonical section, status, provenance, current accepted version reference, revision. |
| `record_item_relations` | Evidence, assumption, decision, experiment, and dependency links | Typed source/target relationship; includes support, contradiction, derived-from, and affected-by. |
| `record_item_staleness` | Explicit downstream impact | Source change, affected item, reason, detected at, resolved by version. |
| `proposals` | A reviewable change set before acceptance | Project, author/source, status, rationale, uncertainty, context references, expiry, correlation id. |
| `proposal_changes` | Individually reviewable before/after mutations | Proposal, record item/section, before/after payload, evidence links, selected outcome, conflict/version context. |
| `cofounder_operations` | Bounded async runtime work | Project, actor, runtime kind, state, input reference, timeout/cancel/idempotency data, safe usage totals. |
| `capability_invocations` | Capability audit and recovery record | Operation, capability name/version/risk, scoped actor, idempotency result, duration, safe error/result summary. |
| `activity_events` | Founder-readable activity feed | Project, event type, actor, safe payload, related journey/step/proposal/version IDs. |

`business_record_versions` is the target canonical version store. Existing
`pack_revisions` and `pack_sections` remain migration sources and may be
projected for temporary compatibility, but no new accepted v4 record version
depends on a sprint, agent run, or 17-section status model.

The target read path reaches all tenant data directly through the project and
workspace. It must not discover a venture through
`agent_runs → sprints → projects`, which is the current dependency hidden in
some legacy RLS policies.

## 3. Tenant isolation and transaction practice

New tenant-scoped tables must follow `packages/db/src/rls.ts` and the existing
`withWorkspaceScope` pattern:

1. enter an explicit database transaction;
2. set workspace context with transaction-local scope;
3. execute reads and writes using the restricted application role;
4. rely on RLS as a database backstop in addition to service authorization; and
5. commit or roll back before returning pooled connections.

Do not use a session-scoped tenant setting. A pooled connection can otherwise
leak one tenant's context into another request. The migration role is separate
from the runtime application role and must not become the role used by web,
worker, or harness code.

RLS must be proven through tests that attempt cross-workspace reads and writes,
including updates that try to change project/workspace ownership. New `UPDATE`
policies require a `WITH CHECK` condition as well as a visibility condition.

## 4. Conversion plan

### 4.1 Freeze and fixture capture

Before applying the first schema migration:

- capture anonymized, representative fixtures for a new idea, an
  evidence-heavy venture, a venture with accepted pack revisions, a paused
  venture, a failed Gate A venture, and a launch-era legacy venture;
- record counts and foreign-key relationships for projects, packs, evidence,
  assumptions, decisions, experiments, founder tasks, sprints, agent runs,
  tool calls, usage, artifacts, and conversation summaries;
- decide the retention requirement for each record family; and
- prevent new product work from introducing worker count, specialist, or
  sprint dependencies.

Fixtures are executable migration tests, not screenshots or a prose-only
inventory.

### 4.2 Journey backfill

Create one `journeys` row and seven stage-state rows for every active project.
Backfill legacy intent without preserving legacy hard-gate behavior:

| Legacy value | v4 disposition |
| --- | --- |
| `diagnose` | Idea |
| `problem` | Problem, or Customer only when accepted beachhead data exists |
| `evidence` | Evidence |
| `market_and_competition` | Opportunity |
| `model_and_pricing` | Offer |
| `willingness_to_pay`, `product` | Validation next step; never a lock |
| `build_and_launch`, `operate` | Deferred extension data, not a core current stage |

An uncertain conversion uses `revisited` and an explicit migration reason. It
does not invent a completed stage.

During compatibility, `projects.current_phase` is a projection from the new
journey only. Update project reads, pack snapshots, context assembly, and
legacy compatibility callers to consume the authoritative journey before
stopping legacy writes. There must never be two independently updated phase
values.

### 4.3 Record conversion

Map historical pack content into the 12-section record while preserving source
IDs and honest provenance:

| Legacy content | Target disposition |
| --- | --- |
| Context/founder details | Idea and founder context |
| Problems | Problem |
| Beachhead and persona | Beachhead customer |
| Alternatives and competitors | Current alternatives |
| Evidence and assumptions | Evidence and learning; Assumptions and open questions |
| Market, wedge, and opportunity | Opportunity and differentiation |
| Pricing, money rules, and economics | Offer, pricing, and business model; Economics and constraints |
| Safe experiment/MVBP material | Next validation experiment |
| Decisions and artifacts | Decisions and changes |
| GTM, team, legal, launch, operations, build | Deferred extension data |

Historical AI-generated content without reliable support becomes `unverified`;
it must not become `founder_approved` or `cited_evidence`. A legacy legal
assumption such as a default jurisdiction remains deferred and unverified.

### 4.4 Proposal and operation rebinding

Move new proposal semantics to `proposals` and `proposal_changes`; do not
extend `proposed_changes` as the target store while its RLS path depends on an
agent run.

Before retiring legacy execution tables, explicitly rebind or archive these
links:

- `agent_runs.agent_definition_id` and `agent_runs.sprint_id`;
- `usage_records.agent_run_id`;
- `proposed_changes.agent_run_id`;
- `tool_calls.agent_run_id`;
- `research_findings.job_id`;
- `founder_tasks.linked_job_id`;
- `pack_revisions.source_sprint_id`;
- `decisions.sprint_id`; and
- parent/child job relationships in `sprints`.

Historical audit information may retain an opaque legacy reference. Active
reads, RLS policies, and product behavior must no longer require the retired
tables.

## 5. Compatibility and rollout

### Release A — establish and shadow-read

1. Deploy additive schema, repositories, policies, fixtures, and backfill.
2. Run backfill in bounded batches with counts, failures, and resumable
   idempotency keys.
3. Compare a new `JourneyOverview` and record projection with expected fixture
   output.
4. Enable shadow reads and log mismatch metrics without changing founder
   behavior.

### Release B — switch authoritative reads and writes

1. Send project reads, snapshot assembly, and context selection to the journey
   and record projections.
2. Create new ventures through the honest skeleton path.
3. Stop new independent writes to `current_phase`, 17-section accepted packs,
   automatic research sprints, and score-led next actions.
4. Feature-flag the new web destinations by workspace or test cohort.

### Release C — convert active callers

1. Ship proposal review, record acceptance, evidence links, and readiness
   explanations.
2. Replace work/job read models with journey steps and bounded operation status.
3. Rebind retained history and verify all active readers use v4 relations.
4. Keep legacy data read-only until cleanup gates pass.

### Release D — retire safely

Only then write an additive cleanup migration to remove obsolete foreign keys,
RLS policies, tables, enum values, and indexes. Ship code removal in the same
release window so a rollback never restores a reader for a dropped table.

## 6. Migration test and cutover gates

Each conversion fixture must prove:

- one current stage/objective is visible after migration;
- accepted record content, evidence, decisions, artifacts, and provenance are
  preserved or explicitly deferred;
- unknown support remains unknown;
- a duplicate backfill or command is harmless;
- one workspace cannot read or mutate another's new rows;
- a pending proposal cannot change an accepted record after a failed process;
- a legacy phase or score cannot block documentation; and
- old and new references have a documented row count and disposition.

Do not schedule legacy table drops until these tests pass in CI against the
same PostgreSQL/RLS configuration used by the application.
