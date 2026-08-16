# BusinessGenerator market research

**Date:** 15–17 August 2026  
**Question:** Is there already a product that takes a business idea, turns it into a complete take-away business framework, and then helps the founder run operations — and if not, what process and agents should we build?

## Short answer

**No commercial product currently does all three jobs well.** The market is split into four overlapping layers:

1. **Planning software** writes business plans, forecasts, and pitch decks (LivePlan, IdeaBuddy, Upmetrics, PrometAI).
2. **Validation / canvas tools** help frame and stress-test an idea (Foundra, LEANSpark, Strategyzer, Mixo).
3. **AI co-founder / builder products** claim to research, code, market, and operate (CoFounderBot, Agentfounder, FounderOS, WorkoAI). Most are early, marketing-heavy, and unproven as real companies.
4. **Operations suites** run an existing business (Zoho One, Odoo, ERPNext, Durable, QuickBooks/Xero) but do not incubate an idea.

Open-source work is richer on *process encoding* than on *shipped products*. The most useful repositories for us are knowledge systems and multi-agent pipelines (FounderOS skills, AI Business Builder Agents, Business Plan Harness), not production SaaS clones.

The real product gap — and the reason this app is worth building — is a **gated, evidence-based journey** from idea → validated framework (exportable) → operating system, with agents that *cannot* skip customer evidence.

## How to read this folder

| Folder | What it answers |
|---|---|
| [`01-competitive-landscape/`](01-competitive-landscape/00-executive-summary.md) | Question 1: commercial apps and repositories |
| [`02-idea-to-business-process/`](02-idea-to-business-process/00-synthesis.md) | Question 2: the real steps from idea to company |
| [`03-agent-architecture/`](03-agent-architecture/00-recommended-roster.md) | Question 3: which agents to build, and which work must stay human |
| [`03-agent-architecture/01-conference-loop.md`](03-agent-architecture/01-conference-loop.md) | Conference loop: orchestration pattern, must-have agents, tool catalog (17 Aug 2026) |

Start with the three `00-` files above, then the conference-loop decision log if you are designing the runtime.

## What this research is — and is not

- It is independent of the starter notes in `research.md`. Those notes were treated as a hypothesis, then checked against Lean Startup, Customer Development, MIT Disciplined Entrepreneurship, Lean Canvas, YC/Sequoia practice, and India company law.
- Pricing, star counts, and legal thresholds are as of **August 2026**. Confirm before making go-to-market claims.
- Vendor marketing is labeled as marketing. Independent tests (where they exist) are labeled as such.
- This is not legal, tax, or investment advice. India filings change; a chartered accountant / company secretary should review any live product copy.

## Recommended product stance (from the research)

Build a **take-away Business Operating System**, not another AI business-plan writer.

- **Wedge:** force evidence (interviews, alternatives, willingness-to-pay) before generating a plan.
- **Artifact:** a versioned, exportable company pack (canvas, PRD, financial model, legal checklist, ops playbooks) the founder owns.
- **Runtime:** after launch, the same agents operate the company (inbox, CRM, cash, compliance calendar) against that pack.
- **Geography:** India-first legal/compliance agents (SPICe+, GST, Udyam, DPIIT, DPDP), with a pluggable country pack later.

See [`01-competitive-landscape/00-gap-analysis.md`](01-competitive-landscape/00-gap-analysis.md) for the competitive implication of that stance.
