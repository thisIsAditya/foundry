# Mobile frontend information architecture delta

**Implements:** `docs/02-product-requirements/03-mobile-requirements.md` (all sections).
**App:** `apps/mobile`. Extends the existing Expo SDK 57 / Expo Router structure; no change to the auth (Better Auth Expo + SecureStore access key), tRPC, or SSE (`react-native-sse`) wiring already in place.

## 1. Tab structure change

| Today (`(app)/_layout.tsx`) | Becomes |
|---|---|
| Desk, Evidence, Approvals, Pack, More | **Home, Co-founder, Work, Plan, Evidence** |

This is the exact 5-destination set in mobile requirements §2. Mapping:

- `desk.tsx` → `home.tsx`. Today this screen is a **placeholder** that only states it will call `project.getDeskSummary` (confirmed in the codebase audit) — it has never been wired. This plan wires it for the first time, to the same `project.getOverviewSummary`-shaped data web's Overview consumes (`06-web-frontend-ia-delta.md` §2), reusing the same tRPC procedure and the same `AiJobSummary`/`PlanScore`/`FounderTask` read models — mobile does not get a second backend contract.
- New `co-founder.tsx` — persistent conversation, same `conversation.list`/`conversation.send` procedures as web, same `ConversationBlock` rendering logic reimplemented with `@foundry/ui-native` primitives (Sheet, Badge, ProgressBar already exist per `docs/plan/implementation/04-shared-packages-and-design-system.md`) instead of `@foundry/ui`'s web primitives — shared prop contracts, not shared JSX, consistent with the existing web/mobile design-system split.
- `approvals.tsx` is folded into `work.tsx` as one of its lists (mobile requirements §6 does not list Approvals as a separate tab); the screen file is deleted, not left dead, once `work.tsx` covers its function.
- `pack/index.tsx` and `pack/[section].tsx` → `plan/index.tsx` and `plan/[section].tsx`, generalized the same way as web's business-model view, backed by the same `pack.listBusinessModelSections`/`pack.getBusinessModelSection` procedures.
- `evidence.tsx` — kept, extended per §5 below.
- `more.tsx` — kept as the entry point to settings/providers/members/decisions, per mobile requirements §2's "available from project menus without hiding their status from Home."
- `sprint/[sprintId].tsx` and `artifact/[artifactId].tsx` remain stack screens outside the tab bar, now reached from `work.tsx` job cards and from `plan/[section].tsx`'s artifact links respectively.

## 2. Home

`home.tsx` answers the four questions in mobile requirements §3 using exactly the same data sources as web's Overview (§06 §2), rendered with mobile-appropriate density: one-sentence summary, overall score + trend sparkline, strongest/weakest dimension chips, current AI activity (top 1–2 `AiJobSummary` where `status = 'running'`), founder task card (top 1 `FounderTask` where `status = 'active'`), research proposal banner (top job where `jobKind = 'research', status = 'proposed'`), latest plan change (`pack.listRevisions` most recent), and quick actions (chat, capture, review, work board) as a fixed action row. No multi-field intake form — this is the same constraint as the web first-idea flow and is enforced by the fact that project creation happens in a single existing screen, not from Home.

## 3. Co-founder

`co-founder.tsx` supports text and voice-note input. Text input reuses `conversation.send` unchanged. Voice-note input is new: record via `expo-audio`'s `useAudioRecorder` (decision D22), upload the resulting `.m4a` through the **existing** `evidence.createUploadIntent` → S3 PUT → `evidence.confirmUpload` flow (already built for document upload — a voice note is just a `Source` with `kind: 'interview_note'` or a new lightweight `kind: 'voice_note'` value added additively to the existing `sources.kind` check constraint), then the resulting `sourceId` is attached to the outgoing `conversation.send` call as a reference so the co-founder's turn can transcribe/summarize it via the existing document-intelligence pipeline. No second upload mechanism is introduced for audio.

Suggested prompts, cited findings, plan-change cards, task cards, research-plan cards, draft-help offers, job progress, and revision review all reuse the same `ConversationBlock` union rendered by a native `ConversationMessageView` (mirrors web's component one-for-one in prop shape, per the "shared domain, not shared layout" rule already established in `docs/plan/implementation/03-mobile-frontend-architecture.md`).

## 4. Mobile capture

### Interview capture (mobile requirements §5)

Extends the existing `evidence.addInterview` flow (already implemented server-side via `InterviewService`) with the fields mobile requirements §5 lists that are not yet captured: participant type, consent, date/time, optional label, text notes, one-quote-per-line input, voice note (via `expo-audio`, same upload path as §3), attachment/photo (`expo-image-picker`/`expo-document-picker`, already planned), offline draft, save-and-sync-later. Offline drafting reuses the TanStack Query async-storage persister approach already specified in `docs/plan/implementation/03-mobile-frontend-architecture.md` §"Offline" — not a new offline framework. The friend/family reminder (mobile requirements §5) is a static UI copy check against `participantType`, not a new domain rule — `Interview.participantType`'s existing `friend | known_contact | non_friend` values already carry this distinction.

### Payment and WTP capture

New screen `capture/wtp.tsx`, calling the existing `wtp.record` procedure (`ExperimentService.recordWtp`) — no backend change, only a mobile form that was never built (audit confirmed web also has no dedicated WTP capture UI beyond the experiment service being callable; this closes that gap on both platforms, with mobile shipping first per mobile requirements' capture-first design).

### Quick observation

New lightweight form that creates an `EvidenceItem` linked to a `BusinessModelSectionKey`, calling a new thin procedure `evidence.recordObservation` (delegates to the same `EvidenceItem` repository added in `03-database-schema-delta.md` §1) — this is the smallest possible addition since the repository and entity already exist once that migration lands.

## 5. Work

`work.tsx` uses the six focused lists in mobile requirements §6 (`Needs me`, `Running now`, `Waiting for research`, `Needs review`, `Completed`, `Blocked`), each a filtered call to `job.list`/`founderTask.list` — the same `view` parameter values used by web's Kanban columns, just rendered as lists instead of columns (no `@dnd-kit` on mobile; mobile requirements §6 does not ask for drag-and-drop). Job detail and advanced settings reuse `job.get`/`job.updateSettings` unchanged from web.

## 6. Founder task flow

`plan`/task detail screens mirror mobile requirements §7's single-dominant-action layout, backed by the same `founderTask.get`/`requestHelp`/`complete`/`defer`/`skip` procedures as web (`04-backend-services-and-trpc-delta.md` §5). The interview task's "start → conduct → capture → submit" flow keeps the founder inside one task context by deep-linking `capture/interview.tsx` with a `founderTaskId` param that pre-fills `FounderTask.linkedSectionKeys` and, on submit, calls `founderTask.complete` with the new interview's ID as `evidenceRef` in the same transaction the interview is created — reusing the existing idempotency-key mutation pattern so a retried submit cannot create two interviews.

## 7. Evidence library

`evidence.tsx` gains the filters in mobile requirements §9 (interviews, quotes, sources, findings, assumptions, payment signals, stale/conflicting) via query parameters on the existing `evidence.list`/`evidence.search` procedures, extended to also filter `research_findings` and `assumptions` once those repositories exist (`03-database-schema-delta.md` §3). No new search index — reuses the existing Postgres `tsvector`/`pg_trgm` search already in place for `content_blocks`.

## 8. Notifications

The notify-worthy event list in mobile requirements §10 (research completed, job needs founder, revision ready, job failed/blocked, task due, score changed materially, budget threshold) maps directly onto the new `job_state_changed`/`score_changed`/`founder_task_created` stream events (`04-backend-services-and-trpc-delta.md` §9) plus the existing `approval_requested`/`sprint_stalled`/`artifact_ready`/`budget_threshold_reached` notification classes already wired to the `notification` BullMQ queue and Expo push (`docs/plan/implementation/07-caching-queues-and-streaming.md`). Only the notification **trigger list** grows (a `notify-worthy` allowlist already exists per that document) — the delivery mechanism does not change. "Score changed materially" needs a threshold constant (e.g. ≥5 points overall) added to `packages/config/src/limits.ts`, not a new notification path.

## 9. Offline and poor network behavior

Unchanged mechanism from `docs/plan/implementation/03-mobile-frontend-architecture.md` §"Offline": approvals and job pause/stop/cancel remain non-queueable offline (disabled with "reconnect" messaging); interview/quote/observation/WTP captures are queueable with idempotency keys; a captured note is never shown as accepted evidence until the server confirms it (this already matches shared requirements §2.5's evidence-vs-assumption distinction — an unsynced local draft is neither `known` nor `cited`, and the UI must present it as `pending_sync`, a new purely-client-side display state, not a domain status).

## 10. New native dependency

`expo-audio`, bundled with the already-pinned Expo SDK 57 (decision D22). No `app.json` plugin change beyond the microphone permission entry already required for camera capture; add the `expo-audio` config plugin entry alongside it.
