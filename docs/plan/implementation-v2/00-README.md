# Implementation plan v2 — Co-founder redesign

**Status:** historical implementation baseline
**Date:** 18 August 2026
**Scope:** the concrete build specification for implementing `docs/02-product-requirements/` on top of the existing `Foundry` codebase, superseding the parts of `docs/plan/` and `docs/plan/implementation/` that the new product requirements make obsolete.
**Codename:** unchanged — `Foundry`. No package, table, or resource rename is introduced by this plan beyond what is listed in `01-gap-analysis-and-decisions.md`.

> **Do not implement from this folder.** It preserves the intermediate
> co-founder redesign that retained Magentic sprints, worker pools, critic
> logic, a 17-section instant draft, and the scorecard. Use the
> [current plan index](../README.md) and
> [implementation contracts and cleanup runbook](../18-implementation-contracts-and-cleanup.md)
> instead.

## Historical relationship to the other planning layers

This folder records an intermediate planning era:

1. `docs/plan/` (`00`–`13`) — original product and system design.
2. `docs/plan/implementation/` (`00`–`14`) — original build specification.
3. This folder — the intermediate co-founder/scoring redesign.

All three are superseded for active product work. The founder-journey
requirements and plans named by `docs/README.md` are authoritative.

This folder is **additive and corrective**, not a rewrite. It assumes the codebase inventoried in `01-gap-analysis-and-decisions.md` §3 already exists and is largely correct: a working pnpm/Turbo monorepo, Next.js 16 web app, Expo 57 mobile app, a BullMQ worker, a real Postgres schema with 9 migrations, tRPC routers covering workspaces through gates, and an agent runtime with a working orchestrator/sprint/critic loop. **Do not re-scaffold anything that already works.**

## Document map

| Document | Purpose |
|---|---|
| [01-gap-analysis-and-decisions.md](01-gap-analysis-and-decisions.md) | What in the existing plan/code is reusable, what must change, what is net-new, and every architecture decision this plan makes to reconcile them |
| [02-domain-model-delta.md](02-domain-model-delta.md) | New/changed entities, value objects, and status vocabularies in `@foundry/domain` |
| [03-database-schema-delta.md](03-database-schema-delta.md) | New migrations, altered tables, new indexes, and the "17-section view is a projection" rule |
| [04-backend-services-and-trpc-delta.md](04-backend-services-and-trpc-delta.md) | New/changed service classes and tRPC procedures |
| [05-agent-runtime-and-cofounder-delta.md](05-agent-runtime-and-cofounder-delta.md) | The co-founder control plane, durable conversation, research runtime, and context assembly changes |
| [06-web-frontend-ia-delta.md](06-web-frontend-ia-delta.md) | New web information architecture, routes, and components |
| [07-mobile-frontend-ia-delta.md](07-mobile-frontend-ia-delta.md) | New mobile information architecture, capture flows, and new native dependencies |
| [08-scoring-service-spec.md](08-scoring-service-spec.md) | The deterministic 7-dimension scorecard: `@foundry/scoring` |
| [09-migration-sequencing-and-cleanup.md](09-migration-sequencing-and-cleanup.md) | Ordered milestones mapped to the 8 new delivery slices, and the explicit dead-code/unwired-component cleanup list |
| [10-testing-and-eval-delta.md](10-testing-and-eval-delta.md) | What changes in the testing and eval strategy |

## Non-negotiable working rules for this piece of work

These apply to every document in this folder and to whoever implements it. They are additions to, not replacements of, `docs/plan/implementation/13-coding-standards-and-conventions.md`.

1. **Reuse before you build.** Before adding a table, package, service, component, or tRPC procedure, check whether an equivalent already exists (see the inventory in `01-gap-analysis-and-decisions.md` §3) and extend it. A large fraction of what the new product requirements ask for already has a working, tested foundation (evidence pipeline, MoneyRules/calculators, provider/BYOK, approvals, sprint execution engine, MCP bridge) — the work is mostly **projection, extension, and renaming at the product-facing layer**, not a rewrite of the domain/persistence layer.
2. **No orphaned or unwired code.** Every entity added must have a repository, every repository used by a service, every service exposed through a router procedure actually called from a web or mobile screen, and every screen reachable from navigation. If you introduce a table, type, or component and the plan does not end with it wired end-to-end, do not merge it. Conversely, when this plan replaces a screen, procedure, or table, the old one is deleted in the same change, not left dormant (see the cleanup list in `09-migration-sequencing-and-cleanup.md` §3 for the known dormant/placeholder code that already exists and must be resolved as part of this work, e.g. `apps/mobile/app/(app)/desk.tsx`).
3. **No narrative comments.** Comments explain non-obvious *why*, never *what*. No comment should restate the line below it. This is a strengthening of the existing rule in `docs/plan/implementation/13-coding-standards-and-conventions.md` — do not write comments during implementation of this plan unless they capture a rule, a citation to this plan, or a trade-off that is not obvious from the code.
4. **Additive schema changes.** No migration in this plan drops or renames an existing column/table that other working code depends on unless the same migration also removes every reference to it (see rule 2). Prefer new tables and additive columns over destructive change, consistent with `docs/plan/implementation/06-database-schema.md`'s migration workflow (hand-written `.up.sql`/`.down.sql`, never edit an applied migration).
5. **One source of truth per fact.** Where the new product requirements ask for a view that does not map to a clean new table (most visibly, the 17-section business model view), the correct answer is a **read-model projection service** over the existing relational entities, not a duplicate copy of the data. See `03-database-schema-delta.md` §2.
6. **Every new library choice is justified and version-pinned** the same way `docs/plan/implementation/00-tech-stack-and-versions.md` pins the existing stack. New libraries introduced by this plan (`@dnd-kit/*` for the web work board, `expo-audio` for mobile voice capture) are listed in `01-gap-analysis-and-decisions.md` §5 with the versions and compatibility research behind them. Do not add a memory/RAG-as-a-service SDK (e.g. Mem0, db0) for the co-founder's durable memory — see `05-agent-runtime-and-cofounder-delta.md` §2 for why, and build the summarizer/preference-extractor in-repo instead, consistent with `docs/plan/README.md`'s "domain layer remains system of record" constraint.
7. **Gates stop being hard blockers of unrelated work.** Gate A/B/C evaluation logic (`packages/policy/src/gate-a.ts`, `gate-b.ts`, `gate-c.ts`) is reused as-is — it is good, tested, deterministic logic — but it is re-wired as one input into the score (`08-scoring-service-spec.md`) rather than as a 403 that blocks the founder from researching, drafting, or reviewing other sections. See decision D12 in `01-gap-analysis-and-decisions.md`.
8. **Every screen and procedure changed in this plan must degrade gracefully**, per the shared product requirements §12: no blank screens, explicit loading/paused/failed/retry states, and a plain-language explanation on every error. This is not new — it is already partially implemented (`AppError` classes, `StreamEvent` union) — extend the existing pattern, do not invent a second one.

## Reading order

1. `01` to understand what changes and why, and to see the full reuse/rewrite/net-new map before touching any other document.
2. `02` and `03` together — the data layer every later document assumes.
3. `04` and `05` together — backend services, tRPC, and the agent runtime/co-founder changes that sit on top of `02`/`03`.
4. `06` and `07` — web and mobile IA, which consume `04`.
5. `08` as a deep dive on the scoring service referenced throughout `04`–`07`.
6. `09` before writing a line of code — the sequencing and the concrete cleanup list.
7. `10` as a standing reference for how correctness is verified.
