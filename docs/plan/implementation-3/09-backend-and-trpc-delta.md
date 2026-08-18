# Backend and tRPC delta

**Implements:** the backend-side pieces `04`, `05`, and `03` depend on. This is a deliberately small document — `01-decisions-and-scope.md`'s reuse map holds: almost everything this plan needs already exists. Every change below is additive (new optional input field, new derived output field, or a new call site of an existing service method) — no destructive migration, no scoring/gate logic change (`00-README.md` rule 8).

## 1. Default workspace auto-provisioning (D6)

New `ensureDefaultWorkspace(userId: UserId): Promise<Workspace>` method on `WorkspaceService` (`apps/web/server/services/workspace-service.ts`):

```ts
async ensureDefaultWorkspace(userId: UserId): Promise<Workspace> {
  const existing = await listWorkspaceMembershipsByUserId(this.sql, userId);
  if (existing.length > 0) {
    const workspace = await this.getById(existing[0]!.workspaceId);
    if (workspace !== null) return workspace;
  }
  return this.create(userId, { name: 'Your workspace', idempotencyKey: randomUUID() });
}
```

Called once from `(app)/layout.tsx`'s server component (the layout every authenticated route already passes through) before rendering children — not from every route individually, so it runs exactly once per request tree. This reuses `create`'s existing transaction and its Ollama-auto-connect side effect (`apps/web/server/routers/workspace.ts` lines 21–45) verbatim; that side-effect code moves from the router into `WorkspaceService.create` itself in this same change so both the router's `create` mutation (kept for completeness/tests, no longer called by any UI) and `ensureDefaultWorkspace` share one implementation rather than duplicating the Ollama-connect block.

`workspace.create`/`workspace.list` router procedures are unchanged in shape; they simply gain no new UI callers (`04-venture-creation-and-onboarding-delta.md` §1).

## 2. `derivedPhase` on `DeskSummarySchema`

`project.current_phase` is written once at creation (`packages/db/src/repositories/projects.ts` line 79, defaulting to `'diagnose'`) and never updated — using it directly for the phase-focused main area (`03-app-shell-and-navigation-delta.md` §3) would freeze every founder on "Get oriented" forever. Instead, a new pure function in `packages/domain` (co-located with `journey-status.ts`, since it is a status-derivation rule, not a service):

```ts
function deriveJourneyPhase(input: {
  sections: BusinessModelSectionSummary[];
  score: DimensionScore's Record | null;
  gateA: GateAProgress;
  wtpEventCount: number;
}): JourneyPhase
```

implementing a simple, inspectable, ordered set of checks (mirrors the existing `evaluateGateA`/`evaluateMvbpScope` style already used in `packages/policy` — pure functions over already-fetched rows, no model call): if `problem`/`beachhead` sections are still `draft`, phase is `problem`; else if `gateA.passed` is false, phase is `evidence`; else if `market_model`/`alternatives_competitors` are `assumption_heavy`, phase is `market_and_competition`; and so on through the nine phases, ending at `operate` once `launch_operate` is `accepted`. Exact ordering and section-to-phase mapping is finalized during implementation against the existing `BusinessModelSectionKeys`/`JourneyPhases` lists, reviewed against `JOURNEY_STEPS`' existing descriptions so the derived phase always matches the copy already written for it.

`DeskSummarySchema` (`packages/api-contracts/src/read-models/desk-summary.ts`) gains `derivedPhase: JourneyPhaseSchema` alongside the existing `phase` field (kept, unchanged, still backed by the stored column — no destructive rename, `00-README.md` rule 8 / `implementation-v2/00-README.md` rule 4). `ProjectService.getDeskSummary` computes `derivedPhase` by calling the new function with data it already fetches for the rest of the summary — no new query.

## 3. `founderPitch` and `attachmentIds` on project creation

Covered in full in `04-venture-creation-and-onboarding-delta.md` §4. Summary of the exact call sites touched: `CreateProjectInputSchema` (additive fields), `InitialDraftService.generate` (richer `founderText` input, same function signature otherwise), and a new small step in `ProjectService.create` — after `insertProject`/`ensurePackRevision`, if `input.attachmentIds` is present, call the existing `DocumentService`'s evidence-linking repository function (already used when evidence is uploaded inside an existing project) to associate each pre-uploaded evidence item with the newly created `project.id`, inside the same transaction. No new table: evidence items already carry a nullable `project_id`-style association the in-project upload flow sets; this reuses that exact column/update path, just called from project creation instead of from `evidence.confirmUpload`'s existing project-scoped call site.

## 4. `effort` and `attachmentIds` on `conversation.send`

Covered in full in `05-cofounder-chat-delta.md` §4. Wiring: `SendConversationInputSchema`'s new `effort` field is threaded from the `conversation.send` procedure into whatever currently starts the coordinator's `AgentRun` for a founder message (the co-founder dispatcher already referenced throughout `implementation-v2/05-agent-runtime-and-cofounder-delta.md`) as a bound on iteration/tool-call count *within* the existing `coordinator` model profile's `maxCostPerRunUsd` ceiling (`packages/agent-runtime/src/profiles/model-profiles.ts`) — e.g. `quick` caps at a small fixed tool-call budget and skips proposing new research jobs (answers from existing context only), `thorough` allows the dispatcher's full existing budget, `standard` is today's unbounded-by-this-field behavior and the default. This is a new, small, explicit parameter on the dispatcher's entry point — not a change to `MODEL_PROFILES` itself. `attachmentIds` are resolved to their evidence content and included in context assembly the same way research findings already are for a turn (reusing whatever context-assembly step already pulls evidence into a coordinator run, per `implementation-v2/05` — this plan does not introduce a second context-assembly path).

## 5. No changes required

Confirmed reused with zero contract changes: `pack.*`, `job.*`, `founderTask.*`, `score.*`, `evidence.list/search/listFindings/listLibrary`, `sprint.*`, `provider.*`, `decisions` read path, `StreamEventSchema` (the full union already needed by `05` §2 exists today). No new database migration.
