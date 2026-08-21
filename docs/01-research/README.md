# BusinessGenerator market research

> **Status: historical research.** The current product boundary is documented in
> [the documentation authority map](../README.md). Retain the evidence and
> framework insights here, but do not use this folder's agent or operations
> architecture as an implementation specification.
>
> **Current interpretation:** retain the research on customer evidence,
> alternatives, willingness to pay, founder ownership, and an exportable
> artifact. The current product stops at a presentable business model and the
> next validation experiment; it does not build an operating system or an agent
> team.

**Date:** 15–17 August 2026  
**Question:** Is there already a product that takes a business idea, turns it into a complete take-away business framework, and then helps the founder run operations — and if not, what process and agents should we build?

## Short answer

**No commercial product currently does all three jobs well.** The market is split into four overlapping layers:

1. **Planning software** writes business plans, forecasts, and pitch decks (LivePlan, IdeaBuddy, Upmetrics, PrometAI).
2. **Validation / canvas tools** help frame and stress-test an idea (Foundra, LEANSpark, Strategyzer, Mixo).
3. **AI co-founder / builder products** claim to research, code, market, and operate (CoFounderBot, Agentfounder, FounderOS, WorkoAI). Most are early, marketing-heavy, and unproven as real companies.
4. **Operations suites** run an existing business (Zoho One, Odoo, ERPNext, Durable, QuickBooks/Xero) but do not incubate an idea.

Open-source work is richer on _process encoding_ than on _shipped products_. The most useful repositories for us are knowledge systems and multi-agent pipelines (FounderOS skills, AI Business Builder Agents, Business Plan Harness), not production SaaS clones.

The real product gap — and the reason this app is worth building — is a **gated, evidence-based journey** from idea → validated framework (exportable) → operating system, with agents that _cannot_ skip customer evidence.

## How to read this folder

| Folder                                                                                       | What it answers                                                               |
| -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| [`01-competitive-landscape/`](01-competitive-landscape/00-executive-summary.md)              | Question 1: commercial apps and repositories                                  |
| [`02-idea-to-business-process/`](02-idea-to-business-process/00-synthesis.md)                | Question 2: the real steps from idea to company                               |
| [`03-agent-architecture/`](03-agent-architecture/00-recommended-roster.md)                   | Historical analysis of roles and human ownership; do not implement the roster |
| [`03-agent-architecture/01-conference-loop.md`](03-agent-architecture/01-conference-loop.md) | Historical orchestration decision; use only to identify what is being retired |

Start with the competitive and process synthesis. Read the agent-architecture
material only as historical context or retirement evidence, never as a runtime
specification.

## What this research is — and is not

- It is independent of the starter notes in `research.md`. Those notes were treated as a hypothesis, then checked against Lean Startup, Customer Development, MIT Disciplined Entrepreneurship, Lean Canvas, YC/Sequoia practice, and India company law.
- Pricing, star counts, and legal thresholds are as of **August 2026**. Confirm before making go-to-market claims.
- Vendor marketing is labeled as marketing. Independent tests (where they exist) are labeled as such.
- This is not legal, tax, or investment advice. India filings change; a chartered accountant / company secretary should review any live product copy.

## Historical recommended product stance

Build a **take-away Business Operating System**, not another AI business-plan writer.

- **Wedge:** force evidence (interviews, alternatives, willingness-to-pay) before generating a plan.
- **Artifact:** a versioned, exportable company pack (canvas, PRD, financial model, legal checklist, ops playbooks) the founder owns.
- **Runtime:** after launch, the same agents operate the company (inbox, CRM, cash, compliance calendar) against that pack.
- **Geography:** India-first legal/compliance agents (SPICe+, GST, Udyam, DPIIT, DPDP), with a pluggable country pack later.

See [`01-competitive-landscape/00-gap-analysis.md`](01-competitive-landscape/00-gap-analysis.md) for the competitive implication of that historical stance.

## Current product stance

Build a **founder journey and business-model record**, not a company operating
system:

- **Wedge:** help a founder turn an idea into a presentable record while keeping
  evidence, assumptions, decisions, and uncertainty honest.
- **Path:** guide the founder through small, revisit-able steps toward one
  validation experiment instead of a mandatory 26-step or build-and-operate
  program.
- **Artifact:** a versioned, exportable business model that the founder can
  understand without chat history.
- **Co-founder:** one assistive AI that prepares, explains, and proposes; it
  does not operate a team of agents, make accepted decisions, or take external
  actions.

The authoritative expression of this stance is the
[product reset](../02-product-requirements/00-product-reset.md).
