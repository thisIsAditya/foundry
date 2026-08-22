# Product reset — founder journey system

**Status:** current replacement baseline
**Date:** 22 August 2026
**Decision:** BusinessGenerator is a founder-controlled business journey system. It is not a custom multi-agent platform.

## 1. Product promise

BusinessGenerator helps a person turn an early business idea into a living, trustworthy business model and take the next smallest meaningful action.

It gives the founder:

- a clear place to capture the idea and the decisions that shape it;
- a guided path from uncertainty to evidence, business-model choices, and one meaningful next validation experiment;
- a durable overview of what is known, assumed, tested, decided, blocked, and next;
- one AI co-founder that explains, prepares, researches, drafts, and helps the founder make decisions without taking ownership away.

The durable product is the business record and its journey history. Conversation and AI work are interfaces to that record, not the system of record.

## 2. Product boundaries

### In scope for the first product

- One venture journey per project, with an owner and optional collaborators.
- A structured, versioned business record that can be read, edited, exported, and traced.
- A flexible state machine that recommends a path to a presentable business model and next validation experiment, but permits an explicit revisit, defer, or skip decision.
- An overview that answers: where am I, what have I decided, what is uncertain, what changed, and what should I do next?
- Small, founder-sized steps with a clear objective, expected effort, and completion evidence.
- One persistent AI co-founder that works from the current business record and creates reviewable proposals.
- Evidence capture, assumptions, decisions, experiments, and business artifacts with provenance.
- Draft-only AI assistance and connected-system actions.

### Explicitly out of scope

- A custom orchestrator, agent roster, worker pool, critic loop, agent-to-agent conference, or user-selectable specialist personas.
- An autonomous business operator, build/launch programme, or an AI that claims to validate customers, demand, revenue, or legal compliance without real evidence.
- A mandatory, linear questionnaire or a rigid process that prevents a founder from recording work already completed.
- Treating chat history as the business record.
- Automated sending, publishing, charging, filing, scraping outside policy, or other external side effects in the initial product.

## 3. Core product model

### 3.1 Business journey

The journey is a state machine, not a checklist and not a waterfall. Each stage has a purpose, a visible outcome, an allowed set of next steps, and a founder-controlled status.

| Stage                | Founder question                                | Primary outcome                                         |
| -------------------- | ----------------------------------------------- | ------------------------------------------------------- |
| Idea                 | What do I want to explore?                      | Idea, intent, constraints, and starting context         |
| Problem              | Whose problem is this and why does it matter?   | Problem hypothesis and initial customer                 |
| Customer             | Which first customer should we focus on?        | Beachhead, persona, and buying context                  |
| Evidence             | What supports or weakens this belief?           | Evidence ledger, assumptions, and learning              |
| Opportunity          | Is this an attractive opportunity?              | Alternatives, market framing, risks, and wedge          |
| Offer                | What value will we offer and how could it work? | Value proposition, offer, business model, and economics |
| Validation next step | What would most efficiently test this model?    | One founder-controlled experiment with success criteria |

Stage status is independent from its content: `not_started`, `draft`, `in_progress`, `awaiting_founder`, `ready_for_review`, `complete`, `deferred`, `blocked`, and `revisited`. A founder can move backward or work in parallel where that makes sense; the app must show the consequence of doing so.

### 3.2 Business record

The business record is the canonical representation of a venture. It contains:

1. founder intent, constraints, geography, and goals;
2. problem, target customer, and customer context;
3. hypotheses and assumptions;
4. evidence, sources, observations, interview notes, and citations;
5. alternatives, competitors, and opportunity framing;
6. value proposition, offer, business model, pricing, and economics;
7. decisions, rationales, unresolved questions, and downstream impacts;
8. experiments, commitments, metrics, and results;
9. small next steps, milestones, and founder tasks;
10. generated artifacts and exports.

Every material item must show its status and provenance: `founder_input`, `cited_evidence`, `derived`, `ai_proposal`, `founder_approved`, `unverified`, `contradicted`, or `stale`.

### 3.3 Change and approval model

The co-founder may propose, draft, summarize,

calculate, or retrieve. It must not silently change material business state.

For a material change, the user sees:

1. the current value;
2. the proposed value;
3. the reason and supporting evidence;
4. affected downstream record areas;
5. an explicit accept, modify, or keep-current action.

Accepted changes are versioned. The record retains who made the change, when, what evidence was used, and why dependent fields became stale.

## 4. Founder experience requirements

### 4.1 Start from an idea

The founder can create a venture from a short idea. The app asks only for information that changes the recommended first step: goal, relevant experience, constraints, geography, and urgency.

The result is an initial journey map and a clearly labelled working record. Empty sections are acceptable; invented facts are not.

### 4.2 Make progress in small steps

The home experience presents one recommended next step and a small number of alternatives. Each step states:

- the current stage and objective;
- why it matters now;
- expected founder effort and time;
- what the co-founder will do;
- what evidence, decision, or record change will result;
- what happens next.

The founder can pause, defer, revisit, or choose another appropriate step without losing context.

### 4.3 Keep an eagle's-eye view

At every point, the founder can see:

- current stage, objective, and journey progress;
- accepted decisions and unresolved questions;
- the most important assumptions and their evidence state;
- changes since the last visit;
- active, waiting, and completed steps;
- the current version of each business-record section;
- what is blocked and what would unblock it.

The overview is a navigable view of business state. It is not a dashboard of equal-weight cards or a transcript viewer.

### 4.4 Work with the co-founder

The co-founder is a single, persistent guide. It uses the business record, relevant evidence, previous decisions, and the current journey state to help the founder move forward.

Every significant co-founder interaction has a discernible action type:

- **Ask** for founder-specific information.
- **Inform** with facts, changes, or status.
- **Recommend** a decision with evidence and a rationale.
- **Generate** a draft artifact or proposal.
- **Review** a founder input or AI proposal.
- **Change** an existing decision through explicit confirmation.

The co-founder must distinguish facts, founder input, assumptions, AI interpretation, and founder-approved decisions. It must state uncertainty and the next step without exposing hidden reasoning.

## 5. AI and external-system requirements

The application, not an agent runtime, owns the journey state machine, authorization, policy, business record, provenance, versioning, and user approvals.

The AI co-founder receives a bounded context assembled from those records. It returns structured, validated proposals and user-facing explanations. Tool access is mediated by an application-owned capability gateway with a least-privilege allowlist and audit trail.

Initial AI capabilities are limited to:

- explaining the current state and next step;
- preparing questions, experiments, outreach, and artifacts;
- summarizing founder-supplied notes and documents;
- researching through approved, bounded sources;
- performing deterministic calculations through application services;
- proposing record changes for founder review.

External operations remain draft-only until a future, separately approved policy and execution design exists.

## 6. Release sequence

The first releasable product proves the state machine, business record, overview, small steps, and a single co-founder experience. DeepSeek Harness is evaluated only after those application-owned boundaries are working. It may become an isolated runtime implementation, but it is never the authority for business state or approval decisions.

## 7. Success criteria

A founder can:

1. capture an idea and see an honest, structured starting record;
2. understand the current stage, objective, confidence, and next smallest useful action;
3. return after time away and immediately understand what changed;
4. record evidence, make decisions, and see their effect on the journey;
5. use one co-founder that retains relevant context and asks for approval before important changes;
6. export or review the business record without relying on the conversation transcript.

The product must never imply that a generated record, model confidence, or AI activity is real-world validation.
