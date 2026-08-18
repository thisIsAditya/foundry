# App shell and navigation delta

**Implements:** feedback items 1, 3, 4, 5; decisions D2, D5. Replaces `apps/web/app/(app)/p/[projectId]/layout.tsx`, `components/chrome/cofounder-panel.tsx`, and `components/chrome/project-nav.tsx` in the same change (`00-README.md` rule 2).

## 1. Route changes

| Today | Becomes |
|---|---|
| `(app)/p/[projectId]/page.tsx` (Overview) | Removed as a route. Its content becomes the `diagnose`/default focused view (§3) |
| `(app)/p/[projectId]/co-founder/page.tsx` | Removed as a route. Chat is never a destination you navigate to — it is always present (§2) |
| `(app)/p/[projectId]/plan/**`, `work/**`, `research/**`, `decisions/**` | Removed as standalone routes. Content is reused unchanged, mounted inside drawers (§4, and `06`/`07`/`08`) |
| `(app)/p/[projectId]/settings/page.tsx`, `model-provider-panel.tsx` | Removed as a standalone route. Content reused, mounted inside the Settings panel (§5) |
| `(app)/p/[projectId]/approvals/**` | Deleted outright — already folded into Work board's `blocked` view per `implementation-v2/06` §1; that fold-in is finished here by removing the route entirely |
| — (none today) | `(app)/p/[projectId]/layout.tsx` becomes the entire screen: it renders the chat rail, the focused main area, and the four drawers + settings panel as siblings, all client-state-driven (query params / a small Zustand store), never as separate page navigations |

`project.id` remains the only URL segment under a project; which drawer is open (if any) is UI state, not routing, so refreshing the page always lands on the phase-focused main view with drawers closed — deep links into a specific job/task/section (`?job=`, `?task=`, `?section=`) are preserved as query params on the same URL and open the relevant drawer on load, replacing today's separate-route deep links (`work?job=`, `plan/[section]`) with `?panel=work&job=` etc. on the single project URL.

## 2. The chat rail

New `components/chrome/cofounder-rail.tsx` replaces `cofounder-panel.tsx` (deleted). Structural rules:

- Fixed at **40% viewport width** on `lg+` (`≥1024px`), left-aligned, `position: sticky` with its own internal scroll — the rail's height tracks the viewport, not the page, so scrolling the focused main area on the right never moves the chat out of view (feedback item 4, "chat screen on the left sticky... we scroll off the right content").
- Below `lg`, the rail collapses to a bottom sheet reachable via a persistent floating action button (reusing the existing `.cofounder-fab` pattern, restyled with the new tokens) rather than a separate route — there is still no `/co-founder` page to navigate to; the sheet is an overlay over the same URL.
- Renders `ConversationThread` (`components/conversation/conversation-thread.tsx`, reused, extended per `05-cofounder-chat-delta.md`) at full (non-`compact`) size always — the `compact` prop that shrank it for the old docked panel is deleted, since the rail is never docked-small anymore, it is either full-width-40% or a full sheet.
- Mounted once per project in the layout (same single-instance-across-navigation pattern the old panel used via `use-project-stream.ts`'s per-project Zustand store) — scroll position and unread state survive every drawer open/close, matching item 4's "focus-based environment" intent.

## 3. Phase-focused main area

New `components/chrome/phase-focus.tsx`, replacing `overview.tsx`'s role as the default view. Instead of a fixed dashboard, it renders **one card set keyed to the founder's current journey phase**, using the existing `JourneyPhases`/`JOURNEY_STEPS` (`packages/domain/src/status/journey-status.ts`, `apps/web/lib/journey.ts`) as the copy source that `implementation-v2/06` had flagged for possible deletion — this plan promotes them to primary content instead.

Phase is **derived, not read from the stale `project.current_phase` column** (`09-backend-and-trpc-delta.md` §1 explains why and adds `derivedPhase` to `DeskSummarySchema`). The focus area renders, above the fold, only what matters for that phase:

- A one-line phase eyebrow ("Phase 3 of 9 · Evidence") in Space Grotesk, small, using `journeyStepIndex`.
- The phase's title/description from `JOURNEY_STEPS` (reused verbatim).
- The 2–3 pieces of `OverviewSummary` data most relevant to that phase (e.g., `diagnose`/`problem` phases show `topAssumptions` and the proposed research job; `evidence` phase shows `waitingFounderTasks` and interview count; `willingness_to_pay` phase shows the WTP-specific score reason) — a small `phaseFocusFields: Record<JourneyPhase, (keyof OverviewSummary)[]>` map in `phase-focus.tsx` selects which existing `OverviewSummary` fields to show; no new query, only different rendering of `project.getDeskSummary`'s existing response.
- One recommended next action (`score.getCurrent().topActions[0]`, unchanged data source), always shown regardless of phase, since it is the single most decision-relevant fact on every phase.

This is what replaces `home-dashboard.tsx`'s and `overview.tsx`'s "show everything at once" composition — per item 5, information about one thing (the current phase) lives in one place, and everything else is one click away in a drawer, not scrolled past.

## 4. The drawer system

New `components/chrome/drawer-shell.tsx` — one generic sliding-overlay component (`position: fixed`, right-anchored, `width: min(640px, 100vw - <rail width>)` on `lg+`, full-width below `lg`) parameterized by which drawer is open. Four drawers (`plan`, `work`, `research`, `decisions`) share this shell; each mounts its existing content component unchanged:

| Drawer | Content component (reused) |
|---|---|
| Plan | `plan/[section]/section-detail.tsx` + a new section-list view, per `06` |
| Work | `components/work/work-board.tsx`, `approvals-queue.tsx`, `founder-task-card.tsx`, per `07` |
| Research | Content currently in `research/page.tsx`, per `08` |
| Decisions | Content currently in `decisions/decisions-list.tsx`, per `08` |

Open/close state lives in a small `useDrawerState()` hook backed by the URL's `?panel=` query param (so the drawer state is shareable/refreshable, not just in-memory) — reusing Next.js's `useSearchParams`/`router.replace` pattern already used by `WorkViewTabs` (`components/work/work-board.tsx`), not a new routing mechanism.

## 5. Header icon cluster and Settings

A slim header inside `(app)/p/[projectId]/layout.tsx`, always visible above both the rail and the focus area, containing left-to-right: venture name, the small `Gauge` (opens the Plan drawer, D4/D5), then four icon buttons (Work, Research, Decisions, and a gear for Settings). Settings opens the same `drawer-shell.tsx` component but never shows a Gauge/badge — it is deliberately visually quieter than the other four, per D5's "not a fifth peer." Settings' content is `model-provider-panel.tsx` (reused unchanged) plus whatever `settings/page.tsx` already rendered; both project-level and (per D6) the now-implicit single-workspace-level settings collapse into this one panel with two tabs (Project, Provider & budget) instead of two separate routes.

## 6. Deletions in this milestone

`components/chrome/project-nav.tsx`, `components/chrome/cofounder-panel.tsx` (docked variant and `CofounderCollapsedLink`), `apps/web/app/(app)/p/[projectId]/page.tsx`, `overview.tsx`, `co-founder/page.tsx`, `plan/page.tsx` (route only — its list-rendering logic moves into the drawer per `06`), `work/page.tsx` (route only, same treatment per `07`), `research/page.tsx` and `decisions/page.tsx` (routes only, per `08`), `approvals/page.tsx` and the standalone `approvals-queue.tsx` route wiring (component itself is reused inside the Work drawer), `settings/page.tsx` (route only).
