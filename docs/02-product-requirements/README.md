# BusinessGenerator product requirements

**Status:** current product specification
**Date:** 22 August 2026
**Audience:** Product, design, engineering, and reviewers
**Scope:** The founder journey, business-model record, web experience, mobile capture,
application services, and the later co-founder-runtime boundary.

BusinessGenerator helps a busy founder turn an idea into a presentable,
evidence-aware business model through a persistent, founder-controlled journey.
The durable product is the record of what the founder knows, assumes, decides,
tests, and needs to do next—not an agent transcript or an autonomous workflow.

## Product decisions

1. **The application owns the journey.** A state machine supplies a useful path,
   but founders can revisit, defer, or work on an appropriate later step without
   losing the consequences of that choice.
2. **The business record is canonical.** It is versioned, traceable, exportable,
   and readable without opening a chat transcript.
3. **Progress is founder-sized.** Each step has a purpose, expected effort,
   evidence or decision outcome, and one clear continuation.
4. **There is one co-founder.** It can ask, explain, recommend, draft, and
   propose changes. It never silently accepts a material business decision.
5. **No app-defined sub-agents.** There is no specialist roster, conference loop,
   critic topology, worker pool, or user-facing agent directory.
6. **Readiness is evidence-aware, not a promise.** The product shows what is
   supported, unverified, contradictory, stale, or blocked; it does not produce
   a success score or claim real-world validation.
7. **External effects remain draft-only.** The initial product does not send,
   publish, charge, schedule, file, scrape outside policy, or directly modify a
   connected system.
8. **DeepSeek Harness is later infrastructure, not product authority.** It may
   implement the co-founder behind a narrow adapter only after the journey and
   record work independently of it. Its default local shell, filesystem,
   persistence, and optional subagent capabilities are not acceptable defaults
   for this product.

## Read in this order

1. [Product reset](./00-product-reset.md) — the product boundary and non-goals.
2. [Shared founder-journey requirements](./01-shared-product-requirements.md)
3. [Web requirements](./02-web-requirements.md)
4. [Mobile requirements](./03-mobile-requirements.md)
5. [Application and co-founder requirements](./04-worker-backend-requirements.md)
6. [Delivery slices and acceptance criteria](./05-delivery-slices.md)

The implementation and retirement sequence is in
[the product-reset plans](../plan/README.md).

## Terms

- **Venture:** A founder-owned business exploration within a workspace.
- **Journey:** The persisted stage, objective, steps, transitions, deferrals,
  blockers, and recommended continuation for a venture.
- **Business record:** The accepted, versioned representation of the venture's
  idea, evidence, assumptions, decisions, offer, and validation plan.
- **Journey step:** One bounded unit of founder progress. It may include
  co-founder preparation or review but is not an agent task.
- **Proposal:** A draft change awaiting founder review. A proposal is never an
  accepted business fact by itself.
- **Evidence:** A traceable founder observation, interview note, document,
  source, or experiment result.
- **Readiness signal:** An explanation of the current support and uncertainty in
  a business-model area. It is not a prediction of business success.

## Superseded concepts

The requirements no longer authorize an instant autonomous full business plan,
baseline research sprints, worker-count controls, specialist-role labels,
continuous success scores, user-configured agent runtime controls, or parity
work that delays the web journey. Historical rationale remains in Git and the
research archive; it must not guide new implementation.
