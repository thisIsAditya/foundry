# Canonical founder journey and business-model record

**Status:** approved product specification
**Date:** 21 August 2026
**Implements:** [Product reset](../02-product-requirements/00-product-reset.md)

## 1. Journey rule

The journey ends with a presentable, evidence-aware business model and one recommended validation experiment. It does not include MVP delivery, launch, company operations, legal filing, or an autonomous operating system.

The app always has two simultaneous views:

- **Journey view:** the founder’s current objective and smallest useful step.
- **Business-model view:** the evolving, presentable record of what has been learned and decided.

Completing a step updates the record. The record is never reconstructed from chat history.

## 2. First session

After a founder enters an idea, the system creates an honest business-model skeleton:

- record the founder's actual idea and stated constraints;
- create explicitly labelled hypotheses only where a section needs a starting point;
- mark unsupported sections `unverified`, never as facts;
- show the current stage (`Idea`) and one recommended next step;
- offer a small number of alternatives, defer, and pause actions.

The first screen does not demand a long intake, generate a full “validated” plan, or start autonomous research.

## 3. Founder-sized steps

| Step | Objective | Founder action | Co-founder contribution | Record outcome |
| --- | --- | --- | --- | --- |
| 1. Capture the idea | Preserve the opportunity in the founder’s own words | Enter or confirm the idea | Reflect it back; identify missing context | Idea, founder intent, constraints |
| 2. Set the outcome | Establish what success would mean for this exploration | Choose goal, time horizon, geography, and constraints | Explain how choices affect the path | Founder context and decision criteria |
| 3. Frame the problem | State a specific recurring problem before describing a solution | Confirm, edit, or reject a problem hypothesis | Turn the idea into testable problem statements | Problem hypothesis and open questions |
| 4. Choose a beachhead | Focus on the first person or group to understand | Select or describe an initial customer | Compare plausible segments and explain trade-offs | Beachhead and customer context |
| 5. Map current alternatives | Learn how the customer solves the problem now | Add known alternatives or anecdotes | Organize substitutes, competitors, and do-nothing behaviour | Alternatives and opportunity framing |
| 6. Separate evidence from belief | Make uncertainty visible | Add notes, source links, interview observations, or defer | Summarize inputs; identify unsupported claims | Evidence and assumptions |
| 7. Prioritize the riskiest belief | Decide what must be learned next | Accept, reorder, or modify the ranked assumptions | Explain potential impact and uncertainty | Priority assumption and rationale |
| 8. Shape the value proposition | Define the proposed value for the beachhead | Review or edit the promise and differentiation | Draft alternatives, identify trade-offs | Value proposition and wedge |
| 9. Design the offer | State who pays, for what, and how value is delivered | Choose a candidate offer and pricing hypothesis | Compare models and calculate scenarios | Offer, revenue model, and pricing hypothesis |
| 10. Check model coherence | Make the model presentable and internally consistent | Review open contradictions and make decisions | Surface missing links, unsupported claims, and consequences | Business-model version and decision log |
| 11. Choose one validation experiment | Turn uncertainty into a real next action | Commit to, defer, or revise one test | Draft script, outreach, interview guide, or measurement plan | Experiment, success criteria, and founder task |
| 12. Review the model | Understand what exists and what to do after a break | Accept the reviewed model or revisit a prior step | Summarize evidence, uncertainty, and the recommended next action | Presentable business-model record and next experiment |

Steps are recommendations, not locks. A founder can revisit a prior step, work on a different relevant step, defer it with a reason, or add evidence at any time. The app records the reason and marks dependent content stale when appropriate.

## 4. Presentable business-model sections

The model is rendered in these founder-readable sections:

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

Each section displays:

- plain-language summary;
- status (`empty`, `draft`, `needs_evidence`, `review`, `accepted`, `stale`, `deferred`, or `blocked`);
- provenance of material claims;
- linked evidence, assumptions, and decisions;
- last changed time and actor;
- the smallest action that would improve the section.

The existing 17-section pack is a migration source, not the first-release presentation contract. Retain existing data where it maps to these sections; park build, go-to-market, legal, launch, and operations content as later extensions rather than forcing it into the core journey.

## 5. Readiness signals

The model shows readiness signals for:

- problem clarity;
- customer focus;
- evidence strength;
- opportunity understanding;
- offer clarity;
- economics coherence;
- validation preparedness.

Signals explain the evidence, assumptions, and actions behind them. They are not a success score, a promise of demand, or a hard lock on documentation and model progression.

## 6. Co-founder behavior within a step

For every interaction, the co-founder identifies:

1. current journey step and objective;
2. relevant accepted record and uncertainty;
3. whether it is informing, asking, recommending, generating, reviewing, or proposing a change;
4. what the founder needs to decide or provide;
5. what record item will change;
6. what the next smallest useful step will be.

The co-founder can draft research plans and founder materials, but it cannot represent a hypothesis, source summary, or generated draft as real-world founder evidence.

## 7. Pause and return

When a founder returns, the home view must provide:

- a two- to three-sentence change summary;
- current journey position;
- current model readiness and major uncertainty;
- active or deferred founder step;
- a single recommended continuation action;
- access to the complete business-model record.

This is the primary definition of “holds context.” The user must not need to reread a transcript to resume.
