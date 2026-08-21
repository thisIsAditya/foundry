# Shared founder-journey requirements

**Status:** current
**Date:** 22 August 2026
**Implements:** [Product reset](./00-product-reset.md)

## 1. Product outcome

BusinessGenerator helps a time-constrained, early-stage founder make an idea
clearer, more testable, and more presentable over many short sessions.

The first product ends when the founder has:

1. a readable, evidence-aware business model;
2. a traceable record of assumptions, evidence, decisions, and uncertainty;
3. one founder-controlled validation experiment with success criteria; and
4. a clear next action when they return.

It does not promise a validated company, build or launch a product, run company
operations, or replace the founder's judgment and real customer contact.

## 2. Product principles

### 2.1 The record is more important than the conversation

Conversation helps the founder make progress. The business record holds the
accepted result of that progress. A founder must be able to understand the
venture without replaying chat history.

The application is the only authority for:

- venture ownership and access;
- the journey state machine;
- record versions and material record items;
- provenance, evidence links, decisions, and staleness;
- approval, policy, budget, and external-action controls.

### 2.2 Progress must fit a busy life

The default action is one small, meaningful step—not a long questionnaire,
full-plan review, or opaque background operation. Every step must say:

- where it sits in the journey;
- the current objective;
- why it matters now;
- what the founder needs to do or decide;
- expected effort or elapsed time;
- what the co-founder can prepare or explain;
- what record item, evidence, or decision will result; and
- the likely next step.

The founder may pause, defer, skip with a reason, revisit earlier work, or
choose another relevant recommended step. Those choices are recorded and their
impact is visible.

### 2.3 Honest uncertainty creates trust

The product must distinguish founder input, evidence, calculation, AI
interpretation, and accepted decisions. It must never represent a generated
hypothesis, source summary, or formatting completeness as real-world
validation.

The system must not invent named customers, interviews, quotes, payments,
market values, legal conclusions, or external actions.

### 2.4 The co-founder supports decisions; it does not make them

There is one founder-facing co-founder. It may prepare material, organize
information, calculate from approved inputs, retrieve bounded evidence, and
propose changes. It must obtain an explicit founder action before material
business state becomes accepted.

There are no specialist personas, app-defined sub-agents, agent conference
loops, critic agents, or user-managed worker pools.

## 3. Canonical journey

The journey is a flexible state machine. A stage is a meaningful business
question, not a hard gate or linear form sequence.

| Stage                | Founder question                                         | Required outcome before it can be described as complete            |
| -------------------- | -------------------------------------------------------- | ------------------------------------------------------------------ |
| Idea                 | What opportunity do I want to explore?                   | Founder-authored idea, intent, constraints, and starting context   |
| Problem              | What recurring problem may matter?                       | Testable problem hypothesis and material open questions            |
| Customer             | Whose problem should we focus on first?                  | Beachhead hypothesis and customer context                          |
| Evidence             | What supports, weakens, or contradicts this belief?      | Evidence and assumptions are visibly separated                     |
| Opportunity          | Is there a focused and differentiated opportunity?       | Alternatives, risks, opportunity framing, and initial wedge        |
| Offer                | What value might be offered, to whom, and on what terms? | Value proposition, candidate offer, and coherent model assumptions |
| Validation next step | What is the smallest credible way to learn more?         | One experiment, success criteria, and founder-sized next action    |

### 3.1 Stage state

Each stage has a status independent of the content inside it:

`not_started`, `draft`, `in_progress`, `awaiting_founder`,
`ready_for_review`, `complete`, `deferred`, `blocked`, or `revisited`.

The venture also records:

- its current stage and current objective;
- recommended and active journey steps;
- completed, deferred, and blocked steps;
- explicit transition history;
- the current accepted business-record version; and
- reasons for deferral, revisit, or blocked state.

Readiness signals may recommend a transition but never silently move the
founder to another stage. A completed form, AI response, or research result
does not itself complete a stage.

### 3.2 State transitions

Every material journey transition must be a command owned by the application.
It records the actor, time, reason, prior state, resulting state, and affected
record items.

The minimum transition commands are:

- `set_current_objective`
- `start_step`
- `submit_step_evidence`
- `mark_step_ready_for_review`
- `complete_step`
- `defer_step`
- `skip_step_with_reason`
- `block_step`
- `unblock_step`
- `revisit_stage`
- `accept_proposal`
- `reject_proposal`

When a change invalidates dependent work, the application marks the relevant
record items as `stale` and explains why. It does not delete the older decision
or evidence.

### 3.3 Founder-sized steps

The following are the default recommendation sequence. It is a guide, not a
locked checklist.

1. Capture the idea in the founder's own words.
2. State the desired outcome, constraints, geography, and available time.
3. Frame one or more testable problem hypotheses.
4. Choose an initial beachhead customer.
5. Record known alternatives and current workarounds.
6. Separate evidence from assumptions and add observations.
7. Prioritize the assumption that most needs learning.
8. Shape a value proposition and differentiation hypothesis.
9. Describe a candidate offer, pricing hypothesis, and constraints.
10. Review contradictions and complete the presentable model.
11. Choose one validation experiment and its success criteria.
12. Review the model and choose the next continuation.

A step may request founder input, collect evidence, ask for a decision, review a
proposal, or capture a result. It may not require a founder to claim evidence
they do not have.

## 4. Business record

### 4.1 Record structure

The accepted business record contains founder-readable sections:

1. Idea and founder context
2. Problem
3. Beachhead customer
4. Current alternatives
5. Evidence and learning
6. Assumptions and open questions
7. Opportunity and differentiation
8. Value proposition
9. Offer, pricing, and business model
10. Economics and constraints
11. Decisions and changes
12. Next validation experiment

Each section contains a human-readable summary plus structured values where
comparison, calculation, traceability, or downstream impact requires them.
Sections may be sparse. A blank or explicitly unknown section is preferable to
invented content.

### 4.2 Record-item metadata

Material record items must carry:

- identifier, type, and record section;
- value or content;
- status;
- provenance;
- linked evidence, assumptions, decisions, and related items;
- author or originating system action;
- created and last-changed timestamps;
- accepted-record version; and
- stale or downstream-impact references where applicable.

Record-item status is one of:

`empty`, `draft`, `needs_evidence`, `review`, `accepted`, `stale`, `deferred`,
or `blocked`.

Provenance is one of:

`founder_input`, `cited_evidence`, `derived`, `ai_proposal`,
`founder_approved`, `unverified`, or `contradicted`.

Status and provenance answer different questions. For example, a founder may
accept an `unverified` pricing hypothesis as the current working choice without
representing it as cited evidence.

### 4.3 Versioning and proposals

Accepted record state is immutable by version. A material edit creates a
proposal or founder-authored draft, then an accepted next version when the
founder confirms it.

For every material proposal, the review experience must show:

1. current value;
2. proposed value;
3. reason, uncertainty, and supporting evidence;
4. affected sections or assumptions;
5. the actor and source of the proposal; and
6. explicit actions to accept, modify, or keep the current value.

The founder may accept only selected changes. Accepting one change must not
silently accept unrelated proposed changes.

### 4.4 Evidence, assumptions, and decisions

An **evidence** item is a founder observation, interview note, source,
document, citation, or experiment result. It records its origin, date,
reliability notes, and the claims it supports or challenges.

An **assumption** is a testable uncertain claim. It records its impact, current
support, conflicts, and the smallest useful test.

A **decision** is a founder-approved choice. It records the selected option,
alternatives considered, rationale, supporting evidence, uncertainty, and
downstream consequences.

An **experiment** records the question, method, owner, success and failure
criteria, dates, observations, and conclusion. A proposed experiment is not an
executed experiment, and a generated outreach draft is not a customer signal.

## 5. Readiness and overview

The product provides explanatory readiness signals for:

- problem clarity;
- customer focus;
- evidence strength;
- opportunity understanding;
- offer clarity;
- economics coherence; and
- validation preparedness.

A signal must explain its evidence, assumptions, contradictions, freshness, and
the smallest action likely to improve it. It is not a 0–100 business-success
score, a gate that prevents documentation, or a claim that demand exists.

At any point, the overview must answer:

1. Where am I in the journey?
2. What are we trying to accomplish now?
3. What have I accepted or learned?
4. What remains uncertain, stale, deferred, or blocked?
5. What changed since my last visit?
6. What is the next smallest useful action?

## 6. Co-founder behavior

### 6.1 Interaction types

Every co-founder response has one primary interaction type:

- **Ask:** request founder-only context or a decision.
- **Inform:** explain current state, an event, or an evidence-backed fact.
- **Recommend:** propose a direction and ask for a decision.
- **Generate:** create a clearly labelled draft artifact or proposal.
- **Review:** help the founder inspect a record item, evidence item, or step.
- **Change:** propose a before-and-after change to accepted state.

Responses must identify the current objective, relevant context, uncertainty,
and next action. They must distinguish facts from interpretations and
recommendations without exposing hidden chain-of-thought.

### 6.2 Permitted initial capabilities

The co-founder may:

- explain the journey and current record;
- ask focused questions that materially affect the next step;
- summarize founder-provided notes and documents;
- prepare interview guides, outreach drafts, experiments, and model drafts;
- perform deterministic calculations through application services;
- retrieve information only through bounded, approved application capabilities;
- identify conflicts, stale content, and missing evidence; and
- create reviewable proposals and suggested steps.

It may not:

- create or accept a material business-record version by itself;
- claim a real-world action or validation it did not observe;
- use unrestricted filesystem, shell, browser, MCP, database, or connector
  access;
- create descendant agents or long-running autonomous work; or
- send, publish, charge, schedule, file, or modify an external system.

## 7. Return, export, and collaboration

When a founder returns after time away, the default view must provide:

- a concise change summary;
- current stage and objective;
- the active, deferred, or blocked step;
- major readiness signals and uncertainty;
- the current business-model record; and
- one recommended continuation action.

The founder can export a presentable business-model view with evidence and
uncertainty labels. Exported artifacts are projections of an accepted record
version and must state the version and generation date.

Venture collaborators may contribute evidence, drafts, or comments according to
their permission. Only an authorized founder action may accept a material
business decision.

## 8. Shared acceptance criteria

A release satisfies these requirements when a founder can:

1. create a venture from a short idea without a long questionnaire;
2. see a truthful empty-or-hypothesis-backed record, rather than an invented
   complete business plan;
3. complete one small step and see the resulting evidence, decision, or record
   change;
4. defer or revisit work and understand what may be affected;
5. return later and understand the current path without reading chat history;
6. distinguish founder input, evidence, assumptions, AI proposals, and accepted
   decisions;
7. review a material proposal before it changes accepted state;
8. choose a single validation experiment with explicit success criteria; and
9. export or review the current business model independently of the co-founder.

No acceptance path may depend on a specialist agent, a worker-pool run, an
autonomous research sprint, or an unapproved external side effect.
