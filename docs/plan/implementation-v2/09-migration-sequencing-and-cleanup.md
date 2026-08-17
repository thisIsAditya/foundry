# Migration sequencing and cleanup

**Implements:** `docs/02-product-requirements/05-delivery-slices.md` (all 8 slices); extends `docs/plan/implementation/14-implementation-checklist-and-sequencing.md`.

## 1. Sequencing principle

`docs/plan/implementation/14-implementation-checklist-and-sequencing.md`'s milestones 0–8 built the technical foundation this plan sits on top of, and per the codebase audit, milestones 0–7 are **already substantially built** (real schema, real routers, real agent runtime, real worker, mobile shell). This plan does not restart that sequencing — it inserts a new sequence of milestones (M9–M16 below) that consume the existing foundation and map directly onto the 8 delivery slices in `docs/02-product-requirements/05-delivery-slices.md`, in the same order, because each new slice's acceptance criteria are additive on the previous one (Slice 1 must ship before Slice 3's research review makes sense; Slice 2's durable conversation must exist before Slice 6's "ask for help from the co-founder" is meaningful).

## 2. Milestones

| Milestone | Delivery slice | Scope | Depends on |
|---|---|---|---|
| **M9** | Slice 1 — Instant complete draft | `03-database-schema-delta.md` migrations `0013` (evidence_items/citations/assumptions/personas/alternatives/competitors/wedges backfill) + `0014` (`plan_scores`); `@foundry/scoring` package; `InitialDraftService`; `PlanSectionAggregatorService`; `pack.listBusinessModelSections`/`getBusinessModelSection`; Overview screen v1 (web) and Home screen wiring (mobile, closing the placeholder gap) | Existing schema/services (§3 reuse map in `01-gap-analysis-and-decisions.md`) |
| **M10** | Slice 2 — Durable co-founder | Migration `0010` (`conversation_messages`, `conversation_summaries`, `founder_preferences`); `runCofounderTurn`, `ContextAssembler`, summarizer, preference extractor; `conversation.ts` router; persistent co-founder panel (web) and `co-founder.tsx` (mobile) | M9 (score/section data the co-founder references) |
| **M11** | Slice 3 — Research tracer bullet | Migration `0012` (`research_findings`, `sources` category columns); academic/market-report tools; `ResearchFindingService`; research preview/review screens; baseline research auto-proposal wired into `InitialDraftService` | M9, M10 |
| **M12** | Slice 4 — Work board and founder tasks | Migration `0011` (`founder_tasks`) + `0015` (`sprints` job columns); `job.ts` router, `AiJobSummary`; `FounderTaskService`/`founderTask.ts`; web Work board (`@dnd-kit`) and mobile Work lists | M10 (co-founder creates jobs/tasks), M9 |
| **M13** | Slice 5 — Versioned plan review | `pack.acceptSection`/`acceptAllSafeSections`/`explainChange`/`listRevisions` exposure; plan revision review UI on both platforms | M9, M11 |
| **M14** | Slice 6 — Founder help and draft actions | `founderTask.requestHelp` wired to co-founder draft-action blocks; verify every existing draft tool (`packages/tools`) is reachable from a founder task, not only from a sprint contract | M12, M10 |
| **M15** | Slice 7 — Mobile parity and field capture | `expo-audio` voice capture; WTP/observation mobile capture screens; offline sync polish | M9–M12 on mobile |
| **M16** | Slice 8 — Score maturity and operating loop | Score history UI, gate-as-score-input wiring end-to-end (decision D12 removal of `gate_blocked`), GO/PIVOT/KILL decision support tied to score | M9, M13 |

Each milestone follows the existing per-feature acceptance questions in `docs/plan/10-delivery-roadmap.md` §"Per-feature acceptance questions" and definition of done in `docs/plan/implementation/13-coding-standards-and-conventions.md` §"Definition of done," plus the additions in `00-README.md`.

## 3. Explicit cleanup list — resolve every item before its milestone is considered done

This is the concrete application of rule 2 in `00-README.md` ("no orphaned or unwired code"). Each item was found during the codebase audit and must be either wired or removed, never left as-is.

| Item | Location | Resolution | Milestone |
|---|---|---|---|
| `desk.tsx` is a placeholder that never calls `project.getDeskSummary` | `apps/mobile/app/(app)/desk.tsx` | Rewired as `home.tsx` with real data | M9 |
| `PackService.listRevisions` exists but is not exposed on any router | `apps/web/server/services/pack-service.ts` / `routers/pack.ts` | Exposed as `pack.listRevisions` | M13 |
| `business_models`/`offers` tables exist with no repository | `packages/db/migrations/0007_money.sql` | Repositories added | M9 |
| `policies`/`proposed_changes`/`tool_definitions`/`tool_calls` tables exist with no repository | `packages/db/migrations/0009_mvbp_gtm_launch.sql` | Add repositories only if a router in this plan needs to read them directly (`gates_decisions_artifacts` section needs `decisions`/`gates`/`artifacts`, not these four) — otherwise leave undisturbed as internal-only tables already written by existing services, and note explicitly in the M9 PR description that they were evaluated and intentionally left without a repository, so a future reviewer does not reintroduce them as "missing" | M9 |
| `evidence-item.ts`, `citation.ts`, `assumption.ts`, `persona.ts`, `alternative.ts`, `competitor.ts`, `wedge.ts` are Zod types with no table/repository | `packages/domain/src/entities/*.ts` | Tables + repositories added (`03-database-schema-delta.md` §1 migration `0013`) | M9 |
| `sprint.start` referenced in the old web-frontend-architecture screen map but the actual procedure is `sprint.preview`/`approvePlan` | `docs/plan/implementation/02-web-frontend-architecture.md` | Documentation-only inconsistency; `job.ts` (`04-backend-services-and-trpc-delta.md` §3) is the single source of truth going forward, no code fix needed beyond not repeating the naming error | M12 |
| `metric.ts` router file exports both a `metric` and a `gate` namespace, which is a minor router-hygiene issue, not a functional bug | `apps/web/server/routers/metric.ts` | Split `gate` into its own `routers/gate.ts` file when touched for other reasons in M16 (do not do a drive-by rename outside that milestone) | M16 |
| `apps/web/app/(app)/p/[projectId]/approvals/page.tsx` becomes redundant once Work board ships | — | Deleted once `work.tsx`'s blocked/needs-approval view covers its function; not left as a second, now-orphaned approvals surface | M12 |
| `pack/[section]` route and `PackSectionView` component | `apps/web/app/(app)/p/[projectId]/pack/[section]/page.tsx` | Renamed/generalized in place per `06-web-frontend-ia-delta.md` §1; the old route becomes a redirect for one deprecation window (tracked as a single follow-up task, not left indefinitely), then deleted | M9, cleanup by M13 |
| `journey-stepper.tsx` / `lib/journey.ts` | `apps/web/components/ui/journey-stepper.tsx`, `apps/web/lib/journey.ts` | Removed from primary chrome in M9; deleted outright once no remaining call site exists (check at the end of M13) | M9–M13 |
| `project.answerClarification` | `apps/web/server/routers/project.ts` | Superseded by `conversation.send`; kept functional for exactly one milestone (M10) to avoid breaking in-flight work, then deleted along with its call site in `project-desk.tsx` | M10 |
| `gate_blocked` error code and its 403 wiring | `apps/web/server/trpc.ts`, `docs/plan/implementation/05-api-and-backend-architecture.md`'s error map | Removed per decision D12 | M16 |

## 4. What is explicitly not touched by this plan

Per the reuse map in `01-gap-analysis-and-decisions.md` §3: `packages/document-intelligence`, `packages/artifacts`, the MCP bridge, the provider/BYOK system, `packages/policy`'s calculators, the AWS CDK stacks in `infra/cdk`, and the entire auth stack. No milestone in §2 touches these; if implementation work in one of these milestones seems to require a change here, that is a signal to re-check the gap analysis before proceeding, not a reason to silently expand scope.
