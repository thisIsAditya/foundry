# Delivery slices and acceptance criteria

This roadmap turns the product direction into vertical tracer bullets. Each slice should produce a usable founder experience across web, mobile, and worker/backend rather than building an isolated infrastructure layer.

## Slice 1 — Instant complete draft

### Goal

A founder enters an idea and immediately sees a complete, low-confidence business model.

### Requirements

- Create the initial full-pack revision from idea and optional context.
- Populate all logical sections with assumptions, hypotheses, or not-applicable explanations.
- Show overall and dimension score.
- Show top assumptions and score-improvement actions.
- Show a co-founder summary.
- Create a proposed baseline research plan.
- Do not require an interview before showing the plan.

### Acceptance

- A new founder can reach a useful plan without doing work first.
- Every weak section explains why it is weak.
- No unsupported customer, price, market, quote, or payment claim appears as fact.
- The plan can be viewed on web and mobile.

## Slice 2 — Durable co-founder

### Goal

The co-founder becomes a continuing project relationship rather than a single echo response.

### Requirements

- Persist conversation messages and structured action cards.
- Build rolling summaries and selective context.
- Persist founder preferences and confirmed facts.
- Link conversation responses to plan sections, jobs, evidence, tasks, and decisions.
- Show conversation on web and mobile.

### Acceptance

- A founder can leave and return without losing context.
- The co-founder can refer to a prior decision or preference accurately.
- Context stays within the selected model window and records what was included.
- The co-founder creates work items instead of only returning prose.

## Slice 3 — Research tracer bullet

### Goal

AI performs useful baseline research after the founder reviews the plan.

### Requirements

- Research-plan preview and explicit start.
- Public web search and fetch.
- Competitor/company research.
- Academic/report source discovery where available.
- Source snapshots, citations, findings, conflicts, and stale markers.
- Research output mapped to plan sections and score dimensions.

### Acceptance

- A founder can see exactly what a research job will do before starting it.
- A completed job produces citations and a draft revision.
- A research failure is recoverable and does not corrupt the plan.
- The score explains how research changed it.

## Slice 4 — Work board and founder tasks

### Goal

The founder sees all AI and founder work in one motivating control panel.

### Requirements

- Durable AI job state and progress.
- Founder task state and completion evidence.
- Assignments, role labels, outputs, blockers, and cost.
- Start/pause/cancel/retry controls.
- Safe advanced settings.
- Guided founder task cards and Help me actions.
- Equivalent web and mobile views.

### Acceptance

- The founder can understand what AI is doing and what they own.
- The founder can start a proposed research job.
- The founder can complete an interview task with prepared help.
- A blocked job identifies the exact next action.
- Budget controls are enforced server-side.

## Slice 5 — Versioned plan review

### Goal

The plan becomes more robust through reviewable successive revisions.

### Requirements

- Immutable plan revisions.
- Section-level and field-level diff.
- Provenance and citation labels.
- Score before/after.
- Accept/reject at whole-plan and section levels.
- Stale dependent artifacts.

### Acceptance

- Accepting one section does not accept unrelated changes.
- The founder can explain why a plan section improved.
- Accepted facts and assumptions are available to the co-founder in future jobs.
- History remains inspectable.

## Slice 6 — Founder help and draft actions

### Goal

Every founder-owned task comes with useful preparation.

### Requirements

- Interview scripts and questionnaires.
- Outreach and follow-up drafts.
- Pricing and payment-conversation scripts.
- Survey and landing drafts.
- Meeting agenda and Google Meet details as text.
- Legal/compliance handoff checklists.
- No external execution.

### Acceptance

- A founder can ask for help from the task card or co-founder.
- The generated draft is linked to the task and plan section.
- The founder sees that it is a draft and what remains human-owned.
- No integration credential is needed to create a draft.

## Slice 7 — Mobile parity and field capture

### Goal

The founder can carry the venture process into real conversations and decisions.

### Requirements

- Durable chat and plan state on mobile.
- Offline interview/quote/observation capture.
- Payment signal capture.
- Task preparation and completion.
- Job/revision review.
- Notifications and deep links.

### Acceptance

- A founder can capture evidence immediately after an interview.
- Offline drafts sync without duplicates.
- Mobile and web show the same project truth.
- The founder can review a plan revision without desktop.

## Slice 8 — Score maturity and operating loop

### Goal

The score becomes a motivating feedback loop from idea through operation.

### Requirements

- Historical score trends.
- Evidence freshness.
- Gate results as score inputs, not only blocking walls.
- WTP and operating metrics.
- GO/PIVOT/KILL decision support.
- Score-improvement recommendations.

### Acceptance

- Adding reliable evidence improves the relevant score dimension.
- Stale or contradicted evidence lowers confidence visibly.
- The founder understands what would improve the next score.
- The system never represents a score as a success guarantee.

## Deliberate non-goals for these slices

- Autonomous email, calendar, Google Meet, survey, payment, publishing, or filing.
- Multiple founder-facing agent personas.
- Unbounded autonomous research.
- Hidden model reasoning transcripts.
- Treating a complete document as validated merely because every section has text.
- Building a large operations suite before the tracer-bullet plan and work board are useful.

## Definition of done for the product direction

The redesign is successful when a new founder can:

1. Enter an idea.
2. See a complete but honest business model within five minutes.
3. Understand its score and weakest assumptions.
4. Review and start a useful research plan.
5. Watch AI work on a visible board.
6. Talk with one co-founder who remembers the project.
7. Receive concrete help for founder-owned work.
8. Capture interviews and payment signals from web or mobile.
9. Review successive plan versions and accept changes section by section.
10. Understand how each new input improved or weakened the business model.
