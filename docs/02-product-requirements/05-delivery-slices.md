# Delivery slices and acceptance criteria

**Status:** current
**Date:** 22 August 2026
**Implements:** [Product reset](./00-product-reset.md)

Each slice delivers an understandable founder outcome across the required
application layers. Do not build an AI runtime, a native-mobile parity project,
or an integration platform ahead of the journey and business record.

## Slice 0 — Freeze the old direction and protect data

### Goal

Make the founder-journey model the only active product direction and make the
legacy runtime safe to replace.

### Requirements

- Establish this requirements set and the reset plans as current authority.
- Identify every active custom-agent, sprint, worker-pool, critic, and
  specialist-role path.
- Capture representative migration fixtures from existing projects.
- Decide retention or conversion for job, usage, proposal, and agent-run data.
- Prevent new product work from depending on legacy agent contracts.

### Acceptance

- Engineering can identify the old and new call paths.
- Existing project data has a documented conversion path.
- No new UI or API requirement introduces a specialist persona, worker count,
  sprint fan-out, or agent conference.

## Slice 1 — Canonical journey and business record

### Goal

Replace implicit phase and pack-driven progression with an authoritative,
founder-controlled journey and versioned business record.

### Requirements

- Persist the journey, stage state, current objective, transitions, and
  founder-sized steps.
- Introduce record-item status, provenance, evidence, assumption, decision,
  experiment, and staleness relationships.
- Provide proposal and record-version commands with authorization and
  idempotency.
- Migrate or project usable pack revisions and retained venture data.
- Remove the split between stored and derived phase as an active source of
  truth.

### Acceptance

- Every active venture has one readable current journey state.
- A completed, deferred, or revisited step records its rationale and impact.
- A material record change creates an auditable accepted version.
- Existing retained venture data is traceable after migration.

## Slice 2 — Web journey shell and resume experience

### Goal

Give the founder an immediate, calm view of their path and the next small action.

### Requirements

- Replace the desk/sprint-first default with idea capture and Overview.
- Implement Journey, step-detail, Business model, Evidence, and Decisions
  surfaces.
- Render the twelve business-model sections with status and provenance.
- Provide return summaries, deferral, revisit, and blocked-state behavior.
- Meet the web accessibility and responsive requirements.

### Acceptance

- A founder enters an idea and sees a truthful record skeleton and first step.
- A founder can make progress without using a chat surface.
- A returning founder understands what changed and what to do next in one view.
- No default screen presents a work board, worker count, specialist role, or
  sprint control.

## Slice 3 — Evidence, proposals, and founder review

### Goal

Make learning and decisions durable without allowing AI or forms to silently
rewrite the business model.

### Requirements

- Capture evidence, interviews, observations, assumptions, decisions, and
  experiments.
- Link those items to relevant model sections and journey steps.
- Display readiness explanations instead of a business-success score.
- Support field-level and section-level proposal review.
- Mark dependent items stale and explain the consequence of an accepted change.

### Acceptance

- A founder can add an observation and see which claim it supports or
  challenges.
- A founder can accept, modify, or reject a proposal.
- A changed customer, problem, or offer visibly identifies affected content.
- The product does not call a hypothesis or complete document validated.

## Slice 4 — One co-founder on application contracts

### Goal

Add helpful AI without making it the system of record or rebuilding a custom
agentic harness.

### Requirements

- Persist conversation messages and bounded summaries.
- Assemble context from accepted record state, evidence, decisions, steps, and
  the active objective.
- Implement the structured `CofounderRuntime` input/output contract.
- Support Ask, Inform, Recommend, Generate, Review, and Change response
  states.
- Route draft and proposal creation through application commands.
- Use only typed, policy-gated, bounded application capabilities.

### Acceptance

- The co-founder accurately refers to accepted venture context after a return.
- It creates a reviewable proposal rather than silently changing a record.
- A failed turn preserves accepted state and provides recovery.
- There is only one founder-facing identity and no custom specialist selection.

## Slice 5 — Responsive and mobile capture

### Goal

Let founders capture learning and resume a step from a phone without delaying
the web-first product.

### Requirements

- Make the core web journey usable at narrow widths.
- Add short-session evidence, interview, and observation capture.
- Support safe draft synchronization and material-proposal review.
- Add notifications only for actions requiring founder attention.

### Acceptance

- A founder can capture a note after a real conversation and see it in the web
  record after synchronization.
- A mobile user can understand the next action and review a proposal.
- Offline or failed synchronization does not create duplicate or falsely
  accepted evidence.

## Slice 6 — Remove the legacy custom runtime

### Goal

Delete the custom multi-agent implementation once the replacement paths are
proven and retained data has been migrated.

### Requirements

- Replace `FoundryAgent`, skills, worker-pool, sprint-runner, stall detector,
  synthesis, critic, and associated worker paths.
- Remove named agent definitions, agent-run bindings, worker/sprint API
  contracts, roster UI, specialist prompts, tests, configuration, and
  dependencies.
- Retain only application-owned queues that support ingestion, rendering,
  notifications, bounded retrieval, or one co-founder operation.
- Add an additive schema cleanup migration after code no longer reads obsolete
  data.

### Acceptance

- No active production code imports a custom orchestration, worker-pool,
  specialist-skill, or critic component.
- No active UI, API, prompt, test, environment variable, or documentation
  exposes the retired concepts.
- Migration, tenant-isolation, state-transition, proposal-approval, and
  end-to-end journey tests pass.

## Slice 7 — DeepSeek Harness proof of concept

### Goal

Test whether DeepSeek Harness can implement the co-founder runtime without
weakening application control.

### Requirements

- Use an isolated process/service behind `CofounderRuntime`.
- Start from a minimal custom composition, never its default local coding-agent
  composition.
- Disable shell, filesystem, session persistence for business context,
  subagents, raw MCP, direct database access, and external writes.
- Provide only one read-only application capability for the first scenario.
- Test context isolation, cancellation, auditing, resume from application
  summaries, and failure recovery.

### Acceptance

- The harness cannot access another venture or tenant.
- It cannot use an unregistered tool or create a child session.
- It cannot change accepted state except through application proposal and
  approval commands.
- Adoption reduces complexity versus the direct runtime; otherwise it is
  rejected without affecting the product.

## Slice 8 — Bounded integrations and later extensions

### Goal

Make the co-founder useful beyond documentation only after the core journey and
runtime boundary are stable.

### Requirements

- Add read/draft capabilities through the application gateway.
- Introduce per-capability consent, preview, audit, timeout, and recovery.
- Design external writes as a separate approval-gated execution product.
- Treat build, launch, operation, legal filing, and company operations as
  later journeys, not forced content in the initial business-model path.

### Acceptance

- Every external capability has an explicit policy and user-visible effect.
- No integration can bypass founder approval or application-owned audit.
- The original idea-to-business-model journey remains usable without any
  external connection.

## Deliberate non-goals

- An autonomous company operator.
- Agent teams, specialist personas, critic loops, or parallel agent swarms.
- A required long intake or automatic complete business plan.
- A numerical success score presented as validation.
- Unbounded web research or raw MCP execution.
- Email sending, publishing, charging, scheduling, filing, or other external
  writes.
- Native-mobile parity before the web journey succeeds.
