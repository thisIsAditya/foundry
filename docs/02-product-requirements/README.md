# BusinessGenerator product requirements

**Status:** Proposed product direction  
**Date:** 18 August 2026  
**Audience:** Product, design, coding agents, and reviewers  
**Scope:** Web app, mobile app, worker/backend, and shared product contracts

## Why this document exists

BusinessGenerator currently proves that the technical foundation works: a founder can create a workspace and project, connect a model, answer questions, capture interviews, run a sprint, and inspect pack output.

The product now needs a different operating model. It must feel like an AI co-founder that shares the work of turning an idea into a business model. It must not feel like a sequential questionnaire that sends the founder away with homework before showing value.

These documents turn the product feedback from the founder into requirements that a coding agent can implement and review. They describe the desired product behavior, not a commitment to preserve the current screens or service boundaries.

## Read in this order

1. [Shared product requirements](./01-shared-product-requirements.md)
2. [Web requirements](./02-web-requirements.md)
3. [Mobile requirements](./03-mobile-requirements.md)
4. [Worker and backend requirements](./04-worker-backend-requirements.md)
5. [Delivery slices and acceptance criteria](./05-delivery-slices.md)

## Product decision summary

The following decisions were confirmed during product discovery:

- The first screen after an idea is entered shows a complete, end-to-end business model draft and a short summary.
- The first draft is intentionally low-confidence where evidence is missing. It uses visible assumptions and research questions instead of leaving the founder with a blank screen.
- AI may research and draft with assumptions. It should ask the founder only questions that materially change the plan.
- Baseline research is proposed first. The founder sees what will be researched and starts the job.
- Research includes public web sources, competitor and company information, academic papers, public market data, and cited reports where available.
- Interviews, real payment or commitment signals, and external side effects remain founder-owned.
- The quality view has one overall score and separate transparent scores for customer clarity, evidence, market support, economics, willingness to pay, execution readiness, and risk control.
- The plan is versioned. AI creates a draft revision; the founder can accept the whole draft or individual sections.
- The founder speaks only to the co-founder. Specialist roles may appear as plain-language work labels on the board, but they do not become separate chat personas.
- The co-founder delegates work to AI jobs and creates guided founder tasks.
- The work board is the control panel. It shows assignments, progress, outputs, blockers, cost, and settings.
- Safe advanced controls allow the founder to change model, reasoning effort, context size, tools, budget, and run state within policy limits.
- External actions are draft-only in the first product version. The app may prepare email, survey, meeting, payment-link, and publishing drafts but does not connect, send, publish, charge, or file.
- The co-founder has durable project conversation history, decisions, assumptions, approved facts, and founder preferences.
- Web and mobile have equivalent core capabilities. Web favors command-center density; mobile favors focused actions, capture, and notifications.
- The initial launch is India-first but the core journey and research model must support country expansion.
- The target time to value is five minutes: complete draft, scorecard, proposed research plan, and work board.
- The primary success measure is founder momentum: the founder understands the opportunity, sees visible progress, and completes useful tasks instead of feeling interrogated.

## Current implementation versus target

The current application has a useful foundation but does not yet satisfy this product direction:

- The desk chat is a single clarification call and has no durable conversational experience.
- Sprint orchestration has the shape of a worker pipeline, but the default path uses one worker and does not route work by phase.
- Tool definitions and model providers exist, but the co-founder does not yet delegate research and tool-backed jobs through a visible board.
- The current pack has a small set of presentation sections. The target pack is a complete business model with section-level evidence and readiness states.
- Gate rules and interview capture exist, but they should become inputs to a continuous score rather than a wall that blocks all useful progress.

This gap is intentional context for implementation. Do not treat the current sequential flow as the product requirement.

## Glossary

- **Co-founder:** The only founder-facing AI conversation and coordination identity.
- **Business model:** The complete, versioned representation of the opportunity, evidence, assumptions, economics, execution plan, and decisions.
- **Pack revision:** An immutable plan version. AI proposals are drafts until accepted.
- **Job:** A bounded unit of AI or system work with an owner, inputs, tools, budget, progress, and output.
- **Founder task:** A bounded action only the founder can credibly complete, such as an interview or payment conversation.
- **Evidence:** A source, quote, interview, observation, payment signal, or other traceable support for a claim.
- **Assumption:** A useful but unverified statement that must not be presented as fact.
- **Tracer bullet:** A complete end-to-end version of the business model that becomes more reliable through successive research and founder inputs.
