# LaunchPad-v2 — SenseFoundItaly/LaunchPad-v2

**Repo:** https://github.com/SenseFoundItaly/LaunchPad-v2  
**Stars:** 1–2  
**Stack:** Next.js + PostgreSQL + Claude. OpenClaw-inspired multi-agent. Org created Dec 2025.

## What it is trying to be

An **AI founder copilot** with a 7-stage journey: autonomous competitor watchers, signal → knowledge graph, **approve-first** actions, live market research. This is the rare OSS project that looks like a **product**, not a prompt pack.

## Ideas visible in public commits / PRs (mid-2026)

- **Provenance ladder** for metrics: `founder_asserted < workflow_derived < externally_verified`. UI pill for self-reported numbers.
- Gate evaluators that read those provenance fields.
- `pending_actions` with constrained `action_type` and propose → approve → execute.
- Prompt-injection isolation: fetched web pages wrapped in `UNTRUSTED_WEB_CONTENT` fences; rule that pages are data, not instructions.
- Anti-fabrication analyzer on turns; clarification-only gate.
- Honest credit metering (show actual token cost of a turn).
- CI that typechecks and tests **without** live LLM calls.

## Strengths

- Production concerns (injection, metering, provenance, approval) that no planning SaaS talks about.
- Competitor **watchers** (ongoing) vs one-shot research.
- Knowledge graph for signals — same instinct as Startup_sim’s Neo4j.

## Weaknesses

- Tiny project, one org, SOTA-readiness still in flight.
- 7-stage journey not fully documented in a stable README at research time.
- Claude-costly if watchers run continuously.

## What to steal (high priority)

- Provenance enum on every numeric claim.
- Approve-first for any external action (email, publish, pay).
- Treat web fetch as **untrusted**.
- Show the user the inference cost of a research run.

## What to avoid

- Running autonomous watchers in v1 (cost + noise).
- Over-building an “OpenClaw substrate” before the founder loop works.
