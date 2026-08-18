# Decisions and scope

Each decision below records the founder feedback item(s) it answers, the choice made, and why. All were confirmed directly with the founder before this plan was written.

## D1 — Visual identity: bespoke, not a preset

**Feedback:** item 8 (transparent, distinctive journey), "utilize these skills."
**Decision:** a bespoke palette and type system built for Foundry's actual subject — a calibration instrument for venture confidence — rather than a literal application of Anthropic's brand guidelines or one of theme-factory's ten presets. `brand-guidelines` is used as one allowed input (the three-hue accent idea), not copied verbatim. Full system in `02-design-system-delta.md`.
**Rationale:** `frontend-design`'s guidance is explicit that AI-heavy defaults (warm cream + serif + terracotta being one of them, which is close to Anthropic's own palette) should be a deliberate choice, not a default, when the brief leaves room to differentiate. The founder confirmed this direction and the specific palette/type proposal.

## D2 — "Reasoning" means a visible step trace, not raw chain-of-thought

**Feedback:** item 1, "tools should be visible... in the same collapsible way like claude and cursor."
**Decision:** the composer renders a collapsible trace built from the `StreamEvent` union already defined in `packages/api-contracts/src/stream-events.ts` (`tool_planned`, `tool_started`, `tool_progress`, `tool_completed`, `evidence_found`, `job_state_changed`, `score_changed`) and already delivered over the existing per-project SSE channel (`apps/web/app/api/stream/[projectId]/route.ts`, consumed by `use-project-stream.ts`). No raw model chain-of-thought is captured or displayed.
**Rationale:** the backend already emits exactly the event granularity Cursor/Claude-style tool-call UIs need; it is simply not rendered on the frontend yet (`use-project-stream.ts` only accumulates `text_delta` into a flat transcript string today). Raw provider reasoning tokens are not modeled anywhere in the stack, are not exposed by every connected provider (notably local Ollama models), and `docs/02-product-requirements/05-delivery-slices.md` lists "hidden model reasoning transcripts" as a deliberate non-goal — read together with the founder's own choice, the correct visible-by-default surface is what the co-founder *did* (tools, jobs, evidence), not a raw internal monologue that would be misleading when unavailable.

## D3 — Model selection means a per-message effort preset, not a per-message provider switch

**Feedback:** item 1, "selecting the model and context and reasoning."
**Decision:** the composer offers a three-way effort preset — **Quick / Standard / Thorough** — sent on every `conversation.send` call. It does not let the founder pick between configured provider connections per message. Provider/model configuration remains centralized in Settings (`provider.listConnections`/`provider.connect`, unchanged).
**Rationale:** `packages/agent-runtime/src/profiles/model-profiles.ts`'s `MODEL_PROFILES` already encode internal task-role/capability requirements (`coordinator`, `researchWorker`, etc.) with cost ceilings — they are not a founder-facing "how hard should you think" dial, and are not renamed or duplicated by this plan. Effort is a new, orthogonal, founder-facing concept: it bounds how many tool calls/iterations the coordinator run for that turn may take within the existing `coordinator` profile's cost ceiling, not which provider answers. This avoids building a second per-message provider-routing system when the workspace already has exactly one healthy connection at a time (single-workspace product model, D6) and keeps model/provider — a technical/billing concern — out of the everyday chat surface, matching item 5's "get rid of redundant UI elements."

## D4 — Plan-drawer color comes from overall score bands

**Feedback:** item 2, "orange → yellow → green as we progress."
**Decision:** the Plan-drawer trigger (the Gauge) reads its color from `score.getCurrent`'s `overall` value using three bands, expressed with the new palette tokens (`02-design-system-delta.md`):

| Band | Range | Token | Meaning |
|---|---|---|---|
| Early | `overall < 40` or `overall === null` | `signalOrange` | Mostly assumptions; not enough evidence yet |
| Developing | `40 ≤ overall < 75` | `signalAmber` | Partially supported; real gaps remain |
| Validated | `overall ≥ 75` | `signalGreen` | Broadly evidence-backed across dimensions |

**Rationale:** `overall` is the single number `docs/02-product-requirements` and `08-scoring-service-spec.md` already treat as the founder-facing headline (`ProjectOverview` renders it top-of-page today). Section-completion ratio and gate progression are secondary signals already visible inside the drawer itself (§`06-plan-and-score-drawer-delta.md`) — using them for the *trigger's* color too would be redundant with what's one click away, contradicting item 5. The bands are a new, explicitly named, testable convention (`scoreBandPresentation` in `packages/ui`, §`02`), not a hidden magic-number threshold.

## D5 — Four one-click drawers, not two

**Feedback:** items 2 and 3 ("the plan should always be accessible... so is the Kanban board... everything should be accessible... at one click").
**Decision:** Plan, Work, Research, and Decisions each become their own one-click drawer, triggered from a persistent icon cluster in the shell header (`03-app-shell-and-navigation-delta.md`). Settings is explicitly **not** a fifth peer drawer — it sits behind a small gear icon in the same cluster and opens a lighter, less frequently used panel, since Settings (provider connections, budgets) is a setup/admin concern the founder visits rarely, not part of the founder's daily loop the way Plan/Work/Research/Decisions are.
**Rationale:** the founder chose four drawers explicitly over folding Research/Decisions into the Plan drawer. This still satisfies item 5's "redundant UI elements" ask because each drawer keeps a single responsibility (no duplicate score displays, no duplicate job lists across drawers) and the four together are the exact four non-chat destinations that matter day to day; Settings staying out of the peer set keeps that cluster from growing past what a founder scans in one glance.

## D6 — One workspace per account; the concept disappears from the product surface

**Feedback:** item 6, "merge the workspace and the project creation into one step."
**Decision:** every account gets exactly one workspace, auto-created the first time a user reaches the app (reusing the exact logic `workspace.create` already runs, including its `OLLAMA_BASE_URL` auto-connect side effect — see `09-backend-and-trpc-delta.md` §1). There is no workspace list, switcher, or "create a workspace" form anywhere in the product. `(app)/w/[workspaceId]/...` routes and `workspace-projects.tsx`'s create-workspace form are deleted. `workspace.create`/`workspace.list` procedures and the underlying `workspaces`/`workspace_memberships` tables are **kept** — only their UI entry points are removed, since `workspaceId` is a foreign key threaded through providers, budgets, members, and every project, and ripping it out of the schema would be a destructive change this plan has no reason to make (`implementation-v2/00-README.md` rule 4).
**Rationale:** the founder chose the strictest option — no switcher at all, for now. Existing copy in `home-dashboard.tsx` ("most people only ever need one") already anticipated this; this plan finishes that thought instead of leaving both the multi-workspace UI and that copy half-contradicting each other.

## D7 — The composer only appears at zero ventures; afterward, a ventures list is home

**Feedback:** item 7, "we should have a chat box in the middle of the screen... once they do, we run our first step."
**Decision:** `(app)/home` becomes the single landing route for every account (workspace-scoped routes are gone per D6). If the founder has zero projects, the full-screen elaborative composer (`04-venture-creation-and-onboarding-delta.md`) is the entire page. Once at least one project exists, `/home` shows a compact ventures list (replacing today's `home-dashboard.tsx` workspace list) with a clearly visible "New venture" entry point that opens the same composer full-screen/as an overlay.
**Rationale:** the founder chose this over always showing the composer at the top of a populated list — for a returning founder with active ventures, the list of ventures **is** the useful content; the composer is only the primary object of attention when there is nothing else to show yet, consistent with item 5's anti-redundancy instruction.

## D8 — Web only

**Feedback:** all eight items describe a screen layout (drawers, sticky 40% chat rail) specific to a wide viewport.
**Decision:** this plan touches `apps/web` only. `apps/mobile` and `docs/plan/implementation-v2/07-mobile-frontend-ia-delta.md` are untouched; mobile parity for any of this is a future, separate plan.

## Reuse / change / remove map

| Area | Status |
|---|---|
| Domain model, DB schema, scoring rubric, gates/policy, agent runtime, evidence pipeline | **Reused unchanged.** No migration in this plan. |
| `conversation.send`, `job.*`, `founderTask.*`, `pack.*`, `score.*`, `evidence.*` procedures | **Reused**, two additive input fields only (`09` §2, §3) |
| `apps/web/app/(app)/p/[projectId]/layout.tsx`, `components/chrome/cofounder-panel.tsx`, `components/chrome/project-nav.tsx` | **Replaced** by the new shell (`03`) |
| `apps/web/app/(app)/home/home-dashboard.tsx`, `apps/web/app/(app)/w/**` | **Replaced** by the composer/ventures-list landing (`04`) and deleted (workspace routes) |
| `components/conversation/conversation-thread.tsx`, `conversation-message-view.tsx` | **Extended in place** — same components, new rendering for tool-call steps, effort preset, attachments (`05`) |
| `components/work/work-board.tsx`, `approvals-queue.tsx`, `founder-task-card.tsx`, `job-card.tsx` | **Reused as the drawer's content**, unmounted from a standalone route (`07`) |
| `apps/web/app/(app)/p/[projectId]/plan/**`, `research/**`, `decisions/**` | **Reused as drawer content**, unmounted from standalone routes (`06`, `08`) |
| `apps/web/app/(app)/p/[projectId]/model-provider-panel.tsx`, `settings/page.tsx` | **Reused**, relocated behind the Settings icon panel (`03`) |
| `apps/web/lib/journey.ts`, `JOURNEY_STEPS` | **Reused and promoted** — becomes the copy source for the phase-focused main area (`03`) instead of being deleted, reversing `implementation-v2/06`'s "delete if no remaining call site" note |
| `packages/ui/src/tokens/*`, `theme.css` | **Extended in place**, same keys, new values (`02`) |
