# Responsive web, native mobile, and bounded integrations

**Status:** proposed Phase 2 completion plan  
**Implements:** deferred delivery slices 5 and 8 after the web journey is proven  
**Depends on:** [Phase 2 overview](00-README.md), [co-founder chat
experience](02-cofounder-chat-experience.md), and [end-to-end quality and
release](05-end-to-end-quality-and-release.md)

## 1. Objective

Finish the app as a coherent web-first, field-friendly founder product without
reintroducing legacy sprint UI, a duplicate mobile state model, raw connectors,
or unapproved external writes.

Responsive web is the first mobile deliverable. The existing Expo application
becomes a focused companion only after web journey, proposal, synchronization,
and co-founder operation contracts have passed their release gates.

This plan intentionally schedules the native companion, but it does not make
native parity a condition for web founder GA or a reason to retain legacy
sprint/job APIs. A native route is cut over, compatibility-shimmed, or
explicitly deprecated before its legacy backing API is removed.

## 2. Design boundary

This phase improves the current product experience; it is not a wholesale
visual-brand rewrite. The product requirements explicitly prioritize a living
business-model workspace over a new brand. Use the existing design tokens and
add only the component, state, accessibility, and responsive changes necessary
to make the founder journey coherent.

The shared design rule remains:

```text
Current stage → objective → evidence/interpretation → recommendation
→ founder decision → result → next step
```

The co-founder chat library provides interaction primitives, but business
state, decision flow, and visual hierarchy remain application-owned.

## 3. Responsive web completion

### 3.1 Required narrow-width journeys

At 375px and 768px, a founder must be able to:

- see venture, stage, objective, recommended step, change summary, and
  uncertainty;
- start, defer, skip, or discuss a journey step;
- capture an observation, interview note, assumption, link, or attachment;
- inspect the current record section and its provenance;
- review a material proposal with current/proposed values and selected-change
  controls;
- start, cancel, retry, and recover a co-founder operation; and
- return to the correct route after an action or notification.

Use the current maximum-five peer destinations:

```text
Overview | Journey | Capture | Model | Co-founder
```

Evidence, Decisions, settings, versions, and deep history remain contextual
routes rather than competing bottom-navigation items.

### 3.2 Interaction quality

Complete:

- safe-area-aware bottom navigation and composer spacing;
- touch targets and focus treatment for all forms, sheets, proposal controls,
  attachment controls, and operation actions;
- field-level validation and clear saved/pending/failed state;
- no hover-only affordances;
- reduced-motion behavior;
- focus trap/restoration for sheets and destructive dialogs; and
- explicit loading, empty, paused, failed, and recovery states.

Do not preserve old work boards, sprint controls, worker activity, role labels,
or desktop table layouts as mobile “parity.”

## 4. Native mobile cutover

The existing Expo app has legacy plan, sprint, work, task, and co-founder
surfaces. Replace them in the same contract sequence as web; do not wrap web
pages or fork a second journey state.

### 4.1 Native information architecture

Target routes:

```text
Home        → resume state and recommended continuation
Journey     → stages, current step, deferrals, and consequences
Capture     → observation, interview, source, assumption, and decision capture
Model       → readable accepted-record outline and proposal review
Co-founder  → focused contextual help and safe operation state
```

Evidence detail, Decisions, settings, artifact/version history, and
notifications deep-link contextually.

Retire or redirect native routes that expose:

- `plan` as a 17-section score-led pack;
- `sprint`, `work`, `task`, or job controls;
- worker/specialist/effort terminology;
- raw MCP/provider controls in the founder flow; or
- a mobile-only proposal/approval path.

### 4.2 Shared contract rules

Native must consume the same:

- `JourneyOverview`, map, step, record, evidence, proposal, and operation
  contracts;
- tRPC authorization and idempotency semantics;
- `CofounderOperation` lifecycle and safe stream events;
- proposal/record-version review commands; and
- provenance, staleness, readiness, and activity definitions.

Native cannot accept a material record change locally or persist a local draft
as server evidence before server confirmation.

## 5. Offline capture and synchronization

Retain and rework the existing local-draft foundation into a single explicit
sync state machine:

```text
local draft → pending sync → synced
                     ↘ failed → retry / discard / resolve conflict
```

Requirements:

- generate an idempotency key on local draft creation and retain it through
  retries;
- persist the draft locally with the selected venture, intended capture type,
  attachment metadata, and optional step/section link;
- show saved, pending, synced, and failed states in text and iconography;
- upload attachments first with resumable/failure-safe intent where possible;
- prevent a failed/unsynced capture from appearing as accepted evidence;
- surface server conflicts as focused review rather than last-write-wins; and
- clear local data only after a confirmed server result or explicit founder
  discard.

Notifications are limited to proposals requiring review, resumable/blocked
steps, optional experiment reminders, and recoverable sync failures. They
deep-link to the scoped venture and do not leak sensitive content on a lock
screen by default.

## 6. Co-founder on mobile

The native co-founder shares the same response grammar and operation transport
as web:

- Ask for founder-only context;
- Inform with scoped current state;
- Recommend with evidence, interpretation, uncertainty, and an explicit
  decision;
- Generate draft-only founder materials;
- Review a record/evidence/step; and
- Change through a proposal, never inline text acceptance.

Voice notes, image/document attachments, and suggested prompts may assist
capture only after the core typed record/proposal flow succeeds. They must not
bypass provenance, content validation, founder approval, or the capability
gateway.

## 7. Bounded integrations

External utility is added in increasing-risk order:

```text
application-owned read/draft capability
  → explicit preview and impact
  → founder proposal/approval
  → separately approved idempotent execution command
```

Phase 2 includes only the first step:

- `venture.readCurrentState` and deterministic calculation;
- draft interview guides, outreach, experiments, and artifacts; and
- optional read-only integration data only when it can be scoped, audited, and
  represented as evidence/draft rather than truth.

`evidence.searchApproved` stays disabled until an application-owned source
adapter returns real, citation-preserving results. It is not replaced by raw
web fetch, raw MCP, or a Harness-provided search tool.

Do not add send, publish, payment, scheduling, filing, database write, or raw
connector execution. Those require a separately approved execution product,
not a co-founder convenience feature.

Every capability needs a purpose-built schema, user-visible effect, scope,
timeout, cost/budget, idempotency, audit, cancellation behavior, and
founder-readable recovery state.

## 8. Completion tests

### Responsive web

- 375px/768px/1024px/1440px route screenshots and keyboard flows;
- capture, cancellation, retry, and proposal review at narrow widths;
- focus/sheet/skip-link/reduced-motion/axe coverage; and
- no horizontal scroll or inaccessible hidden controls.

### Native

- a founder resumes the same venture state seen on web;
- observation/interview capture survives offline → retry → synced and creates
  one server item;
- proposal review accepts/modifies/keeps current via the same version command;
- co-founder operation stream/reconnect does not duplicate messages or
  proposals; and
- notification deep links open the correct scoped route without content
  leakage.

### Bounded integrations

- citation/source provenance is preserved;
- a disabled capability explains why instead of fabricating a result;
- cross-venture/expired/canceled capability requests fail closed; and
- no external write occurs from any test scenario.

## 9. Exit gate

This final product-surface phase passes when responsive web is fully usable,
native mobile is a safe companion to—not a fork of—the web journey, and every
approved external capability remains bounded, draft-only, auditable, and
founder-controlled.
