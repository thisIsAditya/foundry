# Venture creation and onboarding delta

**Implements:** feedback items 6, 7, 8; decisions D6, D7. Replaces `apps/web/app/(app)/home/home-dashboard.tsx` and deletes every `(app)/w/[workspaceId]/**` route.

## 1. Single implicit workspace (D6)

On first authenticated request with zero workspace memberships, the server auto-creates one workspace named after the account (e.g. "Your workspace" — never founder-visible copy elsewhere calls it by name) by calling the existing `WorkspaceService.create` with a generated idempotency key, reusing its current side effect of auto-connecting an Ollama provider when `OLLAMA_BASE_URL` is set (`apps/web/server/routers/workspace.ts`, unchanged). This happens once, server-side, on `(app)` layout's server component render or the first `project.list`/`workspace.list` read that comes back empty — implemented as a small `ensureDefaultWorkspace(userId)` helper in `apps/web/server/services/workspace-service.ts`, not a new service. `workspace.list`/`workspace.create` procedures stay exactly as they are (D6 rationale) — nothing here changes their contract, only who calls `create` (the server, once, silently) and who no longer calls it (no UI form does).

`(app)/w/[workspaceId]/page.tsx`, `workspace-projects.tsx`, and `(app)/w/[workspaceId]/settings/page.tsx` are deleted. Whatever `workspace-projects.tsx`'s create-project form did is absorbed into the composer (§2); whatever its settings page held (member list, provider connections) moves into the project's Settings panel (`03` §5) as the "Provider & budget" tab, since with one workspace per account, "workspace settings" and "project settings" collapse into one place a founder actually visits.

## 2. The composer

New `components/onboarding/venture-composer.tsx`. Replaces `home-dashboard.tsx`'s name-only form and `workspace-projects.tsx`'s name-only form with a single elaborative surface:

- A large multi-line text area (not the current single-line `.input`), placeholder text modeling the level of detail wanted (e.g. "Tell us everything — who has the problem, what they do today, why it's worth paying to fix, and anything else you know"), backed by a new `founderPitch` field (§4).
- An attachment control reusing the existing evidence upload pipeline: `evidence.createUploadIntent` → direct upload → `evidence.confirmUpload` (`apps/web/server/routers/evidence.ts`, unchanged procedures). Attachments are collected client-side as evidence IDs before submit, then passed as `attachmentIds` on project creation (§4) — no new upload mechanism, this is the same flow `EvidenceService`/`DocumentService` already implement for in-project uploads, just triggered before a project exists yet by scoping the upload intent to the (already auto-created) default workspace instead of a project.
- One submit action, "Start building." No separate "name" field is required up front — if the founder didn't give a short name, it is derived from the first line of `founderPitch` (truncated), editable later from the Settings panel; this removes a redundant field per item 5.

## 3. Zero-state landing and the ventures list (D7)

`(app)/home/page.tsx` (server component) reads `project.list` for the account's single workspace:

- **Zero projects:** the composer (§2) is the entire page, full-screen, centered, using the `ink`/`paper` dark-surface token pairing (`02-design-system-delta.md` §2) so the very first screen a founder sees already carries the bespoke identity rather than a generic form.
- **One or more projects:** `home-dashboard.tsx` is replaced by a compact ventures list (venture name, `Gauge` at `size="sm"` showing that venture's score band, one-line phase label from `JOURNEY_STEPS`) with a visible "New venture" button that opens the same composer as a full-screen overlay (not a new route — a client-side overlay state, consistent with `00-README.md` rule 5's "no new routing mechanism").

## 4. Backend: `founderPitch` and `attachmentIds` on project creation

`CreateProjectInputSchema` (`packages/api-contracts/src/commands/create-project.ts`) gains two additive optional fields:

```ts
founderPitch: z.string().min(1).optional(),
attachmentIds: z.array(EvidenceItemIdSchema).max(10).optional(),
```

`ProjectService.create` passes `founderPitch` through to `InitialDraftService.generate`, which currently builds its `founderText` input from only `project.founderObjective` and `project.name` (`apps/web/server/services/initial-draft-service.ts` lines 35–37) — this becomes `[actor.project.founderPitch, actor.project.founderObjective, actor.project.name].filter(...).join('. ')`, a strictly richer input to the same existing `buildInitialDraft` pure function, no change to that function's contract. `attachmentIds`, if present, are linked to the newly created project via the existing `DocumentService`/evidence repositories immediately after project creation, inside the same transaction that already runs `ensurePackRevision` — full detail in `09-backend-and-trpc-delta.md` §4.

`project.create` already runs `InitialDraftService.generate` synchronously and awaited before returning (`apps/web/server/services/project-service.ts` lines 89–94) — this is exactly item 7's "run our first step for building a plan end to end" already implemented on the backend; this plan's only job is to (a) feed it a real founder description instead of just a name, and (b) show the founder a proper progress state while they wait (§5), not a bare spinner.

## 5. Submit experience — "your journey starts now"

On submit, the composer shows a short, explicit sequence rather than a spinner, reusing the SSE channel that already fires during `generate()` (`conversation_message_appended`, and — once research is proposed — a `job_state_changed`): "Reading your idea… Drafting your first business model… Proposing a research plan…" Each line lights up as its corresponding event arrives (subscribing to `/api/stream/[projectId]` requires the project ID, which `project.create`'s response provides as soon as the mutation resolves — since the call is synchronous end-to-end, the composer can `await` the mutation directly and only needs the stream for the "flavor" of the wait, not as its source of truth for completion). On success, the founder lands directly on the new project's shell (`03`) already inside the `diagnose` phase, with the co-founder's first message already in the chat rail — no separate "review your draft" interstitial, matching item 8's "start our journey" framing: the founder is dropped straight into the real, ongoing environment, not a preview of it.

## 6. Tone (item 8)

Empty states, the composer's placeholder copy, and the first co-founder message are the one place in this plan where copy is a deliberate design decision (`frontend-design`'s "words are design material"). The register: plain, second-person, no hype ("Ready when you are" rather than "Let's disrupt the market!"), and explicit that this is the founder's real working environment from the first keystroke — never a demo, preview, or sample state, since the founder has already paid and entered before reaching this screen.
