# Milestones, sequencing, and cleanup

Six milestones, ordered by dependency. Each is sized to ship as one reviewable change. Milestones marked "parallel-safe" have no dependency on each other and can be built in either order, or simultaneously, once their listed prerequisites exist.

## Milestone map

| # | Milestone | Contains | Depends on | Parallel-safe with |
|---|---|---|---|---|
| M1 | Design system foundation | `02-design-system-delta.md` in full: palette, type, `Gauge` component, `theme.css` sync | Nothing | M3 |
| M2 | App shell and navigation | `03-app-shell-and-navigation-delta.md` in full: chat rail, phase-focus area, `drawer-shell.tsx`, header icon cluster, all route deletions listed in `03` §6 | M1 | — (everything else depends on this) |
| M3 | Early backend deltas | `09-backend-and-trpc-delta.md` §1 (default workspace) and §2 (`derivedPhase`) | Nothing | M1 |
| M4 | Venture creation and onboarding | `04-venture-creation-and-onboarding-delta.md` in full + `09` §3 | M1, M3 | M5 (once M2 lands for both) |
| M5 | Co-founder chat delta | `05-cofounder-chat-delta.md` in full + `09` §4 | M1, M2 | M4, M6 |
| M6 | Four drawers | `06`, `07`, `08` in full | M2 | M4, M5 — and the four drawers are parallel-safe with each other |

Recommended sequencing for a single implementer: **M1 → M3 → M2 → {M4, M5, M6 in any order or interleaved}**. M2 is the pivot point — nothing in M4/M5/M6 can be reviewed end-to-end (drawer mounted, rail visible) until it lands, but M4's and M5's backend halves (`09` §3, §4) have no UI dependency and can be written before M2 if that's more convenient for a given implementer's flow.

## Definition of done, every milestone

Restating `00-README.md` rules 2–4, 6–7 as a literal checklist to run before considering any milestone complete:

- [ ] Every component/route this milestone deletes is actually deleted from the repo — not commented out, not left behind an unreachable route.
- [ ] Every component/route this milestone adds is mounted and reachable in the running app in one click from the shell, per its document's spec.
- [ ] No comment in any file touched restates what the line below it does. Comments exist only for a non-obvious rule, trade-off, or a citation back to this plan.
- [ ] No unused import, prop, export, or temporary scaffold left behind — if a step in the milestone produced one en route to the final state, it is removed before the milestone is done, not left "for later."
- [ ] Every new color/font/spacing value lives in `packages/ui/src/tokens/*` or `theme.css`; zero hard-coded hex/px literals in component files.
- [ ] Every new query/mutation-backed surface has an explicit loading state, error state, and empty state.
- [ ] `pnpm lint`, `pnpm typecheck`, and the targeted test suites for any touched package pass before the milestone is merged.

## Explicit cleanup list

Files/routes this plan replaces, to be deleted in the same change as their replacement (not before, not left dormant after):

| File / route | Deleted in | Reason |
|---|---|---|
| `apps/web/components/chrome/project-nav.tsx` | M2 | Replaced by the header icon cluster (`03` §5) |
| `apps/web/components/chrome/cofounder-panel.tsx` (docked variant + `CofounderCollapsedLink`) | M2 | Replaced by `cofounder-rail.tsx` (`03` §2) |
| `apps/web/app/(app)/p/[projectId]/page.tsx`, `overview.tsx` | M2 | Replaced by `phase-focus.tsx` (`03` §3) |
| `apps/web/app/(app)/p/[projectId]/co-founder/page.tsx` | M2 | Chat is never a navigation destination (`03` §1) |
| `apps/web/app/(app)/p/[projectId]/approvals/page.tsx` | M6 | Folded into the Work drawer's `blocked` view (`07` §3) |
| `apps/web/app/(app)/p/[projectId]/plan/page.tsx`, `plan/[section]/page.tsx` (routes only) | M6 | Content moves into the Plan drawer (`06` §5) — `section-detail.tsx` itself is reused |
| `apps/web/app/(app)/p/[projectId]/work/page.tsx` (route only) | M6 | Content moves into the Work drawer (`07` §3) — `work-board.tsx` itself is reused |
| `apps/web/app/(app)/p/[projectId]/research/page.tsx`, `decisions/page.tsx` (routes only) | M6 | Content moves into their drawers (`08` §4) |
| `apps/web/app/(app)/p/[projectId]/settings/page.tsx` (route only) | M2 | Content moves into the Settings panel (`03` §5) — `model-provider-panel.tsx` itself is reused |
| `apps/web/app/(app)/home/home-dashboard.tsx` | M4 | Replaced by the composer / ventures list (`04` §3) |
| `apps/web/app/(app)/w/[workspaceId]/page.tsx`, `workspace-projects.tsx`, `settings/page.tsx` | M4 | Multi-workspace UI removed entirely (D6) |
| Any remaining `/pack/[section]` redirect from `implementation-v2/09-migration-sequencing-and-cleanup.md` §3 | M6 | Its deprecation window has closed; verify at milestone start and delete if still present |

Any file in this list still referenced by a test after its milestone lands is a bug in that milestone, not a reason to keep the file — update or delete the test in the same change.

## Explicit non-goals for this plan

Restating in one place, gathered from `01-decisions-and-scope.md`: no mobile changes (D8), no raw model chain-of-thought capture (D2), no per-message provider switching (D3), no multi-workspace UI (D6), no scoring/gate logic change, no destructive migration, no new state/fetching/styling library.
