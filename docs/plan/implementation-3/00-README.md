# Implementation plan 3 — Chat-first shell and one-step venture onboarding

**Status:** implementation baseline
**Date:** 18 August 2026
**Scope:** a redesign of the `apps/web` founder experience around a persistent co-founder chat rail, phase-focused main content, and one-click access to Plan/Work/Research/Decisions — replacing today's top-nav-plus-docked-panel information architecture. Also merges workspace and project creation into one step and turns venture creation into a single elaborative composer that runs the first draft end to end.
**Codename:** unchanged — `Foundry`.
**Non-scope:** mobile (`apps/mobile`) is untouched by this plan (decision D8 in `01-decisions-and-scope.md`). Domain model, database schema, scoring rubric, agent runtime, and policy/gates packages are reused as-is; this plan touches them only where §`09-backend-and-trpc-delta.md` says so.

## Why this folder exists and how it relates to the other layers

Four layers of planning documents now exist. Read them in this order:

1. `docs/plan/` (`00`–`13`) and `docs/plan/implementation/` (`00`–`14`) — original product and system design. Still authoritative for anything not explicitly changed below.
2. `docs/plan/implementation-v2/` — the co-founder/scoring/domain rebuild. **Still authoritative** for the domain model, database schema, backend services, agent runtime, scoring rubric, and mobile IA. This plan supersedes only `implementation-v2/06-web-frontend-ia-delta.md`'s navigation model (§1 route table, §3 persistent panel, final nav list) — the chat-first shell in this plan replaces the "7-item top nav + docked side panel" IA. Every backend procedure, entity, and status vocabulary `06` and the other v2 documents reference is still reused unchanged.
3. `docs/02-product-requirements/` — still the product direction; nothing here contradicts it. This plan is a UX-quality pass on top of it, driven by direct founder feedback.
4. This folder, `docs/plan/implementation-3/` — the build specification for the chat-first web redesign.

## Document map

| Document | Purpose |
|---|---|
| [01-decisions-and-scope.md](01-decisions-and-scope.md) | Every decision this plan makes (D1–D8), with rationale, and what is reused/changed/removed |
| [02-design-system-delta.md](02-design-system-delta.md) | The bespoke palette, type system, and "Gauge" signature — token changes in `packages/ui` |
| [03-app-shell-and-navigation-delta.md](03-app-shell-and-navigation-delta.md) | The new shell: sticky 40% chat rail, phase-focused main area, four one-click drawers, settings |
| [04-venture-creation-and-onboarding-delta.md](04-venture-creation-and-onboarding-delta.md) | Single-workspace product model, the zero-state composer, attachments, synchronous first draft |
| [05-cofounder-chat-delta.md](05-cofounder-chat-delta.md) | Composer redesign: effort presets, attachments, collapsible tool-call step trace |
| [06-plan-and-score-drawer-delta.md](06-plan-and-score-drawer-delta.md) | The Plan drawer, the score Gauge, and the orange/amber/green state bands |
| [07-work-drawer-delta.md](07-work-drawer-delta.md) | The Work drawer (kanban, founder tasks, approvals) as a one-click overlay |
| [08-research-and-decisions-drawers-delta.md](08-research-and-decisions-drawers-delta.md) | The Research and Decisions drawers |
| [09-backend-and-trpc-delta.md](09-backend-and-trpc-delta.md) | The (small) set of backend/tRPC/domain changes every frontend document above depends on |
| [10-milestones-sequencing-and-cleanup.md](10-milestones-sequencing-and-cleanup.md) | Ordered milestones grouping work that ships together, and the explicit dead-code cleanup list |

## Non-negotiable working rules for this piece of work

These extend, not replace, `docs/plan/implementation/13-coding-standards-and-conventions.md` and `implementation-v2/00-README.md`'s rules 1–8.

1. **Reuse before you build.** This plan is almost entirely a frontend/IA rewrite. Before adding a tRPC procedure, table, or service, check `09-backend-and-trpc-delta.md` and the existing routers/services inventoried throughout this folder — most of what's needed (conversation, jobs, founder tasks, scoring, evidence upload, provider connections) already exists and only needs new rendering or a small additive field.
2. **No orphaned or unwired code, in either direction.** Every component this plan introduces is mounted somewhere reachable in one click. Every component this plan's shell replaces (`project-nav.tsx`, the docked variant of `cofounder-panel.tsx`, `home-dashboard.tsx`, `workspace-projects.tsx`'s create-workspace form, `approvals-queue.tsx` as a standalone route) is **deleted in the same change** that replaces it — never left dormant behind a dead route. See the explicit list in `10-milestones-sequencing-and-cleanup.md` §3.
3. **No narrative comments, anywhere.** Comments explain non-obvious *why* — a rule, a trade-off, a citation to this plan — never *what*. Do not add a comment that restates the line below it. Do not add a comment introducing a component, hook, or function; the name does that job.
4. **Clean up your own mess.** If an implementation step produces a temporary scaffold, an intermediate prop, an unused export, or a component that a later step in the same milestone replaces, delete it before the milestone is considered done. Do not merge a milestone with commented-out code, unused imports, or a component kept "just in case." Run lint and typecheck as part of every milestone's definition of done (§`10`).
5. **Follow the existing coding conventions exactly.** TanStack Query via `useTRPC()` (`lib/trpc/client.ts`) for all client reads/mutations, RSC + `lib/trpc/server.ts` for server-rendered reads, Zustand for cross-route client state (the pattern `use-project-stream.ts` already established), SSE for live updates, Zod schemas in `@foundry/api-contracts` as the single input/output contract. No new state-management library, no new fetching library, no new component-styling approach (Tailwind utility classes + the `packages/ui` token layer only).
6. **Design tokens have one source of truth.** Every color, font, radius, and spacing value this plan introduces is added to `packages/ui/src/tokens/*.ts` and `packages/ui/src/theme.css` (kept in sync, per the existing file header comment) — never hard-coded as a literal hex or px value in a component file.
7. **Every new surface degrades gracefully.** No blank drawer, no blank focused-content area. Every query has an explicit loading, error, and empty state, matching the existing `EmptyState`/`alert`/`hint` patterns already used throughout `apps/web`.
8. **This plan does not touch scoring math, gate logic, or the domain/DB schema beyond the additive fields listed in `09`.** If a screen needs a number the backend doesn't compute today, the fix is a new pure projection function or a thin additive read-model field — never a client-side recomputation of something scoring/policy already owns.

## Reading order

1. `01` to see every decision and why, before touching any other document.
2. `02` — the design system every later document's components are built from.
3. `03` — the shell all other screens live inside.
4. `04` and `05` together — the two founder-facing entry points (creating a venture, talking to the co-founder) that most directly implement the feedback.
5. `06`, `07`, `08` — the four drawers, independent of each other, each buildable in parallel once `03` lands.
6. `09` — the backend deltas `04`–`08` depend on; implement ahead of or alongside the frontend milestone that first needs each item.
7. `10` before writing a line of code — the milestone sequencing and cleanup list.
