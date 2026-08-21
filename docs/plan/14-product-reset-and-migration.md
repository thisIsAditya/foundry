# Product reset and migration plan

**Status:** current migration baseline
**Date:** 22 August 2026
**Implements:** [Product reset](../02-product-requirements/00-product-reset.md)

## 1. Decisions

1. The application owns the founder journey, business record, authorization, policy, approvals, and provenance.
2. The product has one founder-facing AI co-founder. It has no app-defined sub-agent roster, agent conference, custom orchestrator, worker pool, or critic topology.
3. The journey is an application state machine with explicit user transitions, not a prompt-defined workflow.
4. Conversation is durable supporting context; the versioned business record is canonical.
5. Important AI-proposed mutations require founder review before becoming accepted state.
6. The next release focuses on the state machine, record, overview, small work units, and co-founder interaction.
7. DeepSeek Harness is a later, isolated runtime proof of concept. It is not adopted as the default architecture and is not allowed to own application state.
8. After this reset is accepted, legacy custom orchestration is removed in one verified cleanup release rather than preserved as dormant production code. Historical database migrations and audit data are retained; active schemas are migrated deliberately.

## 2. Target architecture

```text
Web / mobile
  └─ Journey overview, record editor, step detail, evidence capture, co-founder
        └─ Application API
             ├─ Journey service: state-machine transitions and next-step selection
             ├─ Business-record service: versioned facts, assumptions, evidence, decisions
             ├─ Step service: founder work, drafts, and completion evidence
             ├─ Context service: bounded AI context and durable summaries
             ├─ Policy service: authorization, approvals, tool capabilities, budgets
             └─ AI adapter: one co-founder turn and structured proposal validation
                    └─ Later optional DeepSeek Harness process/service
                           └─ Application-owned capability gateway
```

The lower layer may be replaced without changing the journey or business-record contracts. No runtime can write the database directly, select unrestricted tools, or treat a model response as an accepted decision.

## 3. Journey-state machine

### 3.1 Aggregate state

A `VentureJourney` has:

- `currentStage`;
- a set of stage statuses;
- `currentObjective`;
- ordered recommended steps;
- explicit transition history;
- a current accepted business-record version;
- blocking conditions, deferrals, and revisit reasons.

The state machine must not derive stage solely from chat text, a job status, or a model classification. It persists state after every accepted transition.

### 3.2 Stages and transitions

| From | Founder-controlled transition | To | Required record effect |
| --- | --- | --- | --- |
| Idea | Frame the idea | Problem | Create a problem hypothesis and constraints |
| Problem | Choose an initial customer | Customer | Record beachhead hypothesis |
| Customer | Gather or add learning | Evidence | Create evidence or explicit unverified assumptions |
| Evidence | Frame the opportunity | Opportunity | Link alternatives, risks, and supporting evidence |
| Opportunity | Shape an offer | Offer | Create a value proposition and business-model draft |
| Offer | Define the next validation step | Validation next step | Record one founder-controlled experiment and success criteria |
| Validation next step | Revise, defer, or conclude the model | Any appropriate stage | Record the decision, rationale, and affected items |

The system can recommend a transition but must not enact it merely because a field is filled or the co-founder generated text. Readiness calculations show evidence gaps, risks, and consequences; they are not hard journey locks. The founder can defer or revisit a stage; this produces a recorded reason and marks dependent content stale where appropriate.

### 3.3 Step lifecycle

Each step is one bounded unit of founder progress, not an agent task. It may include AI preparation or review.

`proposed → ready → in_progress → awaiting_founder → submitted → reviewed → complete`

Alternative terminal states: `deferred`, `skipped_with_reason`, `blocked`, `canceled`, and `superseded`.

Every step specifies objective, expected effort, input, completion evidence, business-record fields affected, and next recommended step.

## 4. Business-record model

The minimal canonical model is intentionally smaller than a company-operations platform:

| Aggregate | Purpose |
| --- | --- |
| Venture | Ownership, scope, founder intent, geography, constraints |
| Journey | Stages, transitions, objectives, recommendations, blockers |
| BusinessRecordVersion | Immutable accepted snapshot of business state |
| RecordItem | Typed field or section with value, status, provenance, and links |
| Assumption | Testable uncertain claim and current evidence state |
| Evidence | Founder observation, document, citation, interview note, or experiment result |
| Decision | Founder-approved choice, rationale, alternatives, and consequences |
| Experiment | Test plan, criteria, observations, and result |
| JourneyStep | Founder-sized work unit and completion evidence |
| Proposal | AI or founder draft change awaiting review |
| ConversationMessage / Summary | Supporting history linked to record items and steps |

Generated artifacts are projections of an accepted business-record version. They are never independent sources of truth.

## 5. Co-founder contract

The co-founder receives only the context required to make the next interaction useful:

- venture identity and active journey objective;
- relevant accepted record items and their provenance;
- open assumptions, decisions, evidence, and active steps;
- a bounded conversation summary and relevant recent messages;
- approved tool capabilities and spending limits.

It returns a schema-validated response:

- user-facing explanation;
- interaction type (`ask`, `inform`, `recommend`, `generate`, `review`, or `change`);
- optional evidence references;
- optional proposed record mutations;
- optional suggested next steps;
- uncertainty and blocked conditions.

The application validates the response, stores proposals separately, and creates an accepted record version only after the founder takes an explicit action.

## 6. Delivery plan

### R0 — Freeze and document the reset

- Make this document and the product reset the authoritative design baseline.
- Mark superseded multi-agent plans and requirements as historical.
- Complete the exact legacy-code and database inventory in `15-current-state-and-retirement-inventory.md`.
- Establish migration fixtures from representative existing projects before deletion begins.

### R1 — Replace the core domain

- Introduce the journey, business-record, proposal, step, and decision contracts.
- Add schema migrations and repositories with tenant isolation, versioning, provenance, and explicit lifecycle validation.
- Provide a single conversion path from usable existing project/pack/evidence data.
- Do not delete historical migrations or audit records.

### R2 — Ship the founder journey shell

- Replace the current desk/sprint-first flow with idea capture, overview, journey path, record detail, and step detail.
- Make the overview the default project surface.
- Provide evidence capture, accepted decision display, change history, and explicit next steps.
- Remove pages and navigation that expose worker/sprint control as the primary product.

### R3 — Add the one co-founder

- Implement durable conversation messages and summaries bound to the venture.
- Implement context assembly and the structured proposal boundary.
- Make all material AI changes reviewable and approval-gated.
- Connect only safe, bounded research and drafting capabilities through the application tool gateway.

### R4 — Remove the legacy orchestration release

- Delete app-defined specialist agents, sprint contracts, orchestration loops, worker-pool execution, critic/evaluator workflows, and their user-facing controls.
- Remove obsolete prompts, packages, routers, queues, schemas, UI, tests, fixtures, configuration, environment variables, and documentation.
- Remove only after replacement data is migrated or intentionally discarded according to the retirement inventory.
- Run migration, authorization, contract, and end-to-end journey tests before merging.

### R5 — Prove the DeepSeek Harness boundary

- Implement a disposable adapter proof of concept behind the single co-founder contract.
- Use a dedicated process or service identity, no direct database access, no local shell, no unrestricted filesystem, and only application-owned capability-gateway tools.
- Verify context isolation, session mapping, cancellation, durable resumption, cost accounting, observability, proposal validation, and failure recovery.
- Adopt only if it simplifies the AI adapter without weakening application control. Otherwise retain a simpler direct model adapter.

## 7. Acceptance gates

R1–R4 are complete only when:

1. Every active project has an unambiguous journey and accepted business-record version.
2. A user can explain the current objective, the next step, and the status of material record items without opening chat.
3. No active production code refers to an app-defined specialist agent, orchestration sprint, worker pool, or evaluator loop.
4. No legacy AI output can silently mutate accepted business state.
5. Tests prove that workspace and project isolation, record versioning, explicit approval, and state transitions hold.
6. Existing migrated data remains traceable or is explicitly marked retired with a documented reason.

R5 is complete only when the harness passes the adapter proof-of-concept criteria in `16-deepseek-harness-evaluation.md`; it is not a prerequisite for the founder-journey release.
