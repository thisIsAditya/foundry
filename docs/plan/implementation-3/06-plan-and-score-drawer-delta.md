# Plan and score drawer delta

**Implements:** feedback items 2, 5; decision D4, D5. Reuses `plan/page.tsx`'s and `plan/[section]/section-detail.tsx`'s existing logic, mounted inside `drawer-shell.tsx` (`03-app-shell-and-navigation-delta.md` §4) instead of as standalone routes.

## 1. Drawer content

Two-level drawer, matching what `plan/page.tsx` (index) and `plan/[section]/page.tsx` (detail) already do — reused as one drawer with internal master/detail state instead of two routes:

- **List level:** all 17 `BusinessModelSectionKeys` from `pack.listBusinessModelSections`, each with its `businessModelSectionStatusPresentation` badge (`packages/ui/src/status.ts`, unchanged) — this is `plan/page.tsx`'s existing rendering, moved.
- **Detail level:** clicking a section shows `section-detail.tsx`'s existing diff/provenance/citation rendering (`pack.getDiff`, `pack.acceptSection`, `pack.acceptAllSafeSections` — all unchanged procedures from `implementation-v2/04`).

## 2. The score headline — full-size `Gauge`

At the top of the drawer, above the section list: the large (`size="lg"`) `Gauge` from `02-design-system-delta.md` §4, `value={score.getCurrent().overall}`, with its band label (`gaugeBandPresentation`) printed underneath in Space Grotesk. Below it, unchanged data, new layout: the per-dimension `ScoreDimensionChip` row (`components/score/score-dimension-chip.tsx`, reused) and the known/assumed/missing counts (`overview.tsx`'s existing derivation from `pack.listBusinessModelSections`, moved here since the Overview route no longer exists — `03` §6).

## 3. Drawer trigger = small `Gauge`

The header icon cluster's Plan trigger (`03` §5) is the `size="sm"` `Gauge`, same `value`/band logic, single source (`score.getCurrent`, cached by TanStack Query so both the trigger and the drawer's headline read the same in-flight value with no duplicate fetch — `useQuery`'s default caching already provides this, no new query key needed).

## 4. Score trend and explanation

`score.getHistory`/`score.explain` (existing procedures, currently unused by any screen per the `06-web-frontend-ia-delta.md` §7 note that the scorecard was still to be built) get their first UI here: a small trend sparkline (whichever charting library is already pinned — `implementation-v2/06` §7 names Visx or Recharts; do not add a second one) beneath the Gauge, and `score.explain(dimension)`'s text surfaced when a founder taps a `ScoreDimensionChip`. This closes the gap the v2 plan left open, inside the drawer that already needs the data.

## 5. Deletions

`(app)/p/[projectId]/plan/page.tsx`, `plan/[section]/page.tsx` (routes only — `section-detail.tsx` itself is reused). The `/pack/[section]` redirect `implementation-v2/09-migration-sequencing-and-cleanup.md` §3 scheduled for deletion is removed now if it has not been already (`10-milestones-sequencing-and-cleanup.md` §3 confirms current status before this milestone starts).
