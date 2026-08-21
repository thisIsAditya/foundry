# Implementation contracts and cleanup runbook

**Status:** proposed implementation plan
**Date:** 22 August 2026
**Depends on:** [Product reset](../02-product-requirements/00-product-reset.md),
[retirement inventory](15-current-state-and-retirement-inventory.md), and
[canonical journey](17-canonical-journey-and-business-model.md)

## 1. Purpose

This is the executable bridge between the current codebase and the founder
journey product. It answers four questions before code is deleted:

1. Which current foundations are worth retaining?
2. What must be replaced before the legacy runtime can be removed?
3. What data is converted, retained for audit, or intentionally retired?
4. Which tests prove the cleanup has not weakened founder control or tenant
   isolation?

This is a migration, not an incremental extension of the current sprint and
agent system. The existing data foundation is useful; the current control flow
is not the target architecture.

## 2. Current-state assessment

### 2.1 Reusable foundation

The repository already has meaningful building blocks:

- workspace membership, authorization, RLS, provider connections, and audit
  middleware;
- ventures/projects and versioned pack persistence;
- evidence, assumptions, decisions, experiments, interviews, artifacts, and
  conversation persistence;
- an existing project shell, co-founder rail, plan sections, evidence capture,
  decision display, and founder-task UI;
- queues for ingestion, rendering, and notifications;
- deterministic policy, calculation, and scoring utilities; and
- bounded context assembly, provider resolution, streaming, and structured
  output validation primitives.

### 2.2 Product-critical misalignment

The present control flow creates an initial pack and a proposed sprint, then
uses a custom `FoundryAgent` and a Magentic-style worker pool to drive chat and
background work. It also stores `projects.current_phase` while web views derive
another phase from pack state. That produces two incompatible meanings of
journey progress.

The result is not a small refactor:

- the current phase is not authoritative;
- the primary work object is a sprint/job instead of a founder-sized journey
  step;
- specialist-skill and worker semantics leak through contracts, persistence,
  UI, tests, prompts, and configuration; and
- a complete-looking initial pack and score can misrepresent uncertainty.

Two related correctness gaps must be resolved before AI capabilities expand:

- the existing research adapter returns empty paper and report results, so the
  co-founder must not claim bounded external research until a real,
  citation-preserving adapter is implemented; and
- the repository has no end-to-end journey suite. The cleanup release needs
  journey fixtures and browser/API coverage before legacy code is removed.

### 2.3 Target control flow

```text
Founder action
  -> application command
  -> JourneyService validates transition
  -> BusinessRecord / Evidence / Decision / Proposal services update draft state
  -> authorized founder acceptance creates an immutable record version
  -> activity and readiness projections update
  -> ContextService selects bounded context
  -> CofounderRuntime returns a validated suggestion or proposal
  -> founder reviews any material change
```

No arrow in this path permits a model, queue worker, or harness process to
write an accepted business record directly.

## 3. Canonical contracts

### 3.1 Journey types

Introduce one domain contract for the founder path:

```text
JourneyStage =
  idea | problem | customer | evidence | opportunity | offer | validation_next_step

JourneyStageStatus =
  not_started | draft | in_progress | awaiting_founder | ready_for_review |
  complete | deferred | blocked | revisited

JourneyStepStatus =
  proposed | ready | in_progress | awaiting_founder | submitted | reviewed |
  complete | deferred | skipped_with_reason | blocked | canceled | superseded
```

`Journey` persists `currentStage`, `currentObjective`, stage statuses, ordered
recommendations, active steps, transition history, and the accepted record
version. It replaces the separately meaningful `phase` and `derivedPhase`
values.

### 3.2 Record and proposal types

The target contracts distinguish:

```text
RecordItemStatus =
  empty | draft | needs_evidence | review | accepted | stale | deferred | blocked

Provenance =
  founder_input | cited_evidence | derived | ai_proposal |
  founder_approved | unverified | contradicted

ProposalStatus =
  draft | awaiting_founder | accepted | partially_accepted | rejected | expired | superseded
```

Each material proposed change holds its before value, after value, rationale,
evidence references, uncertainty, affected items, and acceptance result. A
record-version command accepts a known set of proposal changes; it cannot
accept arbitrary model output.

### 3.3 Command and event boundary

Server commands must be explicit and idempotent:

- `journey.create`
- `journey.setObjective`
- `journey.startStep`
- `journey.submitStep`
- `journey.deferStep`
- `journey.revisitStage`
- `evidence.capture`
- `assumption.record`
- `decision.record`
- `experiment.define`
- `proposal.create`
- `proposal.review`
- `record.acceptChanges`
- `cofounder.respond`

Corresponding activity events are founder-readable. For example, publish
`journey_step_completed`, `evidence_added`, `proposal_ready`, and
`record_version_accepted`; do not publish implementation-specific
`workers_complete`, agent-role, or hidden-reasoning events to product UI.

## 4. Database migration sequence

### Migration A — Establish source-of-truth journey state

1. Add `journeys`, `journey_stage_states`, `journey_steps`, and
   `journey_transitions`, or equivalent tables with the same ownership and
   lifecycle guarantees.
2. Backfill one journey for every active project from the most defensible
   available pack state. Mark uncertain mapping as `revisited` with a migration
   reason rather than asserting a completed phase.
3. Make `projects.current_phase` a compatibility projection only, then stop
   new services from treating it as independent state.
4. Update project reads, pack snapshots, context assembly, worker inputs, and
   API read models to consume the authoritative journey.
5. Add transition and backfill fixtures before removing the legacy field.

The backfill maps legacy phase intent, not its hard-gate behavior:

| Legacy phase | Reset disposition |
| --- | --- |
| `diagnose` | Idea |
| `problem` | Problem or Customer, based on accepted beachhead data |
| `evidence` | Evidence |
| `market_and_competition` | Opportunity |
| `model_and_pricing` | Offer |
| `willingness_to_pay` and `product` | Validation next step, never a journey lock |
| `build_and_launch` and `operate` | Deferred extension data; not active first-release stages |

### Migration B — Normalize accepted record and proposal semantics

1. Retain `pack_revisions` as a migration source and, initially, as the
   accepted-record version store where compatible.
2. Add or formalize typed record-item, provenance, relation, and proposal
   storage. Do not encode new accepted state solely in `proposed_changes` JSON.
3. Project the existing 17 pack sections into the 12 founder-readable sections.
4. Move build, launch, legal, operations, and similar legacy pack content into
   deferred extension data with provenance; do not force it into the core
   business model.
5. Link existing evidence, assumptions, decisions, and experiments to migrated
   record items.
6. Mark data with unknown support as `unverified`, not `cited_evidence` or
   `founder_approved`.

The conversion fixture must include this product-level mapping:

| Legacy content family | Target founder-readable section |
| --- | --- |
| Context and founder details | Idea and founder context |
| Problem | Problem |
| Beachhead and persona | Beachhead customer |
| Alternatives | Current alternatives |
| Evidence and assumptions | Evidence and learning; Assumptions and open questions |
| Market, competition, and wedge | Opportunity and differentiation |
| Money rules, pricing, economics, and relevant constraints | Offer, pricing, business model; Economics and constraints |
| MVBP kill lines and safe experiment content | Next validation experiment |
| Decisions and artifacts | Decisions and changes |
| GTM, legal, launch, operations, and build-only content | Deferred extension data, not a first-release journey section |

### Migration C — Rebind operations, usage, and audit

1. Create `CofounderOperation` and capability-invocation audit records.
2. Convert retained `sprints`, `agent_runs`, usage, proposed changes, and tool
   calls to an operation reference where historical retention is required.
3. Preserve immutable historical audit rows. Do not rewrite old migration files
   or erase historical identifiers.
4. Only after all active readers use the new link, introduce an additive schema
   cleanup migration for retired foreign keys and tables.

The migration plan must account for concrete legacy links before any table is
retired: `agent_runs.agent_definition_id`, `usage_records.agent_run_id`,
`proposed_changes.agent_run_id`, `tool_calls.agent_run_id`,
`research_findings.job_id`, `founder_tasks.linked_job_id`,
`pack_revisions.source_sprint_id`, and `decisions.sprint_id`. The
`proposed_changes` row-level-security policy must be redesigned because it
currently reaches a venture through an agent run and sprint.

### Migration D — Verify and remove

Before any drop/retirement migration:

- run representative project conversion fixtures;
- compare accepted record sections, linked evidence, decisions, and artifacts;
- validate workspace RLS and authorization at every new table;
- test interrupted proposal acceptance and duplicate command handling; and
- produce a count and disposition for every legacy row type.

## 5. Code replacement map

### 5.1 Domain and API contracts

| Current area | Action | Target |
| --- | --- | --- |
| `packages/domain/src/status/journey-status.ts` and `derive-journey-phase.ts` | Replace/rework | Explicit persisted journey state and projection rules |
| `entities/project.ts` | Rework | One journey-state reference, not independently meaningful phase |
| `entities/company-pack.ts`, `pack-section.ts`, evidence/assumption/decision/experiment entities | Retain and adapt | Versioned business record and relationships |
| `entities/sprint.ts`, `sprint-contract.ts`, `agent-definition.ts`, `agent-run.ts`, `phase.ts`, `task-ledger.ts`, `progress-ledger.ts` | Retire | Journey steps, co-founder operations, and application activity |
| `packages/api-contracts/src/commands/cofounder.ts` | Rework | Bounded co-founder request and structured proposal response |
| `read-models/ai-job-summary.ts`, `to-ai-job-summary.ts` | Retire | Journey overview, step, proposal, and activity read models |
| `read-models/desk-summary.ts` | Rework | One journey state, readiness explanations, and recommended continuation |

### 5.2 Runtime and prompts

| Current area | Action | Target |
| --- | --- | --- |
| `orchestration/foundry-agent.ts` | Delete after replacement | Direct structured runtime adapter or later `CofounderRuntime` adapter |
| `orchestration/cofounder-turn.ts` | Rewrite | One co-founder interaction using application context and proposal commands |
| `orchestration/worker-pool.ts`, `sprint-runner.ts`, `stall-detector.ts`, `synthesize.ts` | Delete | One bounded co-founder operation where needed |
| `critique/critic-runtime.ts` | Delete or fold | Deterministic policy/readiness checks only |
| `skills/registry.ts`, `select-skills.ts`, `skills/types.ts` | Delete | A single stage-aware co-founder instruction set |
| `agents/agent-definition-runtime.ts` and specialist seed data | Delete | Versioned application prompt/config only |
| `code-mode/` | Delete unless separately approved | Deterministic calculators and typed capabilities |
| `context/` and `compression/` | Retain/rework | Application-owned context selection and summary strategy |
| provider, streaming, secrets, and observability modules | Retain/rework | Co-founder adapter support without custom orchestration semantics |

Remove `quickjs-emscripten` after code mode is removed. Reassess direct
`@ai-sdk/mcp` use: raw user-provided MCP execution is not part of the target;
retain only if it is transformed into a secure application gateway.

### 5.3 Web and mobile surfaces

| Current area | Action | Target |
| --- | --- | --- |
| `components/chrome/project-shell.tsx`, `cofounder-rail.tsx`, `phase-focus.tsx` | Rework | Overview, journey state, current objective, and persistent co-founder |
| onboarding and plan/evidence/decision components | Retain/rework | Idea capture, record skeleton, model, evidence, and proposal review |
| `components/work/work-board.tsx`, `work-drawer.tsx`, `job-card.tsx`, `approvals-queue.tsx` | Replace/remove | Journey-step and proposal surfaces |
| `components/conversation/agent-step-trace.tsx` | Remove/reframe | Founder-readable activity timeline without internal reasoning |
| MCP and advanced model settings panels | Disable/remove from core | Later policy-gated integration settings |
| mobile sprint/work detail | Remove/rewrite | Mobile journey resume and field capture |

The implementation order inside the shell is deliberate:

1. turn `phase-focus.tsx` into the default overview with an always-visible
   stage/objective strip, recent changes, readiness, and one recommended step;
2. preserve `section-detail.tsx`'s before/after diff as the canonical
   confirmation pattern, then expose Accept, Modify, and Keep current directly
   in co-founder proposal blocks;
3. convert the existing `work` surface into journey steps and only a
   plain-language status for bounded co-founder operations; and
4. remove effort presets, worker counts, role labels, sprint terminology, and
   raw MCP settings from the default founder path.

### 5.4 Services, routers, queues, and worker

| Current area | Action | Target |
| --- | --- | --- |
| `project-service.ts` | Rework first | Authoritative journey and record-skeleton creation |
| `conversation-service.ts` | Rework | Context service plus structured co-founder proposal path |
| `pack-service.ts`, `pack-snapshot.ts`, `plan-section-aggregator.ts` | Retain/rework | Business-record projection and migration compatibility |
| evidence, decision, experiment, founder-task, artifact, and scoring services | Retain/rework | Evidence/decision/step services and readiness explanations |
| `sprint-service.ts`, `job-service.ts`, `routers/sprint.ts`, legacy job routes | Retire | Journey-step, proposal, and bounded-operation APIs |
| `apps/worker/src/sprint/**`, `queues/sprint.worker.ts`, worker snapshots for sprints | Delete/replace | Single co-founder-operation worker only if request execution is unsuitable |
| ingestion, render, notification queues | Retain | Application-owned background work |
| raw MCP loading | Remove from co-founder path | Gateway-owned, individually approved capability adapters |

## 6. Tests, configuration, and documentation cleanup

### 6.1 Tests to replace

Delete tests whose assertion is the existence of `FoundryAgent`, named workers,
skill selection, worker count, stall behavior, sprint synthesis, critic output,
or agent-definition seeds.

Replace them with:

- state-transition and invalid-transition tests;
- journey backfill and record-migration fixtures;
- proposal diff, partial-acceptance, rejection, and stale-impact tests;
- tenant-isolation and authorization tests;
- context-selection and redaction tests;
- co-founder structured-output validation tests;
- operation cancellation, timeout, idempotency, and recovery tests; and
- end-to-end “idea → step → evidence/decision → model → validation experiment”
  tests.

The end-to-end suite must cover a return-after-pause case and prove that a Gate
A failure can lower readiness without preventing a founder from documenting,
deferring, revisiting, or working on another appropriate step.

### 6.2 Configuration and package cleanup

Remove configuration, limits, fixtures, environment variables, and comments
that refer to:

- named agents or agent-definition seeds;
- max workers, stalls, worker pools, or conference/synthesis behavior;
- critic roles;
- code-mode sandboxing unless separately approved;
- sprint queues as product workflow; and
- raw user MCP execution.

Do not add DeepSeek Harness as an in-process workspace dependency. A later proof
of concept packages it separately behind the runtime interface.

### 6.3 Documentation cleanup

Keep research and superseded plans as dated background, but label them clearly.
Delete or rewrite active references that instruct an implementer to create
specialists, fan out workers, operate a company, or treat a score as validation.

## 7. Execution order and exit gates

1. Land the canonical contracts and migration fixtures.
2. Make authoritative journey state available to all reads.
3. Ship the web Overview, Journey, Business model, Evidence, and Decision
   surfaces on the new state.
4. Add proposal review and accepted-record version creation.
5. Replace the interactive co-founder loop with the narrow runtime interface.
6. Convert or retire active legacy data and switch all callers.
7. Remove the legacy code, database links, dependencies, prompts, tests, and
   UI in one verified cleanup release.
8. Run the optional DeepSeek Harness proof of concept only after step 7.

The cleanup release may merge only when:

- no active production import reaches custom orchestration, sub-agent, worker
  pool, specialist-skill, sprint, or critic code;
- no public screen, route, or event describes those concepts;
- state, record, proposal, and tenant tests pass;
- conversion fixtures preserve accepted data or explicitly mark it retired; and
- deleting the legacy path does not change an accepted record without a founder
  action.
