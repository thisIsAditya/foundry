# Research and Decisions drawers delta

**Implements:** feedback items 2, 3, 5; decision D5. Reuses `research/page.tsx`'s and `decisions/decisions-list.tsx`'s existing content, mounted inside `drawer-shell.tsx` instead of standalone routes.

## 1. Research drawer

Content is `research/page.tsx`'s existing composition unchanged: sprint preview ("before starting" view, backed by `sprint.preview`), sources/citations/findings/conflicts/stale markers grouped by `affectedSectionKeys` (backed by `evidence.list`/`evidence.search`/`evidence.listFindings`, all unchanged). The only rendering addition: findings and citations linked to from a `cited_finding` chat block (`conversation-message-view.tsx`) now open directly into this drawer at the relevant finding (via the same `?panel=research&finding=` query-param convention `03` §4 establishes) instead of navigating to a full page — the link target string changes, the destination component does not.

## 2. Decisions drawer

Content is `decisions-list.tsx`'s existing composition unchanged: GO/PIVOT/KILL outcomes, score before/after per decision (`implementation-v2/06` §1's existing extension of this route). Same drawer-mount treatment as Research.

## 3. Trigger badges

Research's header icon carries a badge when a proposed research job is waiting to start (`job.list` filtered to `jobKind: 'research', status: 'proposed'` — the same derivation `overview.tsx` already performs, moved). Decisions' header icon carries a badge when the most recent decision's `createdAt` (from the existing decisions list read) is newer than a `lastViewedDecisionsAt` timestamp the drawer writes to `localStorage` on open — a client-only comparison against data already being fetched, not a new backend concept or a second SSE-driven unread mechanism (which exists for conversation messages specifically because a message is the thing being streamed; a decision is a low-frequency, already-fetched list, not a streamed event type).

## 4. Deletions

`(app)/p/[projectId]/research/page.tsx`, `(app)/p/[projectId]/decisions/page.tsx` (routes only — `decisions-list.tsx` itself is reused).
