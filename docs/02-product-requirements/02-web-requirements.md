# Web application requirements

**Status:** current
**Date:** 22 August 2026
**Implements:** [Shared founder-journey requirements](./01-shared-product-requirements.md)

## 1. Role of the web experience

The web app is the founder's primary place to understand, shape, and resume a
venture. It should feel like a living business-model workspace guided by a
co-founder—not a chatbot, project-management board, questionnaire, or
multi-agent control room.

At every location, the interface must make these questions easy to answer:

1. Where am I?
2. What are we trying to achieve now?
3. What do we know, assume, or need to learn?
4. What decision or action is mine?
5. What changes if I act?
6. What should happen next?

## 2. Information architecture

The project shell exposes these founder-facing destinations:

1. **Overview** — current position, changes, readiness, and one recommended
   continuation.
2. **Journey** — stages, recommended steps, active/deferred/blocked work, and
   transition history.
3. **Business model** — the presentable record and its version history.
4. **Evidence** — sources, notes, interviews, observations, and assumptions.
5. **Decisions** — accepted choices, proposals awaiting review, and consequences.
6. **Co-founder** — the persistent conversation and contextual help surface.

Settings, membership, and later integration preferences live outside the
progression flow. The shell must not expose a specialist-agent directory, a
sprint board, worker controls, agent traces, model tuning, raw MCP tools, or
cost controls as primary founder navigation.

The co-founder may be available as a persistent, collapsible side surface on
wide screens, but it must not obscure the current journey objective or replace
the dedicated Co-founder destination.

## 3. First-session experience

### 3.1 Idea capture

Creating a venture asks only for information that changes the first
recommendation:

- idea in the founder's own words;
- desired outcome or reason to explore it;
- optional target customer;
- optional geography;
- optional constraints, available time, or relevant experience.

The flow must show clear labels, useful examples, and progressive disclosure.
It must not require an interview, pricing, market-size estimate, provider
configuration, workspace setup, or a multi-page intake.

### 3.2 Initial result

After saving an idea, the app creates:

- the `Idea` stage and initial objective;
- a business-record skeleton containing the founder's actual input;
- explicitly labelled hypotheses only where they help begin the next step;
- a first recommended founder-sized step with alternatives to defer or choose
  another appropriate action; and
- a co-founder explanation of what is recorded, uncertain, and next.

The initial result must not generate an apparently complete business plan,
silently start research, classify an idea as validated, or imply that missing
sections contain facts.

## 4. Overview

### 4.1 Purpose

Overview is the default project screen and the primary “eagle's-eye” view. It
is a navigable summary of business state, not a dashboard of equal-weight cards.

### 4.2 Required content

Above the fold, the overview shows:

- venture name and founder-authored opportunity summary;
- current journey stage and plain-language objective;
- one recommended next step with its effort, why it matters, and primary action;
- active, waiting-for-founder, deferred, and blocked steps;
- major readiness signals with concise explanations;
- accepted decisions and high-impact assumptions;
- changes since the founder's last visit;
- proposals that need review; and
- a link to the current business-model version.

The page may offer a small number of relevant alternate steps. It must not
overwhelm the founder with every possible action, metrics, arbitrary cards, or
technical runtime activity.

### 4.3 Resume state

When the founder returns after time away, Overview starts with a short change
summary:

> What changed → why it matters → the recommended continuation.

It must retain the last relevant location where practical, but the summary and
next action remain visible. A user must never need to infer the current state
from a chat transcript or a list of technical events.

## 5. Journey experience

### 5.1 Journey map

The journey view displays the stages in order and makes non-linear work clear.
For each stage it shows:

- plain-language purpose;
- status;
- accepted outcome or missing outcome;
- key evidence and assumptions;
- active or suggested steps;
- deferred, blocked, or stale conditions; and
- the effect of revisiting it.

The founder can open a stage to understand it, not merely mark it complete.
Stages are recommendations, never a locked wizard.

### 5.2 Step detail

Every step detail view includes:

- stage and objective;
- what the founder is trying to achieve;
- why it is useful now;
- expected effort and what to prepare;
- input form, capture action, or decision controls;
- the evidence or completion criteria;
- co-founder help that can prepare a script, draft, explanation, or comparison;
- preview of record items affected;
- defer, skip-with-reason, and discuss actions where appropriate; and
- the expected next step after completion.

The primary action must be obvious. Important changes receive an explicit
confirmation view before an accepted record version is created.

### 5.3 Progress and activity

The activity presentation describes meaningful founder outcomes, such as
“Problem hypothesis revised,” “Interview observation added,” or “Offer
proposal ready for review.” It must not expose simulated typing, worker
identities, private model reasoning, or a sub-agent topology.

If a future bounded co-founder operation is still running, show the founder its
plain-language objective, safe cancellation state, current outcome, and any
action required. Do not call it a sprint or show parallel worker counts.

## 6. Business-model experience

### 6.1 Model overview

The Business model destination renders the twelve sections defined in the
shared requirements. For every section, show:

- plain-language section purpose;
- concise current summary;
- status and readiness explanation;
- material provenance labels;
- linked evidence, assumptions, and decisions;
- last changed actor and time;
- stale or contradictory information; and
- smallest action that would improve it.

Sections that are unknown must say so directly. A completed-looking template
must never obscure missing information.

### 6.2 Section detail

Opening a section provides a document-like reading and editing experience with:

- structured values when useful;
- evidence and assumptions in context;
- linked decisions and downstream effects;
- accessible version history;
- current versus proposed changes; and
- a clear action to revise, add evidence, or continue the journey.

The section detail must use progressive disclosure. It should not force a
founder to read every citation or system field before understanding the current
model.

### 6.3 Export

The founder can export a presentable view of the accepted business model. The
export identifies the record version and generation date, preserves uncertainty
and evidence labels where material, and never labels the model “validated”
unless the underlying record provides genuine evidence for that statement.

## 7. Evidence and decisions

### 7.1 Evidence capture and review

The Evidence destination supports:

- founder observations and notes;
- interview notes and quoted statements;
- attached documents and links;
- source citations and retrieved findings when later research is enabled;
- assumption creation and linking;
- filtering by section, provenance, freshness, conflict, and status; and
- safe editing or correction with history.

Capture is optimized for speed: meaningful labels, minimal required fields, and
the ability to add context later. Evidence capture must make it clear whether
the entry is a founder observation, an external source, or an unverified
assumption.

### 7.2 Decisions and proposal review

The Decisions destination presents:

- accepted decisions and rationale;
- current proposals awaiting founder review;
- options considered and impacts;
- stale downstream content; and
- transition and acceptance history.

A material proposal must show a before/after comparison, source and evidence,
uncertainty, and affected areas before the founder can accept it. The interface
must offer **Accept**, **Modify**, and **Keep current** rather than treating an
AI recommendation as final.

## 8. Co-founder experience

### 8.1 Conversation

The co-founder is a single persistent identity across all project views. The
conversation supports:

- free text;
- contextual suggested prompts;
- references to stages, steps, evidence, decisions, and model sections;
- explicit Ask, Inform, Recommend, Generate, Review, and Change response
  states;
- proposal review cards;
- focused help for the current step; and
- recovery from a failed response without losing the founder's work.

The co-founder response must place explanation before action and make the
expected state change clear. Plain chat text is insufficient for a material
proposal or decision.

### 8.2 Contextual help

From a journey step, the founder can ask the co-founder to:

- explain why the step matters;
- prepare an interview guide or note template;
- draft an outreach or experiment outline;
- compare plausible customer or offer choices;
- summarize supplied notes; or
- explain a proposed record change.

The help remains clearly draft-only. It does not create an external action,
silently change the model, or navigate the founder into a new agent persona.

## 9. Accessibility, responsiveness, and trust

- The core experience works at desktop, tablet, and narrow mobile widths.
- All functionality is keyboard accessible, with visible focus and logical
  navigation order.
- Color alone never communicates status, evidence strength, or approval state.
- Touch targets are at least 44 by 44 CSS pixels where practical.
- Forms use visible labels, near-field errors, and inline explanation.
- Loading, paused, failed, and saved states are explicit and recoverable.
- Motion is brief, meaningful, and respects reduced-motion preferences.
- The interface favors readable 16px-or-larger body text, sufficient contrast,
  and a responsive layout without horizontal scrolling.

## 10. Web acceptance criteria

The web experience is complete for the initial journey release when a founder
can:

1. create a venture from a short idea;
2. understand the current objective and one recommended next step;
3. capture evidence or make a decision in a focused short session;
4. defer or revisit work with visible consequences;
5. see what changed after returning later;
6. inspect the entire accepted business model and its uncertainty;
7. review an AI proposal without silently accepting it;
8. use one co-founder throughout the journey; and
9. complete or defer a validation experiment plan.

It is not complete if the primary experience still centers on a work board,
sprint controls, specialist identities, agent-step traces, model selection, or
unbounded AI activity.
