# Mobile requirements

**Status:** current, phased after the web journey
**Date:** 22 August 2026
**Implements:** [Shared founder-journey requirements](./01-shared-product-requirements.md)

## 1. Product role

Mobile supports the moments when a founder is away from a desk: resuming a
short step, capturing learning after a conversation, reviewing a proposal, and
deciding what to do next.

Responsive web is the first mobile surface. A native mobile application follows
only after the web journey, record, approval, and synchronization contracts are
proven. It must share the same venture state; it must not introduce a separate
journey, chat history, or approval path.

## 2. First mobile capability set

The initial responsive/mobile experience must let a founder:

- see the current stage, objective, and recommended next step;
- resume or defer a founder-sized step;
- add a quick observation, note, link, or assumption;
- capture an interview note and quoted statement;
- review a material proposal and accept, modify, or keep the current state;
- view the accepted business-model summary;
- open the co-founder for focused help; and
- see safe recovery states for unsaved or failed work.

It does not need to reproduce every desktop editing or export surface in the
first mobile release. Desktop remains the preferred place for deep business
model review and broad record editing.

## 3. Navigation and home

The mobile home screen answers, in this order:

1. What venture am I working on?
2. What is the current objective?
3. What is the one useful action I can take now?
4. What changed since I last checked?
5. What remains uncertain or needs review?

Use no more than five primary destinations:

1. **Home** — resume state and recommended action.
2. **Journey** — current step, path, and deferrals.
3. **Capture** — observation, interview, evidence, and assumption capture.
4. **Model** — readable business-model summary and proposal review.
5. **Co-founder** — context-aware conversation and help.

Evidence detail, decisions, and settings can be linked contextually rather than
competing for primary navigation. The app must not include a worker board,
specialist agents, sprint controls, raw integration controls, or technical
runtime traces.

## 4. Mobile journey and step flow

A mobile step view has one dominant action and shows:

- stage and current objective;
- why the step matters;
- expected effort;
- required input or decision;
- capture and completion criteria;
- co-founder help;
- defer, skip-with-reason, and discuss actions where applicable; and
- what happens after completion.

The view must preserve context when a founder moves between preparation,
capture, and review. It should favor short focused flows over dense desktop
layouts or modal stacks.

## 5. Field capture

### 5.1 Interview and observation capture

Mobile capture supports:

- participant type and optional label;
- consent status when required;
- date and time;
- note text;
- one quoted statement at a time;
- link, document, photo, or voice-note attachment where supported;
- relevant business-model section;
- provenance selection; and
- local draft/save state.

The UI must clarify that notes and quotes are founder-recorded observations, not
independent validation merely because they were captured in the app.

### 5.2 Assumption and evidence capture

A founder can quickly add:

- an assumption;
- an observation that supports or challenges an assumption;
- a source link or document;
- a decision rationale; or
- a future experiment result.

The app should make it easy to link the item to a current step or model section
without forcing exhaustive classification in the moment.

## 6. Proposal review and business model

Mobile proposal review must show:

- what changes;
- why it is proposed;
- evidence and uncertainty;
- affected sections;
- concise before/after values; and
- accept, modify, and keep-current actions.

The Model destination begins with a readable outline of the accepted record,
current stage, key readiness signals, and current uncertainty. Long evidence or
version histories use progressive disclosure; the app must not render tiny,
unreadable desktop documents.

## 7. Co-founder on mobile

The co-founder can:

- explain the current step;
- request founder-only context;
- help prepare a draft or script;
- summarize captured notes;
- explain a proposal; and
- direct the founder to the next relevant action.

It must use the same application-assembled context and proposal rules as web.
Voice input or attachment-assisted prompting may be added after the core
recording and approval flow works, but neither may bypass review or provenance.

## 8. Offline, synchronization, and notifications

Mobile capture may be saved locally as a draft. The app must:

- make saved, pending-sync, synced, and failed states explicit;
- use idempotency keys to avoid duplicate submissions;
- preserve the local draft after a failed sync;
- prevent a local draft from appearing as accepted server evidence before
  confirmation; and
- resolve conflicting edits through an explicit review flow rather than silent
  last-write-wins behavior.

Notifications are limited to meaningful events:

- a proposal needs founder review;
- a current step is blocked or ready to resume;
- an optional reminder for a deferred or scheduled experiment; and
- a recoverable synchronization failure.

Notifications deep-link to the relevant venture and do not expose sensitive
business content in the lock-screen preview by default.

## 9. Mobile acceptance criteria

The mobile phase is complete when a founder can:

1. return after time away and understand the next action;
2. capture an observation or interview note in a short session;
3. save work safely through poor connectivity;
4. review a material proposal without a desktop;
5. use the same co-founder context as web; and
6. see the same accepted venture state after sync.

Native mobile work must not delay the web-first journey release or preserve
legacy sprint and worker UI merely for feature parity.
