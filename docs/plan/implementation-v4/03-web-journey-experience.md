# Web journey experience

**Status:** proposed implementation plan  
**Implements:** V4.3 and V4.4  
**Depends on:** [foundation and contracts](01-foundation-and-contracts.md) and
[persistence and migration](02-persistence-and-migration.md)

## 1. Product shape

The web product is a founder's workspace, not a chat rail with drawers. The
journey and accepted record are primary. The co-founder is contextual help and a
dedicated destination, never the only way to understand progress.

The destination map is:

```text
/home
/p/[projectId]                    Overview
/p/[projectId]/journey            Journey map
/p/[projectId]/journey/[stepId]   Step detail
/p/[projectId]/model              Business record
/p/[projectId]/model/[section]    Record section and versions
/p/[projectId]/evidence           Evidence and capture
/p/[projectId]/decisions          Decisions and proposals
/p/[projectId]/co-founder         Full co-founder conversation
```

`/p/[projectId]` is the return destination. It must render the current stage,
objective, changes since the last visit, a recommended next step, pending
proposals, and a compact readiness explanation without asking the founder to
open chat.

Settings remains a lower-priority surface. It may retain a drawer or route, but
provider/MCP settings must not compete with Overview, Journey, Model, Evidence,
or Decisions in founder navigation.

## 2. Rendering and state ownership

Implement route shells as App Router server components by default. Put only
interactive behavior in client islands:

| Concern | Rendering boundary |
| --- | --- |
| Route authorization, initial read model, page title, and stable content | Server component/page layout |
| Navigation selection, proposal controls, capture form state, stream updates, and co-founder composer | Client component |
| Slow secondary panels such as evidence timelines or version history | Independent Suspense boundary with a meaningful loading state |
| Form mutation | Existing authenticated tRPC command path; keep validation and authorization in the service boundary |

Do not create a second browser-only state machine for journey or record state.
React state may hold unsaved form input and optimistic affordances, but the
server response remains authoritative. On conflict, preserve the founder's
draft, explain the newer version, and offer a focused retry/review path.

## 3. Shared interaction grammar

Extract a small set of reusable components before building individual screens.
Every component must explain a decision-flow role.

| Primitive | Required behavior |
| --- | --- |
| `JourneyStageStrip` | Shows current stage, objective, stage status, and a route to the journey map. Replaces “Phase N of 9.” |
| `RecommendedStepCard` | States why now, expected effort, outcome, one primary action, alternatives, and defer behavior. |
| `ChangeSummary` | Shows what changed, why it matters, and the next continuation on a return visit. |
| `ReadinessSignal` | Names a supported, missing, contradictory, or blocked condition and the smallest useful response; never displays a success score as validation. |
| `ProvenanceBadge` | Displays a text label plus icon for founder input, cited evidence, derived content, proposal, approval, unknown support, contradiction, or staleness. |
| `ProposalReview` | Shows before/after, reason, evidence, uncertainty, affected items, and `Accept`, `Modify`, and `Keep current` actions. |
| `StepDetail` | Shows the current objective, preparation, completion evidence, co-founder help, defer/skip reason, and post-completion result. |
| `CaptureForm` | Supports observation, interview, source, and assumption capture with optional journey-step/record-section link. |
| `InteractionTypeFrame` | Makes `Ask`, `Inform`, `Recommend`, `Generate`, `Review`, and `Change` visible in significant co-founder turns. |

Use a durable review surface, not a transient “Are you sure?” dialog, for
material business changes. A confirmation message after an accepted action must
say what changed and what became stale. A destructive discard still uses a
focused confirmation dialog.

## 4. Reuse and replacement map

The existing shell is useful only after the content hierarchy reverses.

| Existing area | v4 action |
| --- | --- |
| `app/(app)/p/[projectId]/layout.tsx` and `components/chrome/project-shell.tsx` | Keep one project layout; render route children instead of a null page plus default drawer state. |
| `components/chrome/cofounder-rail.tsx` | Rework into a collapsible contextual help surface on wide screens and a route/sheet entry point on narrow screens. |
| `components/chrome/phase-focus.tsx` | Rebuild as Overview using `JourneyOverview`; remove phase count, score, research-job, and worker-priority logic. |
| `components/plan/section-list.tsx` and `section-detail.tsx` | Reuse list/detail and before/after pattern for 12 record sections, version history, and proposal review. |
| `components/evidence/interview-capture.tsx` and `research/research-view.tsx` | Rework into evidence capture/library; remove research-job queue language. |
| `components/work/founder-task-card.tsx` | Reuse structure for `JourneyStep`; remove score impact and job links. |
| `components/conversation/*` | Retain single-speaker conversation rendering; replace job/research/task blocks with proposal, step, and evidence blocks. |
| `components/decisions/decisions-list.tsx` | Rework to show pending proposals, accepted decisions, rationale, stale impacts, and review history. |
| `components/work/*`, `agent-step-trace.tsx`, score components, Gauge, effort presets | Remove from the founder path after replacement screens are live. |

Retain `DrawerShell` only for bounded transient surfaces such as Settings,
Capture, or a small mobile overlay. Primary destinations must be routes so
refresh, browser navigation, sharing, assistive technology, and return visits
retain context.

## 5. Build order

### Wave A — shell and route migration

1. Add the destination routes and page-level headings.
2. Make the project layout render `children`.
3. Replace header navigation with Overview, Journey, Model, Evidence, and
   Decisions.
4. Keep `?panel=` legacy links as redirects for one deprecation release using
   `legacy-href.ts` and `project-href.ts`.
5. Make the co-founder rail collapsed or approximately a supporting column,
   never the dominant 40% default workspace.

### Wave B — honest creation and overview

1. Rework `venture-composer.tsx` to collect the founder's idea first, with
   optional goal, customer, geography, constraints, time, and urgency only
   when they change the first recommendation.
2. Replace the instant-plan/proposed-research progress copy.
3. Build Overview around `JourneyOverview`, not `project.getDeskSummary`,
   `derivedPhase`, or `score.getCurrent`.
4. Show an empty record honestly. Do not replace absent information with a
   generated claim or “validated” state.

### Wave C — journey and model

1. Render seven stages with purpose, state, visible outcome, active/suggested
   steps, and defer/revisit consequences.
2. Build step detail around one objective and one primary action.
3. Render the 12 record sections with provenance, linked evidence/decisions,
   version, staleness, and a smallest improving action.
4. Wire versioned export from the accepted record rather than a conversation
   transcript or current draft.

### Wave D — evidence and decisions

1. Promote evidence to a primary destination.
2. Support fast observation/interview/assumption capture and later
   classification without falsely elevating a note to proof.
3. Mount `ProposalReview` on Decisions, section detail, and material
   co-founder blocks.
4. Replace score headline components with readiness explanations and direct
   follow-up actions.

### Wave E — co-founder presentation

1. Keep a single “Co-founder” identity.
2. Render structured response types in context and link to the relevant record,
   evidence, proposal, or step.
3. Replace effort presets, worker labels, role labels, and agent traces with a
   plain-language operation status and cancel affordance.
4. Preserve unsent input after a recoverable failure.

## 6. Accessibility and responsive requirements

Every wave must pass these implementation checks:

- each destination has a unique `h1`, document title, main landmark, and
  predictable focus order;
- a skip link reaches main content;
- all navigation, proposal review, capture, and co-founder actions work by
  keyboard;
- touch targets are at least 44 by 44 CSS pixels and never rely on hover;
- body text is readable at a 16px-equivalent base and semantic status never
  relies on color alone;
- dialogs/sheets move focus on open, trap it while open, restore it on close,
  and support Escape where appropriate;
- visible focus, contrast, reduced motion, and live status messaging remain
  present;
- routes work at 375px, 768px, 1024px, and 1440px without horizontal scrolling;
  and
- narrow view uses five peer destinations at most: Home/Overview, Journey,
  Capture, Model, and Co-founder. Evidence and Decisions remain contextual
  destinations, not a crowded bottom bar.

Mobile capture uses saved, pending-sync, and failed states. A failed sync must
retain the local draft and cannot create duplicate evidence or a falsely
accepted proposal.

## 7. Founder acceptance journeys

The browser suite introduced in v4 must cover:

| Journey | Required proof |
| --- | --- |
| Idea to overview | A short idea produces an Idea-stage record skeleton and one recommended step, not a complete 17-section plan or automatic research sprint. |
| Progress without chat | A founder completes a step and sees its evidence/decision in Overview and Model without opening the co-founder. |
| Evidence capture | An observation or interview is linked to a claim with visible provenance; an interview quota never prevents documentation. |
| Proposal review | A change shows before/after, rationale, evidence, impacts, accept/modify/keep-current behavior, and no unrelated bulk acceptance. |
| Staleness | A customer, problem, or offer change retains old evidence and marks affected dependent items stale with an explanation. |
| Pause and return | A returning founder sees changes, stage/objective, and next action without reconstructing context from chat or job history. |
| Model and export | Twelve readable sections and an export show version/date/uncertainty without a false validation claim. |
| Narrow viewport | A founder resumes work, captures an observation, and reviews a proposal without a desktop-only interaction or horizontal scroll. |

These journeys are release gates for deleting the drawer-only, work-board, and
score-led experience.
