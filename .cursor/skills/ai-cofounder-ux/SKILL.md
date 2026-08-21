---
name: ai-cofounder-ux
description: >-
  Designs the product as a guided decision-making system for an AI co-founder,
  not as isolated screens, cards, or chat messages. Use when designing or
  modifying UI, UX, conversation flows, recommendations, confirmations,
  business-state panels, or any feature where the AI walks the user through
  business-building decisions (stage, objective, evidence, interpretation,
  recommendation, user decision, result, next step).
---

# AI Co-Founder UX Orchestration Skill

## Purpose

Design the product as a **guided decision-making system**, not as a collection of screens, cards, widgets, or chat messages.

The AI co-founder walks the user through a sequence of business-building decisions. Every AI action must have a clear relationship between:

**Context → Information → Interpretation → Recommendation → User Decision → Action → Result → Next Step**

The interface must make this relationship obvious without requiring the user to infer it.

---

## Core UX Principle

The user should never have to ask:

- Where am I?
- Why am I seeing this?
- Why is the AI telling me this?
- What decision am I supposed to make?
- What will happen if I click this?
- What changed after I clicked it?
- What should I do next?
- What have we already decided?

The UI must answer these questions through hierarchy, grouping, copy, state, and interaction.

---

## Primary Mental Model

Treat every part of the product as a stateful business-building workflow.

```text
BUSINESS GOAL
      ↓
CURRENT STAGE
      ↓
CURRENT OBJECTIVE
      ↓
AI INVESTIGATION / REASONING
      ↓
INFORMATION
      ↓
AI INTERPRETATION
      ↓
RECOMMENDATION
      ↓
USER DECISION
      ↓
CONFIRMATION
      ↓
STATE CHANGE
      ↓
CONSEQUENCE / RESULT
      ↓
NEXT OBJECTIVE
```

Do not design isolated UI components first.

First determine:

1. What the user is trying to accomplish.
2. What the AI knows.
3. What the AI needs to determine.
4. What information the user needs.
5. What decision the user needs to make.
6. What state changes after that decision.
7. What the next logical step is.

Only then determine the appropriate UI.

---

# 1. Model the User Journey as Stages

The user must always understand their position in the larger business-building journey.

For example:

```text
Idea
  ↓
Problem
  ↓
Target Customer
  ↓
Market
  ↓
Competition
  ↓
Value Proposition
  ↓
Business Model
  ↓
Validation
  ↓
Go-To-Market
```

The exact stages may differ by product flow.

However, every stage must have:

- A clear name
- A purpose
- A measurable or understandable outcome
- A relationship to previous decisions
- A logical next step

Never make the user reconstruct the workflow from conversation history.

---

# 2. Define the Current Objective

Every interaction must have a current objective.

Bad:

> Market Research

Better:

> Determine whether there is a sufficiently attractive market for the proposed customer and problem.

The user should immediately understand:

**What are we trying to accomplish right now?**

The objective should drive the entire screen.

---

# 3. Treat Information as Evidence

Information should not appear merely because it is interesting.

Every significant information block must answer:

> Why does the user need to know this right now?

Information should normally support one of:

- Understanding
- Comparison
- Validation
- Decision-making
- Consequence analysis

When appropriate, explicitly connect evidence to the conclusion.

Example:

```text
Evidence
↓
Three competitors already target this segment.

Interpretation
↓
The market is validated, but differentiation is important.

Recommendation
↓
Position the product around workflow automation rather than
generic AI assistance.
```

Do not present the evidence, interpretation, and recommendation as unrelated cards.

---

# 4. Treat AI Recommendations as First-Class Interaction States

When the AI reaches a conclusion, clearly distinguish:

### What I found

Evidence or facts.

### What I think

AI interpretation.

### What I recommend

Proposed direction.

### What I need from you

The user decision.

For example:

```text
What I found
Small SaaS teams commonly struggle with fragmented workflows.

What I think
The problem is strongest when teams have already outgrown
manual processes but cannot justify enterprise software.

My recommendation
Start with SaaS companies with 5–20 employees.

Your decision
Use this as our initial target customer?

[Accept recommendation] [Modify]
```

The user should never mistake an AI recommendation for an already-approved business decision.

---

# 5. Confirmation Is a Core UX State

Any AI action that changes persistent business state must have an explicit confirmation state.

Examples:

- Changing the target customer
- Changing the primary problem
- Selecting a revenue model
- Accepting a positioning statement
- Replacing a business assumption
- Generating or modifying a major business artifact

Use this pattern:

```text
PROPOSED CHANGE

Current:
Small businesses

Proposed:
SaaS companies with 5–20 employees

Why:
[reason]

Impact:
This may affect market analysis, pricing, and go-to-market assumptions.

[Confirm change] [Keep current]
```

Never silently mutate important business state.

---

# 6. Make Actions Explainable

Every meaningful action must communicate:

1. What will happen?
2. Why is it useful?
3. What information will be used?
4. What will change?
5. What happens afterward?

Bad:

```text
[Generate Business Model]
```

Better:

```text
Generate Business Model

I'll use the problem, target customer, market assumptions,
and revenue hypotheses we've established to create an initial
business model.

[Generate]
```

For destructive or consequential actions, make the impact especially explicit.

---

# 7. Make Results Connected to Actions

After an action occurs, do not merely render a new component.

Explicitly communicate:

**What happened → What changed → Why it matters → What happens next**

Example:

```text
Business model created

I've created an initial business model using the assumptions
we agreed on.

New assumptions:
• Primary customer: SaaS teams, 5–20 employees
• Revenue model: subscription
• Primary channel: direct sales

These assumptions will now be used in the validation stage.

[Review business model]
[Continue to validation]
```

The result should feel like a continuation of the interaction, not a newly appearing dashboard.

---

# 8. Use Explicit AI Action Types

When designing an interaction, classify the AI action.

## INFORM

The AI provides information.

```text
Here's what I found...
```

No confirmation required unless the information causes a state change.

---

## ASK

The AI needs information from the user.

```text
Which customer experiences this problem most often?
```

Provide the most appropriate input mechanism.

---

## RECOMMEND

The AI interprets information and proposes a decision.

```text
I recommend targeting X because...
```

Provide confirmation / modification controls.

---

## GENERATE

The AI creates an artifact.

```text
I'll create an initial business model from our current assumptions.
```

Show inputs/context where useful and clearly present the generated result.

---

## REVIEW

The AI has created something that requires human inspection.

```text
I've created the first version of your business model.

[Review]
```

Make approval/revision explicit.

---

## CHANGE

The AI proposes modifying an existing decision.

Clearly show:

```text
Before → After
```

and explain downstream implications.

---

# 9. Preserve Business State Separately From Conversation

The conversation is the **process**.

The business model is the **persistent artifact**.

Do not force users to scroll through conversation history to understand the current state.

Maintain a persistent representation of important decisions such as:

```text
Problem
Target Customer
Market
Competitors
Value Proposition
Pricing
Revenue Model
Channels
Key Assumptions
Validation Status
```

The conversation explains how these decisions were reached.

The business state shows what currently exists.

If the user changes one decision, make affected downstream assumptions visible.

---

# 10. Surface Consequences of Changes

Business decisions are interconnected.

When changing an existing decision, identify potentially affected areas.

Example:

```text
Changing the target customer may affect:

• Market size
• Competitor analysis
• Pricing
• Value proposition
• Business model
• Go-to-market strategy
```

Do not overwhelm the user with implementation details.

Show enough information for the user to understand the consequence of the decision.

---

# 11. Establish Visual Hierarchy

A typical AI co-founder interaction should follow this hierarchy:

```text
1. WHERE AM I?
   Current stage

2. WHAT ARE WE DOING?
   Current objective

3. WHAT DID WE FIND?
   Evidence / research

4. WHAT DOES THE AI THINK?
   Interpretation

5. WHAT DOES THE AI RECOMMEND?
   Proposed decision

6. WHAT DO YOU NEED TO DO?
   Primary action

7. WHAT HAPPENED?
   Result

8. WHAT'S NEXT?
   Next logical objective
```

Not every interaction requires every section.

However, the conceptual relationship must remain intact.

---

# 12. Do Not Turn Everything Into Cards

Cards are not a substitute for information architecture.

Do not create a card simply because a piece of information exists.

Choose UI based on the information's role:

- Decision → decision panel
- Comparison → comparison layout
- Sequential process → flow / stepper
- Evidence → evidence section
- Generated artifact → document/artifact view
- User input → appropriate form/input
- Progress → progress indicator
- Persistent business state → business state panel
- AI explanation → conversational or explanatory block

Avoid dashboards full of visually equal components.

---

# 13. Establish Primary and Secondary Actions

Every meaningful interaction should have a clear hierarchy.

Prefer:

```text
Primary:
[Accept recommendation]

Secondary:
[Modify]

Tertiary:
[Ask why]
```

Avoid:

```text
[Accept]
[Reject]
[Edit]
[Research]
[Regenerate]
[Compare]
[Skip]
[Continue]
[Ask AI]
[Save]
```

all competing for attention at the same time.

When many actions are genuinely needed, group them by intent.

---

# 14. Keep the User in Control

The AI is a co-founder, not an autonomous operator.

The interface should make clear:

- What the AI knows
- What the AI assumes
- What the AI recommends
- What the user has approved
- What is still uncertain
- What the AI is about to change

Use language that distinguishes these states.

For example:

```text
AI assumption
AI recommendation
User-approved decision
Unvalidated hypothesis
Validated finding
```

Do not blur them together.

---

# 15. Support Progressive Disclosure

Do not show every piece of reasoning, evidence, metadata, and implementation detail at once.

Default view:

```text
Recommendation
Why
Decision
```

Optional deeper layers:

```text
View evidence
View assumptions
View methodology
View detailed analysis
```

The primary workflow should remain understandable without opening every detail.

---

# 16. Make "Next Step" Explicit

After a completed interaction, the system should know the next meaningful objective.

Avoid ending with:

```text
Done.
```

Prefer:

```text
Target customer confirmed.

We can now estimate the size of this market and determine
whether it is large enough to justify the opportunity.

[Validate market →]
```

The user should never wonder:

> "What am I supposed to do now?"

---

# 17. Design for State, Not Screens

Do not think in terms of:

```text
Screen A
Screen B
Screen C
```

Think:

```text
Stage
  ↓
Objective
  ↓
AI state
  ↓
User state
  ↓
Business state
  ↓
Available actions
  ↓
Next state
```

The same UI component may therefore appear in different contexts depending on state.

The design should be driven by the workflow state rather than by arbitrary page boundaries.

---

# 18. UX Generation Process

When asked to design or modify a feature, follow this sequence.

### Step 1 — Identify the workflow stage

Determine where the user currently is in the business-building journey.

### Step 2 — Identify the objective

State what the user and AI are trying to accomplish.

### Step 3 — Identify the decision

Determine what decision must eventually be made.

### Step 4 — Identify required evidence

Determine what information the user needs in order to make that decision.

### Step 5 — Determine the AI's role

Classify the interaction as:

`INFORM | ASK | RECOMMEND | GENERATE | REVIEW | CHANGE`

### Step 6 — Determine the state transition

Describe:

```text
Current state
→ User action
→ New state
```

### Step 7 — Identify consequences

Determine what business state changes and what downstream areas may be affected.

### Step 8 — Design the interaction

Only now choose the appropriate UI components.

### Step 9 — Design the continuation

Define what the user sees after completion and what the next logical action is.

---

# 19. Mandatory Design Questions

Before implementing a UI, answer these questions:

```text
Where is the user in the overall business journey?

What is the current objective?

What does the AI already know?

What does the AI need to determine?

What information does the user need?

What recommendation is being made?

Does the user need to approve anything?

What exactly changes when they approve it?

What downstream assumptions are affected?

How is the result communicated?

What is the next logical step?

Where can the user see the current business state?
```

If these questions cannot be answered, do not begin implementation.

---

# 20. UX Quality Gate

Before considering a feature complete, verify:

- [ ] The current business stage is obvious.
- [ ] The current objective is obvious.
- [ ] Major information has contextual purpose.
- [ ] Evidence and recommendation are visually connected.
- [ ] AI interpretation is distinguishable from factual information.
- [ ] AI recommendations are distinguishable from user-approved decisions.
- [ ] Important state changes require confirmation.
- [ ] Actions explain what they will do.
- [ ] Consequences of important changes are visible.
- [ ] The primary action is obvious.
- [ ] The result of an action is clearly communicated.
- [ ] The next step is obvious.
- [ ] The user can understand current business state without reading the entire conversation.
- [ ] Related content is grouped.
- [ ] Unrelated content is separated.
- [ ] No component exists merely because there was nowhere else to put it.
- [ ] The interface feels like a guided co-founder workflow rather than a generic dashboard.

---

# Core Rule

**Never design a component in isolation.**

Every component must have a role in the decision flow.

The intended experience is:

> **The AI understands where we are, explains why something matters, gives me the information I need, recommends what we should do, asks me to confirm important decisions, shows me what changed, and guides me toward the next decision.**

The UI should make that progression visually and interactively obvious.
