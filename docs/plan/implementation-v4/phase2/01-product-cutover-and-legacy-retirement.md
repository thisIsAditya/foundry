# Product cutover and legacy retirement

**Status:** proposed Phase 2 plan  
**Implements:** P2.0 and P2.3  
**Depends on:** [Phase 2 overview](00-README.md),
[persistence and migration](../02-persistence-and-migration.md), and
[quality, security, and release](../06-quality-security-and-release.md)

## 1. Objective

Remove the previous sprint-driven, multi-agent product direction only after the
founder-journey replacement is demonstrably complete. This is a data and
reachability cutover, not a source-code tidy-up.

The desired end state is:

```text
Founder action
  → authenticated application command
  → journey / evidence / record / proposal service
  → accepted-version or draft-only result
  → founder-readable activity and bounded operation state
  → one replaceable CofounderRuntime
```

No live path may instead resolve an agent definition, select a specialist
skill, create a sprint, fan out worker jobs, synthesize worker output, invoke a
critic, or accept a pack revision as a side effect of AI work.

### 1.1 Current dual-control-plane defect

The web founder routes use `cofounder.respond` and `DirectAiSdkRuntime`, but
the legacy `conversation.send` route remains active for the Expo client and
older tests. It reaches `runCofounderTurn`, `FoundryAgent`, specialist skills,
sprint preview, the sprint queue, and the worker pool. Both `sprint`/`job`/
`score`/`gate` and `journey`/`record`/`proposal`/`cofounder` routers are
currently mounted.

This means the cleanup starts by making the direct co-founder path exclusive,
not by deleting the classes that look old. `CapabilityGateway` is an unfinished
replacement—not dead code—and must be wired/tested before the last tool-bearing
legacy path disappears.

## 2. Retirement rules

Every candidate must be recorded in a machine-readable, reviewable
`legacy-disposition` report before removal. For each code or data family, the
report records:

- current imports, route callers, queue producers/consumers, and test callers;
- whether it is active, compatibility-only, migration-only, test-only, or
  unreachable;
- retained data count, conversion result, archive location, and foreign-key
  dependencies;
- replacement command/read model/worker path;
- feature-flag owner and removal condition; and
- deletion commit and post-delete verification.

`git grep`, generated client inspection, a production-safe dependency scan, and
representative database fixtures are required evidence. A component that has no
current UI import can still be a migration source, a public client endpoint, or
an active worker dependency.

## 3. What remains in the target product

Retain and strengthen:

- workspace membership, Better Auth, RLS, policy, audit, provider-secret, and
  object-storage foundations;
- journeys, journey stages/steps/transitions, business-record versions/items,
  evidence, assumptions, decisions, experiments, proposals, staleness, and
  activity events;
- `CofounderOperation`, safe stream bus, capability-invocation audit, document
  ingestion, rendering, notification delivery, and bounded retrieval;
- conversation persistence and summaries as supporting history;
- `conversation.list`, `journey.*`, `record.*`, `proposal.*`,
  `cofounder.*`, and evidence/decision/experiment commands that enforce
  application authorization; and
- provider resolution, structured-output validation, secret-envelope, and
  stream primitives only where they are not coupled to agent orchestration.

Do not delete `pack_revisions`, `pack_sections`, evidence, artifacts, or
conversation history solely because the new UI stops presenting them directly.
They are historical migration sources until conversion disposition is complete.

## 4. Candidate retirement inventory

### 4.0 Web-orphan cleanup — delete first after one importer audit

The following are currently unwired from the V4 project shell and can be
removed as a low-risk, code-only wave once a fresh import scan confirms no
mobile, route, or test dependency:

- `components/chrome/phase-focus.tsx` and the old score/job
  `components/chrome/project-header.tsx`;
- legacy `components/plan/*`, `components/work/*`,
  `components/research/research-view.tsx`, and `components/score/*`;
- `components/conversation/agent-step-trace.tsx`,
  `lib/agent-step-trace.ts`, and its tool-description helpers;
- `lib/journey.ts`, founder-task-priority, and last-viewed-decisions helpers
  that are reachable only from those orphaned screens; and
- unused stream effort state after no client reads it.

Keep `legacy-href.ts`, `projectPanelHref`, and proxy redirects for one
deprecation release. Update historical message renderers to either route to a
new destination or show a neutral archived-work label; do not leave a broken
legacy plan/work/research link after deleting its UI.

### 4.1 Custom multi-agent runtime — delete after P2.2/P2.3 gates

Retire these `packages/agent-runtime` families once no public or worker path
imports them:

- `orchestration/foundry-agent.ts` and its submit-decision tool;
- `orchestration/worker-pool.ts`, `sprint-runner.ts`, `stall-detector.ts`,
  `synthesize.ts`, and their test fixtures;
- named-agent capability resolution and `agents/agent-definition-runtime.ts`;
- `skills/registry.ts`, `skills/select-skills.ts`, `skills/types.ts`, and
  specialist/critic/orchestrator instructions;
- `critique/critic-runtime.ts` except any pure deterministic rule explicitly
  moved to readiness policy with standalone tests;
- `code-mode/` and `quickjs-emscripten`, unless a separately approved,
  non-co-founder calculation feature has a valid isolation design;
- raw user-MCP tool loading, bridge, and related co-founder integrations,
  while retaining generic SSRF/risk-policy code only if it protects a remaining
  application-mediated integration; and
- legacy pack-snapshot, output-schema, budget, and context exports that exist
  only to power a sprint, agent run, worker pool, or named role.

The new runtime exports must be audited at the package entry point. Removing
implementation files while leaving legacy exports, prompt constants, test
fixtures, or dependency declarations keeps the retired architecture alive.

### 4.2 Sprint/job worker path — delete after bounded operations replace it

The current worker starts a sprint worker from `apps/worker/src/main.ts`; its
process path reaches `apps/worker/src/sprint/process.ts`,
`queues/sprint.worker.ts`, pack snapshots, agent definitions, user MCP tools,
worker runtimes, gates, research findings, and proposed pack revisions. This
entire path is incompatible with the single-co-founder model.

Replace it with a `cofounder` operation worker only when an operation cannot
finish inside the bounded request budget. Retain ingestion, render, and
notification workers. Then remove:

- the sprint queue declaration, producer, consumer, retry settings, health
  registration, shutdown registration, and queue metrics;
- `SprintJobData`, sprint processor, worker pool, mock worker, agent-run
  creation, sprint progress persistence, and synthesis-to-pack path;
- active sprint/job services, routers, API contracts, invalidation entries,
  stream events, notifications, and tests; and
- worker configuration that exists only for research sprints, stalls, maximum
  worker counts, agent roles, or synthetic conference behavior.

### 4.3 Founder-facing legacy UI — remove after replacement browser tests pass

The following surfaces are not part of the reset product and should be removed
or rewritten after the Journey, Model, Evidence, Decisions, and Co-founder
routes demonstrate their replacements:

- phase-focus / desk / score-led views and project-header score display;
- work boards, work drawers, job cards, job detail, sprint controls, approval
  queues used as sprint control, and research-job queue language;
- plan score headline and 17-section pack-first editor views;
- agent-step traces, role labels, worker counts, effort presets, and model
  tuning visible to founders;
- raw MCP/provider configuration as an in-flow co-founder feature; and
- conversation message blocks that route to legacy plan/work/research
  destinations or describe a research plan, founder task, or job request.

Replace reusable visual patterns—not semantics—with JourneyStep cards,
founder-readable activity, evidence capture, record-section history, and
proposal review.

### 4.4 Compatibility-only services and contracts — remove last

These areas need a precise caller audit before removal:

- `conversation.send`, legacy inferred-preference commands, and the old
  `ConversationService` orchestration path;
- sprint, job, score, gate, legacy pack, founder-task, and research APIs;
- legacy `DeskSummary`, `AiJobSummary`, phase, score, pack-section, and worker
  stream contracts;
- test helpers, mock models, seed data, fixtures, and environment variables;
- mobile or external clients that still use a compatibility route; and
- old project `current_phase` readers and any write path that treats it as
  independent business state.

Compatibility routes may be one-release redirect/read adapters only. They must
never write a second meaning of journey state or translate a legacy AI result
into accepted record state.

The Expo routes currently include legacy plan, sprint, work, task, score, and
co-founder behavior. Do not remove their backing contracts until each route is
cut over to V4 or deliberately deprecated behind a compatibility plan. Native
parity does not block web GA, but it does block destructive removal of APIs it
still invokes.

`project.getDeskSummary` is a compatibility read, not the target founder
overview. Narrow settings/name callers away from it, remove
`derivedPhase`/overall-score product semantics, and make
`projects.current_phase` a one-way Journey projection until its final
forward-migration removal.

## 5. Data disposition and migration

### 5.1 Capture first

Before a destructive migration:

1. take counts and sample fixture rows for every legacy table and foreign key;
2. create anonymized fixture projects for new, evidence-heavy, accepted-pack,
   paused, failed-readiness, and legacy launch-era ventures;
3. record source-to-target mappings and expected counts;
4. test conversion twice to prove idempotency; and
5. retain a queryable export or archive of rows that must no longer live in
   operational tables.

The existing `0017_founder_journey` migration creates an honest 12-section
skeleton and journey state, but it does not complete the pack-to-record content,
evidence-link, decision-link, and provenance conversion. Add a forward,
fixture-backed converter; do not rewrite `0017` or mark historical
AI-generated pack text as founder-approved/cited evidence.

### 5.2 Required relation disposition

| Legacy relation | Phase 2 disposition |
| --- | --- |
| `agent_runs.agent_definition_id`, `agent_runs.sprint_id` | Archive/rebind usage provenance to an opaque legacy audit reference or an operation record; never leave active product reads dependent on it. |
| `usage_records.agent_run_id` | Rebind retained cost data to `cofounder_operations` only when attribution remains truthful; otherwise archive as legacy usage. |
| `proposed_changes.agent_run_id`, `tool_calls.agent_run_id` | Preserve historical audit rows outside the active proposal/tool path; active proposals use `proposals_v4` and `proposal_changes_v4`. |
| `research_findings.job_id`, `founder_tasks.linked_job_id` | Rebind a retained item to a journey step or archive it with its source reference. |
| `pack_revisions.source_sprint_id`, `decisions.sprint_id` | Preserve source provenance as immutable legacy metadata; active records must reference business-record versions/proposals instead. |
| `projects.current_phase` | Keep as a one-way projection only until every old reader is gone, then remove it in a forward migration. |
| `pack_revisions` / 17-section content | Convert to the 12-section record or explicit deferred extension data with honest provenance; do not discard it because it is not core. |

Every new tenant table or archive access path needs direct project/workspace
ownership, RLS `USING` and `WITH CHECK` policy coverage, and tests proving that
one workspace cannot read or mutate another's data.

### 5.3 Cleanup migration policy

Use a new forward migration only after:

- no production code, worker, RLS policy, or active report joins through the
  retiring table;
- the conversion report has zero unclassified rows;
- the archive/retention decision is approved;
- RLS tests pass against the production-equivalent PostgreSQL configuration;
- rollback uses a feature flag or corrective forward migration rather than
  editing historical migrations; and
- the code removal and schema retirement are deployed in one compatible
  release window.

## 6. Cutover order

1. Remove confirmed web-orphan UI and retain deprecation redirects.
2. Land P2.1 and P2.2 replacement paths behind flags.
3. Route new founder interactions exclusively through journey, proposal, and
   bounded-operation commands.
4. Cut mobile chat away from `conversation.send` or explicitly deprecate it;
   then stop FoundryAgent/sprint writers.
5. Shadow-read record/journey projections and compare conversion fixtures.
6. Stop legacy writes, keeping reads read-only for the defined compatibility
   window.
7. Rebind/archive relation data and prove zero active readers.
8. Remove legacy source, tests, package dependencies, configuration, stream
   events, prompts, and documentation.
9. Apply the cleanup migration.
10. Run post-drop migration, RLS, direct-runtime, and browser journey suites.

If a candidate fails any gate, restore its read-only compatibility adapter or
feature flag. Do not resurrect its old write or orchestration behavior.

## 7. Exit gate

The legacy cutover passes only when:

- a repository dependency scan finds no production import of `FoundryAgent`,
  named agent definitions, specialist skills, worker pools, sprint runner,
  critic runtime, code-mode, or raw user-MCP co-founder loading;
- the worker starts only retained platform workers plus the bounded co-founder
  operation worker where enabled;
- no primary route, stream event, API contract, prompt, configuration value,
  test, or documentation exposes sprint/worker/role/agent-trace semantics;
- all retained legacy data has a counted disposition and conversion fixture;
- accepted record state cannot change through a canceled, duplicated, failed,
  or legacy request; and
- the end-to-end founder journey passes without a legacy compatibility route.
