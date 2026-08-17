# Web frontend architecture (Next.js)

Implements the web half of `plan/06-web-and-mobile-experience.md` on the stack fixed in `00-tech-stack-and-versions.md`. Read `01-monorepo-and-project-structure.md` §2 for the file tree this document assumes.

## 1. Rendering model

| Concern | Rule |
|---|---|
| Data fetching | Server Components fetch through the RSC-side tRPC caller (`lib/trpc/server.ts`). Client Components fetch through the browser tRPC client (`lib/trpc/client.ts`), which wraps `@trpc/tanstack-react-query`. |
| Mutations | Prefer Server Actions for simple, web-only mutations (e.g., toggling a UI preference). Use tRPC mutations for anything the mobile app must also perform (approve, upload, start sprint) so the contract is shared. |
| Streaming | Long-lived agent/sprint activity streams via the dedicated SSE route (`app/api/stream/[projectId]/route.ts`), not through tRPC subscriptions — see `07-caching-queues-and-streaming.md` for why. |
| Caching | Use Next.js `fetch`/`unstable_cache` only for public marketing content. Authenticated app data is never cached at the framework layer because it is per-workspace/per-project; caching lives in TanStack Query (client) and Redis (server), both with explicit invalidation on domain events. |
| Rendering strategy | `(marketing)` routes are static/ISR. `(app)` routes are dynamic (`export const dynamic = 'force-dynamic'` at the segment layout) because every page depends on the caller's workspace/project scope. |

## 2. Route groups and ownership

Matches the tree in `01-monorepo-and-project-structure.md` §2.

| Route group | Auth | Purpose |
|---|---|---|
| `(marketing)` | Public | Landing, pricing, legal, sign-up entry |
| `(app)/w/[workspaceId]` | Session required, workspace membership required | Workspace dashboard, members, provider connections, budgets |
| `(app)/p/[projectId]` | Session required, project access required | Founder Desk and every project-scoped screen from `plan/06` §6 |

`middleware.ts` runs on the Node.js middleware runtime (`export const config = { runtime: 'nodejs' }`, stable since Next.js 15.5) so it can call Better Auth's `auth.api.getSession` directly — no separate edge-safe auth config to keep in sync. It redirects unauthenticated requests to sign-in before any route in `(app)` renders. Workspace/project **authorization** (does this user have access to *this* workspace/project) is re-checked server-side inside the tRPC procedure — middleware never becomes the authorization source of truth (see `09-authentication-and-security.md`).

## 3. Screen-to-procedure mapping

Each screen in `plan/06-web-and-mobile-experience.md` §6 maps to a small, explicit set of tRPC procedures so a coding agent never has to guess which endpoint backs a screen.

| Screen | Primary read procedure(s) | Primary mutations |
|---|---|---|
| Founder Desk | `project.getDeskSummary` | `project.answerClarification`, `sprint.preview`, `sprint.start` |
| Sprint Preview / Activity | `sprint.getContract`, `sprint.getActivity` (paged) | `sprint.approvePlan`, `sprint.pause`, `sprint.resume`, `sprint.stop` |
| Pack section view | `pack.getSection`, `pack.getDiff` | `pack.acceptRevision`, `pack.rejectRevision`, `pack.addFounderAssertion` |
| Evidence Library | `evidence.list`, `evidence.search`, `evidence.getCitation` | `evidence.createUploadIntent`, `evidence.registerUrl`, `evidence.deleteSource` |
| Approvals queue | `approval.list`, `approval.getPayload` | `approval.approve`, `approval.reject` |
| Decisions / Gate C | `decision.list` | `decision.record`, `gate.evaluate` |
| Artifact Viewer | `artifact.list`, `artifact.getVersion` | `artifact.generate`, `artifact.regenerate`, `artifact.export` |
| Workspace settings | `provider.listConnections`, `integration.list`, `member.list` | `provider.connect`, `integration.connect`, `member.invite` |
| Account settings → MCP servers | `mcpServer.list` | `mcpServer.add`, `mcpServer.remove`, `mcpServer.toggle`, `mcpServer.testConnection` |

MCP servers are a **user**-level setting, not a workspace one — the screen lives under the founder's personal account settings, not `(app)/w/[workspaceId]/settings`, and the list a founder sees is never shared with teammates (`08-agent-runtime-implementation.md` §11, `09-authentication-and-security.md` §7a).

This table is the contract between screen implementation and `05-api-and-backend-architecture.md` §3 — do not add a procedure that is not listed in one of the two documents without updating both.

## 4. Component layering

```
components/
├── primitives/          # Re-exports from @foundry/ui, no local styling overrides
├── cards/                # EvidenceCard, SprintCard, ArtifactCard, ApprovalCard, DecisionCard
│                         #   (shared visual language across web/mobile, per plan/06 §7 "common interaction cards")
├── desk/                 # Founder Desk composition: PhaseHeader, NextActionBanner, ActivityFeed
├── pack/                 # PackSectionView, PackDiffView, MoneyRulesPanel
├── evidence/             # EvidenceTable, SourceUploader, CitationInspector
├── sprint/                # SprintTimeline, WorkerProgressList, BudgetGauge
├── artifacts/             # ArtifactPreview (per artifact type renderer), ExportMenu
└── chrome/                # AppShell, WorkspaceSwitcher, NotificationBell, CommandPalette
```

Rule: a component in `cards/` renders a **read model** shape from `@foundry/api-contracts` (see `plan/13` §3 "queries and read models"), never a raw domain entity and never a raw database row. This keeps the same card components portable in spirit to `apps/mobile` (mobile re-implements the visual layer in `ui-native`, but consumes the identical read-model type).

## 5. State management boundaries

| State | Owner | Tool |
|---|---|---|
| Server data (pack, sprints, evidence, approvals, artifacts) | TanStack Query cache, populated by tRPC | `@trpc/tanstack-react-query` |
| Streaming activity (live sprint/tool events) | A dedicated `useSprintStream` hook that maintains an in-memory event log and periodically reconciles with `sprint.getActivity` | `EventSource` + Zustand store scoped per `sprintId` |
| Ephemeral UI state (panel open, active tab, command palette) | Local component state or a small Zustand store | `zustand` |
| Auth session | Better Auth `authClient.useSession` (client) / `auth.api.getSession` (server) | `better-auth` |
| Form state | Local to the form, validated with the same Zod schema the tRPC procedure uses | `react-hook-form` + `@hookform/resolvers/zod` |

Do not introduce Redux, Recoil, or a second query library. Do not store server data in Zustand — this is the single most common source of stale-UI bugs and is explicitly disallowed.

## 6. Streaming UI contract

The web client consumes the semantic stream events defined in `plan/13-contracts-and-boundaries.md` §5 (`message_started`, `text_delta`, `tool_planned`, …). Implementation shape:

```ts
// lib/trpc/... is for request/response; streaming uses a plain typed SSE client.
type StreamEvent =
  | { type: 'message_started'; runId: string }
  | { type: 'text_delta'; runId: string; delta: string }
  | { type: 'question_ready'; runId: string; question: ClarificationQuestion }
  | { type: 'tool_planned'; runId: string; tool: ToolPlanSummary }
  | { type: 'tool_started'; runId: string; toolCallId: string }
  | { type: 'tool_progress'; runId: string; toolCallId: string; progress: ToolProgress }
  | { type: 'tool_completed'; runId: string; toolCallId: string; result: ToolResultSummary }
  | { type: 'evidence_found'; runId: string; evidence: EvidenceSummary }
  | { type: 'proposal_ready'; runId: string; proposal: ProposalSummary }
  | { type: 'approval_required'; runId: string; approval: ApprovalSummary }
  | { type: 'sprint_progress'; sprintId: string; progress: SprintProgressSummary }
  | { type: 'artifact_ready'; artifactId: string; version: number }
  | { type: 'warning'; runId: string; warning: WarningSummary }
  | { type: 'blocked'; runId: string; reason: BlockedReason }
  | { type: 'message_completed'; runId: string };
```

This type is exported from `@foundry/api-contracts` and used unmodified by `apps/mobile`. The web client never receives a raw AI SDK `UIMessageStreamPart` or a raw provider payload — normalization happens server-side in `packages/agent-runtime` (see `08-agent-runtime-implementation.md` §6).

## 7. Forms and mutations pattern

Every founder-facing mutation follows the same shape to remove ambiguity:

1. Client builds a payload validated against the Zod schema exported by the matching tRPC input (`@foundry/api-contracts` re-exports the input schema, not just the type, so client-side validation and server-side validation are byte-identical).
2. Client calls the tRPC mutation with an idempotency key (`crypto.randomUUID()` generated once per form submission and stored in component state so retries reuse it).
3. On success, TanStack Query invalidates the exact query keys declared in that procedure's `invalidates` metadata (see `05-api-and-backend-architecture.md` §5).
4. On a domain error (see `plan/13` §7 error vocabulary), the client renders the error's `explanation` and `nextAction` fields — never a raw stack trace or provider error string.

## 8. Accessibility and responsive rules

Implements `plan/06-web-and-mobile-experience.md` §10–11:

- All interactive primitives come from Radix (`@radix-ui/react-dialog`, `-popover`, `-tabs`, `-toast`, `-dropdown-menu`) wrapped once in `@foundry/ui` — never used directly in feature code, so focus management and ARIA attributes are correct by construction.
- Layout breakpoints: `sm` (mobile web, rare), `md` (tablet), `lg`/`xl` (desktop workspace view). The Founder Desk uses a single-column layout below `lg` and a two-column (activity + pack summary) layout at `lg`+.
- Every card component that can be read via TalkBack/VoiceOver equivalents on mobile has an equivalent semantic structure on web (same heading hierarchy, same status vocabulary) — see `04-shared-packages-and-design-system.md` for the shared token contract.

## 9. Environment access

`lib/env.ts` parses `process.env` once at module load with a Zod schema and exports a typed `env` object. No file outside `lib/env.ts` reads `process.env` directly — this is enforced by an ESLint rule (`13-coding-standards-and-conventions.md` §4) and prevents typo'd environment variable names from silently becoming `undefined` in production.

## 10. Build and bundling notes

- `next.config.ts` sets `output: 'standalone'` so the Docker image (see `10-aws-infrastructure-and-deployment.md` §4) only needs the minimal Node runtime + `.next/standalone` output, keeping the image small and cold-start-irrelevant (ECS tasks stay warm).
- `experimental.serverActions.bodySizeLimit` is set to match the max signed-upload metadata size only — actual files never pass through a Server Action or Route Handler body; they go directly to S3 via presigned URLs (see `05-api-and-backend-architecture.md` §7).
- Turbopack is the default dev/build engine (Next.js 16 default); no custom Webpack config should be needed for this app's dependency set.
