# Current-state and retirement inventory

**Status:** approved direction; implementation inventory
**Date:** 22 August 2026
**Implements:** [Product reset](../02-product-requirements/00-product-reset.md) and [Product reset and migration](14-product-reset-and-migration.md)

## 1. Executive finding

The application already has the foundations needed for the reset: tenant-scoped ventures, a versioned pack, evidence, assumptions, decisions, scores, founder tasks, a persistent co-founder surface, and a journey UI.

The implementation is misaligned in one critical layer: it uses a custom Magentic-style runtime (`FoundryAgent`, specialist skills, worker pools, sprint fan-out, and a critic concept) to power that experience. This layer should be removed, not extended.

The highest-priority correctness defect is independent of that cleanup:

> `projects.current_phase` is created as `diagnose` and is not subsequently updated. The desktop UI derives a different phase from pack state, while pack snapshots, sprint contracts, and some next-action logic still read the stale stored phase.

Do not migrate or remove the runtime before making one journey-state value authoritative.

## 2. Existing workflow

1. A hidden workspace is created for tenancy; `WorkspaceService` may auto-connect a Bedrock provider.
2. `ProjectService.create` creates a venture, initial pack revision, deterministic 17-section starter content, and a proposed baseline research sprint.
3. The project shell displays a co-founder rail, phase focus, and plan/work/research/decision/settings drawers.
4. `conversation.send` assembles a pack snapshot and calls the custom `FoundryAgent`, which injects specialist skills and may create jobs, founder tasks, or decisions.
5. Approved sprints enter a queue; the worker uses a named-agent roster, Magentic-style worker pool, synthesis, critique, and gate logic to generate work.
6. Pack revisions, evidence, assumptions, decisions, conversations, and founder tasks persist in the database.

The reset retains tenancy and persistence foundations from steps 1 and 6, plus
selected UI patterns from step 3. It replaces the initial-draft behavior and
default information architecture in steps 2–3, replaces step 4 with one
co-founder runtime contract, and replaces step 5 with bounded single-co-founder
operations.

The current chat path can create founder tasks and inferred preferences before
the founder receives an in-place confirmation. The replacement must represent
those actions as reviewable proposals and must never silently accept them.

## 3. Keep

These components are aligned with the product and must not be deleted during harness cleanup.

### Journey, business record, and evidence migration sources

- `packages/domain/src/status/journey-status.ts` and `derive-journey-phase.ts` (replace the nine-phase/hard-gate semantics; retain only as a conversion source)
- `packages/domain/src/status/business-model-section.ts` (map the 17-section presentation contract to the 12-section record)
- `apps/web/lib/journey.ts` (reuse patterns only; replace labels and stage behavior)
- `packages/db/migrations/0002_identity.sql` (`projects`)
- `packages/db/migrations/0005_evidence.sql`
- `packages/db/migrations/0006_execution.sql` (pack/evidence portions)
- `packages/db/migrations/0007_money.sql`
- `packages/db/migrations/0008_artifacts.sql`
- `packages/db/migrations/0009_mvbp_gtm_launch.sql` (pack, decision, approval, metric portions)
- `packages/db/migrations/0010_conversation.sql` through `0016_mcp_server_read_only.sql`, except obsolete agent-specific fields identified below
- repositories for projects, pack revisions/sections, evidence, assumptions, decisions, conversations, founder tasks, research findings, scores, money rules, artifacts, documents, interviews, and approvals

### Product services and UI

- `apps/web/server/services/pack-service.ts`
- `apps/web/server/services/pack-snapshot.ts`
- `apps/web/server/services/plan-section-aggregator.ts`
- `apps/web/server/services/scoring-service.ts` (only as a migration source for readiness explanations)
- `apps/web/server/services/founder-task-service.ts` (only as a migration source for journey steps)
- `apps/web/server/services/research-finding-service.ts`
- `apps/web/server/services/money-rules-service.ts`
- `apps/web/server/services/artifact-service.ts`
- `apps/web/server/services/conversation-service.ts` (after its runtime call is replaced)
- `apps/web/server/routers/conversation.ts`
- `apps/web/components/chrome/project-shell.tsx` and `cofounder-rail.tsx` (reuse shell and persistent-help patterns)
- `apps/web/components/chrome/phase-focus.tsx` (rebuild as overview and founder step, not a derived nine-phase focus)
- plan, conversation, research, decision, evidence-capture, and onboarding components (retain selectively; rewire state and confirmation behavior)

### Platform controls

- Better Auth, workspace RLS, provider connections, policy, tools, calculations, document intelligence, artifact generation, object storage, infrastructure, streaming, and non-sprint queues.
- MCP support remains only as application-mediated, read-only capability access for the single co-founder; do not expose raw user-provided MCP execution.
- `AgentStepTrace` is not a product surface. Replace it with a founder-readable activity timeline only if it contains no worker, tool-chain, or hidden-reasoning semantics.

## 4. Rework

### 4.1 Authoritative journey state — first implementation change

| Component | Required change |
| --- | --- |
| `packages/db/src/repositories/projects.ts` | Either persist the derived phase after every accepted record change or remove `current_phase` and derive it consistently. Do not retain two independently meaningful phase fields. |
| `apps/web/server/services/project-service.ts` | Drive next-action selection from the authoritative phase and readiness state. |
| `apps/web/server/services/conversation-service.ts` | Include the authoritative phase and current objective in co-founder context. |
| `apps/web/server/services/pack-snapshot.ts` | Compute and expose the authoritative phase. |
| `apps/worker/src/pack-snapshot.ts` | Stop emitting `derivedPhase: null`; use the same snapshot contract as the web path. |
| `packages/agent-runtime/src/contracts/pack-snapshot.ts` | Replace duplicated `phase` and `derivedPhase` fields with one value. |
| `packages/domain/src/entities/project.ts` and relevant API read models | Expose a single journey-state representation. |

The founder-selected policy is readiness signals, not hard stage locks. Gate calculations remain visible evidence/readiness indicators; they may restrict a future high-risk external operation but cannot make a founder unable to document or intentionally progress through the journey.

### 4.2 One co-founder turn

| Component | Required change |
| --- | --- |
| `packages/agent-runtime/src/orchestration/cofounder-turn.ts` | Replace `FoundryAgent`, specialist-skill selection, and `submit_decision` loop with a stock AI SDK co-founder call plus typed application tools. |
| `packages/agent-runtime/src/agents/instructions.ts` | Retain one stage-aware co-founder instruction set; remove specialist identities and unused orchestrator/critic/mock-worker prompts. |
| `packages/agent-runtime/src/context/*` | Retain bounded context assembly, but assemble current objective, accepted record, evidence, assumptions, decisions, and active founder steps rather than orchestration ledgers. |
| `packages/agent-runtime/src/orchestration/{summarize-conversation,extract-preferences,generate-initial-draft,research-templates}.ts` | Retain as application services or templates, not agent personas. |
| `apps/web/server/services/conversation-service.ts` | Replace specialist `roleLabel` presentation with a single co-founder identity. |

### 4.3 Jobs become bounded co-founder operations

The user may start a bounded research or drafting operation, but it is not a “sprint conference” and may not fan out to workers.

| Component | Required change |
| --- | --- |
| `packages/domain/src/entities/sprint-contract.ts` | Replace worker specifications, maximum-worker, stall, and orchestrator fields with objective, reason, source record version, tool allowlist, budget, and expected proposal. |
| `packages/agent-runtime/src/contracts/sprint-contract.ts` | Stop selecting named agents; create one co-founder job contract. |
| `packages/agent-runtime/src/orchestration/sprint-runner.ts` | Retire after a bounded co-founder-operation path can store findings or a proposal and run deterministic readiness checks. |
| `apps/web/server/services/{sprint-service,job-service}.ts` | Replace with journey-step, proposal, and bounded co-founder-operation services; remove job-as-primary-work semantics. |
| `apps/web/server/routers/{sprint.ts,job.ts}` | Replace with journey-step, proposal, and operation APIs; keep a temporary compatibility path only if an active client needs it. |
| `apps/web/components/work/job-card.tsx` | Remove or replace with a journey-step detail and founder-readable operation status. |
| `packages/api-contracts/src/commands/cofounder.ts` | Remove `maxWorkers`, `maxStalls`, and role-specific job settings. |

### 4.4 Deterministic readiness, not a success score

- Retain only policy calculations that explain evidence, contradiction, or risk. Rework `gate-a.ts`, `gate-b.ts`, `gate-c.ts`, and `packages/scoring/src/calculate-score.ts` into transparent readiness inputs where they remain useful.
- Fold only deterministic checks from `packages/agent-runtime/src/critique/critic-runtime.ts` into policy, or remove the check entirely. Do not retain a model-based critic topology.
- Replace the product-facing numeric score and gate-pass language with readiness explanations: what is supported, unverified, contradictory, stale, or blocked, and which founder-sized step would improve it.
- Readiness may inform a recommendation or a future high-risk action policy. It never silently advances the journey or certifies an idea.

### 4.5 First-session model

The deterministic initial draft is useful, but it must produce an honest business-model skeleton and one recommended founder-sized next step. It must not create an autonomous 17-section business plan, an implied validation result, or a mandatory research sprint.

## 5. Remove in the cleanup release

Removal begins only after the reworked call paths are live and verified. Do not edit historical migration files; introduce an additive cleanup migration after application code no longer reads obsolete records.

### 5.1 Runtime and specialist identities

- `packages/agent-runtime/src/orchestration/foundry-agent.ts` and test
- `packages/agent-runtime/src/orchestration/worker-pool.ts` and test
- `packages/agent-runtime/src/orchestration/stall-detector.ts`
- `packages/agent-runtime/src/orchestration/synthesize.ts`
- `packages/agent-runtime/src/skills/{registry.ts,select-skills.ts,types.ts}` and tests
- `packages/agent-runtime/src/agents/agent-definition-runtime.ts`
- `packages/agent-runtime/src/code-mode/{sandbox.ts,code-tool.ts}` and tests, unless a separately authorized sandboxed-calculation feature needs them
- Specialist, critic, mock-worker, and orchestrator instructions in `packages/agent-runtime/src/agents/instructions.ts`
- `packages/agent-runtime/src/orchestration/diagnose.ts` after its fallback behavior is folded into the co-founder turn
- `quickjs-emscripten` from `packages/agent-runtime/package.json` after code-mode removal

### 5.2 Agent roster and agent-specific persistence

Add a new migration after the new one-co-founder code is deployed:

- retire `agent_definitions` and `packages/db/src/repositories/agent-definitions.ts`;
- remove roster seed dependency from historical migrations without changing those migration files;
- retarget or drop `agent_runs.agent_definition_id`, `proposed_changes.agent_run_id`, and `tool_calls.agent_run_id`;
- retain usage records only if they are re-bound to a job or co-founder operation;
- remove unused `tool_definitions` if it is not repurposed as an application tool registry;
- remove `SprintWorkerSpec` and unused `Phase`, `TaskLedger`, and `ProgressLedger` domain entities.

### 5.3 Public surface and test cleanup

- Remove both sprint and legacy job routers after journey-step, proposal, and bounded-operation APIs are the only supported public paths.
- Remove mobile sprint detail and specialist-role UI after the mobile surface uses journey steps and field capture.
- Rewrite affected runtime, worker, router, and repository tests around co-founder proposals, journey steps, readiness calculations, and approval behavior.
- Delete tests that assert named workers, skill selection, worker count, stalls, mock workers, or agent seeds.
- Remove deprecated environment variables, configuration limits, comments, prompts, and documentation that imply a roster or conference loop.

## 6. Verify before deletion

| Item | Required decision or check |
| --- | --- |
| `agent_runs` and `usage_records` | Confirm the desired cost/audit granularity before changing foreign keys. |
| `tool_definitions`, `tool_calls`, `proposed_changes` | Determine whether to rebind them to jobs or fully retire them. |
| Legacy sprint foreign keys | Rebind or retire `research_findings.job_id`, `founder_tasks.linked_job_id`, `pack_revisions.source_sprint_id`, and `decisions.sprint_id` before removing `sprints`. |
| `proposed_changes` RLS | Replace its route through `agent_runs` and `sprints` before treating it as the proposal store. |
| `research.ts` in `packages/tools` | It currently returns empty result arrays; implement real bounded research before enabling co-founder research claims. |
| MCP loading and settings | Confirm every inline path enforces read-only policy and tenant scope. |
| `AgentStepTrace` | Remove the internal trace surface or replace it with a concise founder-readable activity timeline. |
| Initial-draft prompt | The LLM instruction constant appears unused; either remove it or explicitly adopt it under the one-co-founder contract. |
| Mobile experience | Keep core read/capture parity only after web journey behavior is established; do not preserve old sprint controls for parity. |
| Journey E2E | Add an end-to-end idea → pause → return → evidence/decision → proposal review → validation-experiment path before deleting legacy runtime code. |
| Workspace model | Workspace remains a correct tenancy/billing boundary even if the UI hides workspace management. |

## 7. Cleanup-release sequence

1. Add journey-state tests and make the single state source authoritative.
2. Replace the interactive custom loop with one co-founder call and typed tool/proposal handling.
3. Replace sprint fan-out with a bounded co-founder operation only where a request cannot safely complete inline.
4. Move quality decisions to deterministic readiness explanations, not a business-success score.
5. Update web and mobile journey surfaces, API contracts, and user-facing language.
6. Run data conversion for retained operations, usage, proposals, and conversation history.
7. Run the new additive schema cleanup migration.
8. Delete the roster, custom harness, specialist prompts, worker controls, redundant router/UI, tests, packages, configuration, and historical-current documentation.
9. Verify migrations, RLS, authorization, state transitions, co-founder proposal approval, operation recovery, and the founder journey end to end.

The selected policy is an immediate cleanup release after the replacement implementation is verified. “Immediate” does not justify deleting rows or schema before the replacement path and conversion checks exist.
