# Work drawer delta

**Implements:** feedback items 2, 3, 5; decision D5. Reuses `components/work/work-board.tsx`, `approvals-queue.tsx`, `founder-task-card.tsx`, `job-card.tsx` verbatim, mounted inside `drawer-shell.tsx` instead of `(app)/p/[projectId]/work/page.tsx`.

## 1. Drawer content

`WorkBoard`'s existing view switch (`kanban`/`mine`/`timeline`/`cost`/`completed`/`blocked`) is unchanged (`components/work/work-board.tsx`) — `WorkViewTabs` moves from a page-level nav to a small tab row at the top of the drawer, same component, same `?view=` query param mechanic, now read relative to the drawer's own `?panel=work&view=` URL shape (`03` §4) instead of a dedicated route's search params.

The kanban `DndContext`/drag logic, `KanbanColumn`, `DraggableJob`, `CostView`, and `FounderTaskCard`/`FounderTaskDetail` are all reused with zero logic changes — this delta is a mount-location change, not a rebuild. The drawer's fixed width (`min(640px, ...)`, `03` §4) means the kanban grid's `md:grid-cols-2 xl:grid-cols-4` breakpoints (`globals.css` `.kanban`) will realistically render 1–2 columns visible without horizontal scroll inside the drawer on most screens — this is accepted as correct for a drawer (a focused, narrower view of the board) rather than the full-width page it used to be; a founder doing heavy kanban triage still has the option to widen by closing the chat rail's mobile-sheet-equivalent, but on desktop the rail stays put per item 4, and the kanban view's own internal horizontal scroll (already how `.kanban`'s grid degrades on narrow viewports today) handles the rest.

## 2. Drawer trigger badge

The Work icon in the header cluster (`03` §5) carries a small numeric badge — count of jobs in `needs_founder` + `needs_approval` status, reusing `job.list({ view: 'kanban' })`'s existing response, no new query — so "everything accessible at one click" (item 3) also means the founder can tell *before* clicking whether something is waiting, not just after opening the drawer.

## 3. Deletions

`(app)/p/[projectId]/work/page.tsx`, `(app)/p/[projectId]/approvals/page.tsx` (route only — `approvals-queue.tsx` itself is reused as the `blocked` view's content, exactly as `implementation-v2/06` §1 already specified; this milestone finishes removing the standalone route that decision left in place).
