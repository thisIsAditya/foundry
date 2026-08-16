# BusinessGenerator — product and system design

**Status:** design baseline  
**Date:** 17 August 2026  
**Scope:** product experience, agent runtime, data model, document intelligence, model providers, web/mobile surfaces, safety, evaluation, and delivery plan  
**Implementation policy:** this folder is design documentation only. It intentionally contains no application code.

## Product decision

BusinessGenerator is a **founder contractor**: a guided system that turns an idea into an evidence-backed business model and a company pack the founder owns.

It is not:

- a free-form agent chatroom;
- a business-plan text generator;
- a simulated executive team;
- an unsupervised sales, payment, legal-filing, or customer-interview service.

The product’s main interface is a **current-work view**:

1. What phase are we in?
2. What do we know?
3. What is still an assumption?
4. What is the next smallest useful action?
5. What does the founder need to decide or do?
6. What evidence and artifacts changed?

Chat is one input surface. The durable product is the versioned `CompanyPack`, its evidence ledger, decisions, experiments, and generated artifacts.

## Architecture decision in one paragraph

Use a **durable gated graph** as the company journey, a **budgeted Magentic-style orchestrator-worker sprint** for bounded agent collaboration, and a separate **evaluator/critic** that cannot grade work from the writer’s context. Use the Vercel AI SDK for model access, streaming, tool calling, and agent loops; use a durable workflow/job layer for pauses, retries, long-running work, and approvals. Do not make the AI SDK, a chat transcript, or a model provider the system of record.

## Design principles

1. **Evidence before confidence.** A model can be proposed before it can be treated as true.
2. **Human accountability.** The founder owns interviews, ethics, legal filings, contracts, spending, and final GO/PIVOT/KILL decisions.
3. **Single source of truth.** Money, assumptions, evidence, and decisions live in the pack; documents are views.
4. **Structured collaboration.** Agents communicate through contracts, artifacts, and typed proposals, not an endless transcript.
5. **Permission before side effects.** Reading and drafting are separate from sending, publishing, charging, filing, or deleting.
6. **Provider freedom.** Users may bring provider keys or use managed routing, but the application keeps one capability-based model interface.
7. **One product, two surfaces.** Web and mobile share domain behavior and permissions; their layouts optimize for their form factors.
8. **Export belongs to the founder.** The pack remains exportable even if the hosted service is later cancelled.
9. **Simple first.** Add an agent only when specialization, tool isolation, policy isolation, or parallelism materially improves the result.
10. **Failure is a product state.** The app should clearly say blocked, unverified, stale, over budget, or awaiting approval.

## Document map

| Document | Purpose |
|---|---|
| [00-product-brief.md](00-product-brief.md) | Product promise, users, experience, phases, and non-goals |
| [01-system-architecture.md](01-system-architecture.md) | Logical architecture, runtime boundaries, state, events, and deployment |
| [02-orchestration-and-agent-contracts.md](02-orchestration-and-agent-contracts.md) | Agent roster, conference loop, contracts, gates, and tool policy |
| [03-domain-model.md](03-domain-model.md) | Domain objects, value types, relationships, lifecycles, and service classes |
| [13-contracts-and-boundaries.md](13-contracts-and-boundaries.md) | Type boundaries, commands, events, read models, and shared TypeScript package responsibilities |
| [04-document-intelligence.md](04-document-intelligence.md) | PDF/HTML/JSON/document ingestion, direct reading, RAG, citations, and artifacts |
| [05-model-providers-and-code-mode.md](05-model-providers-and-code-mode.md) | AI SDK provider strategy, BYOK, local models, routing, and code-mode boundaries |
| [06-web-and-mobile-experience.md](06-web-and-mobile-experience.md) | Mobile-first UX, web workspace, navigation, states, and parity |
| [07-artifacts-and-tool-catalog.md](07-artifacts-and-tool-catalog.md) | Document/slide/sheet generation and the tool registry |
| [08-security-privacy-and-governance.md](08-security-privacy-and-governance.md) | Tenant isolation, secrets, prompt injection, approvals, privacy, and retention |
| [09-evaluation-and-observability.md](09-evaluation-and-observability.md) | Quality gates, golden packs, traces, metrics, and operational review |
| [10-delivery-roadmap.md](10-delivery-roadmap.md) | Phased delivery, vertical slices, acceptance criteria, and sequencing |
| [11-decisions-and-open-questions.md](11-decisions-and-open-questions.md) | Explicit decisions, trade-offs, risks, and questions to resolve |
| [12-research-grounding.md](12-research-grounding.md) | Existing repository research and external technical sources used here |
| [implementation/](implementation/README.md) | CTO/system-architect build specification: exact libraries and versions, monorepo layout, API/database/schema, agent runtime wiring, AWS ECS deployment, security, testing, and coding standards |

## Recommended reading order

Read `00` for product shape, `01` for the system boundary, `02` for agents, `03` for the data model, and `13` for application/type boundaries. Then read `04` through `09` for the major technical subsystems and `10` for execution sequencing. Once the design is understood, read [implementation/README.md](implementation/README.md) for exactly how to build it.

## Existing research this plan extends

- [Agent conference-loop decision](../research/03-agent-architecture/01-conference-loop.md)
- [Orchestration design](../research/03-agent-architecture/00-orchestration.md)
- [Recommended roster](../research/03-agent-architecture/00-recommended-roster.md)
- [Process synthesis](../research/02-idea-to-business-process/00-synthesis.md)
- [Competitive gap analysis](../research/01-competitive-landscape/00-gap-analysis.md)

## Baseline assumptions

- The first release is India-aware, but the core domain is country-neutral.
- A founder may work alone or invite collaborators.
- A workspace may contain several ventures; each venture has its own `CompanyPack`.
- User-provided files are private by default.
- External web content is untrusted data, never agent instructions.
- The first product goal is a reliable validation-to-business-model loop, not full post-launch ERP automation.
- The UI may show agent activity, but it does not need to expose private model reasoning or chain-of-thought.
