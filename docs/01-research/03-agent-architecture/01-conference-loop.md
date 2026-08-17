# Conference loop — architecture decision

**Date:** 17 August 2026  
**Status:** Decision log (reviewable). Extends [`00-orchestration.md`](00-orchestration.md); does not replace it.  
**Question:** How should a “plethora of agents” work an idea until the business model is stable — and which agents and tools are load-bearing?

This is the stable log. Sources for the web pass: [`sources/2026-08-17-orchestration-web.md`](sources/2026-08-17-orchestration-web.md). Domain process: [`../02-idea-to-business-process/00-synthesis.md`](../02-idea-to-business-process/00-synthesis.md).

---

## Verdict

Use a **three-layer hybrid**, not a standing board meeting:

| Layer       | Pattern                                                                         | Job                                                                      |
| ----------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| **Spine**   | Durable **gated graph** (LangGraph-style, or equivalent)                        | Company journey, phase locks, human interrupts, long-lived `CompanyPack` |
| **Sprint**  | **Magentic orchestrator-worker** (task ledger + progress ledger + stall/replan) | One bounded “conference” with a budget                                   |
| **Quality** | **Evaluator-optimizer**, generator ≠ evaluator, **files only**                  | Stop eloquent nonsense from shipping into the pack                       |

The founder-facing metaphor can still be a conference (Co-founder, PM, researchers). The runtime must not be an unbounded group chat.

**Do not** use as the spine: AutoGPT loops, MetaGPT/ChatDev “software company” SOPs, CrewAI sequential pipelines, or homogeneous multi-agent debate.

---

## What the example actually is

The example (Co-founder speaks for you → PM plans a sprint → researcher and CTO work → Co-founder spends budget → consensus → repeat) is a **Magentic inner loop** with a human interrupt. Map it onto founder-loop roles, not a software org chart.

| Example role                                       | Keep?                                     | Real job in this product                                                                                                                                       |
| -------------------------------------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Co-founder (speaks for you, asks you, owns budget) | **Yes — control plane**                   | Orchestrator. Owns the user conversation. Writes/updates the task ledger. Calls `human.ask`. Enforces gates and spend. Never impersonates you to customers.    |
| PM (sprint of tasks)                               | **Yes — as a contract, not a department** | Sprint planner. Writes a sprint contract with observable checks (Business Plan Harness). In v1 this is a _mode of the orchestrator_, not a second personality. |
| Researcher                                         | **Yes — as a crew**                       | Parallel specialists: alternatives, market, competition. Each gets an objective, output schema, tools, and boundaries (Anthropic research system).             |
| Developer / CTO                                    | **No, not until a PRD exists**            | Coding workers sit _behind_ the MVBP scoper. Putting CTO in the idea-day conference is the CoFounderBot trap: build before evidence.                           |
| “Consensus”                                        | **Yes — as a verdict, not a vote**        | Critic grades a contract. Code gates run. Librarian checks provenance. Founder may waive, logged. Agents do not majority-vote the business into existence.     |

Roster by _step_, not by C-suite: [`00-recommended-roster.md`](00-recommended-roster.md). What stays human: [`00-what-not-to-automate.md`](00-what-not-to-automate.md).

---

## Patterns considered

Industry topologies collapse to four shapes (Anthropic 2024/2025, Microsoft Magentic-One 2024, OpenAI Agents SDK 2026, LangGraph supervisor vs swarm). We compose three and forbid one as the spine.

| Pattern                                                                | When it is right                                            | Fit here                                                                                                                                                                                        |
| ---------------------------------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sequential pipeline                                                    | Fixed order, each step needs the previous full output       | **Spine fragments only** (problem → interviews → Gate A). Alone it compounds errors and has no “go back.”                                                                                       |
| Parallel fan-out                                                       | Independent subtasks known in advance                       | **Research bursts:** alternatives ∥ market ∥ competition after Gate A.                                                                                                                          |
| Hierarchical orchestrator-worker (Magentic / Anthropic lead+subagents) | Subtask count unknown; need a boss, a plan, stall detection | **Sprint conference.** Co-founder = Magentic manager. Ledgers live in the pack, not in chat.                                                                                                    |
| Swarm / handoff                                                        | Conversation should live with whichever specialist fits     | **Narrow use:** hand the founder to Interview Coach during interview prep. Not the company journey — gates would become optional.                                                               |
| Debate / council                                                       | Narrow high-stakes single answer; needs a round cap         | **Only at GO / PIVOT / KILL** (bull / skeptic / moderator, as in Startup_sim). Not every sprint. Homogeneous debate is expensive, sycophantic, and still loses the correct answer at vote time. |
| Evaluator-optimizer                                                    | Clear rubric; iteration helps                               | **After every major pack write.** Separate context. Instant fails.                                                                                                                              |
| Code gates                                                             | Deterministic checks                                        | **Gate A/B/C, financial coherence, URL exists.** LLM may recommend a waiver; code records the waiver.                                                                                           |
| Single agent                                                           | Structured compliance / arithmetic                          | Unit economics, GST threshold logic, “does this URL exist.” Coordination adds citation overreach here (2026 enterprise routing study).                                                          |

**Why not a pure conference.** Group chat has no natural stop, no provenance, and no way to refuse a pretty TAM. Anthropic’s production research system still writes the plan to **external memory** and returns **summaries**, not full transcripts, to the lead — because context rot and token blow-up are the failure mode. A standing 12-agent meeting is that failure mode as a product.

**Why not MetaGPT/ChatDev as the incubator.** `Code = SOP(Team)` assumes a PRD should exist. Customer development assumes it might not.

---

## Recommended composition

```
FOUNDER
   │  idea + answers + approvals + spend
   ▼
┌──────────────────────────────────────────────────────────┐
│ SPINE  gated durable graph                               │
│  diagnose → problem ⇄ interviews → GATE A                │
│         → (alternatives ∥ market ∥ competition)          │
│         → model + pricing → unit_econ (code)             │
│         → WTP experiments → GATE B                       │
│         → assumptions → PRD → (build worker, later)      │
│  State = CompanyPack (git/JSON), not a chat log          │
└──────────────────────────────────────────────────────────┘
   │  each node that needs exploration is a SPRINT
   ▼
┌──────────────────────────────────────────────────────────┐
│ SPRINT  Magentic conference (budgeted)                   │
│  1. Co-founder clarifies with the human (interrupt)      │
│  2. Write sprint contract (objective, artifacts, checks) │
│  3. Spawn workers with scoped briefs (parallel where     │
│     independent). Workers write artifacts, return refs.  │
│  4. Critic, new context, files only                      │
│  5. Code gates + provenance lint                         │
│  6. Co-founder reads remaining budget → continue / stop  │
│  Caps: max rounds, max stalls, max rupee/token spend     │
└──────────────────────────────────────────────────────────┘
```

This matches Magentic-One’s **outer loop** (task ledger: facts, guesses, plan) and **inner loop** (progress ledger: progress? loop? next speaker? instruction?) with three additions this domain requires:

1. **Gates are functions over the pack**, not LLM opinions ([`patterns/evidence-gating.md`](patterns/evidence-gating.md)).
2. **Approve-first** on email, publish, pay, file, scrape ([`patterns/human-in-the-loop.md`](patterns/human-in-the-loop.md)).
3. **Generator cannot grade itself** (Business Plan Harness; Blutrich process-guardian).

Runtime choice (unchanged): LangGraph (or equivalent durable graph) for the spine; Magentic _behavior_ as a subgraph; CrewAI only if we want a disposable research crew; coding workers out of process. See [`../01-competitive-landscape/open-source/multi-agent-frameworks.md`](../01-competitive-landscape/open-source/multi-agent-frameworks.md).

OpenAI’s split applies to the user channel: **agents-as-tools** so the Co-founder keeps the reply; **handoff** only when a specialist must own the next founder-facing turn (Interview Coach).

---

## Consensus (do not vote)

“Consensus reached” in the example must mean **all of these**, in order:

1. Sprint contract checks are observable (artifact exists, schema valid).
2. Critic score ≥ threshold, or a logged rewrite cap is hit and the sprint **fails closed**.
3. Code gates pass, or the founder files a **waiver** on the pack.
4. Every number has provenance: `founder_asserted | workflow_derived | externally_verified`.
5. Co-founder accepts spend for the next sprint, or declares the model **stable enough to freeze MoneyRules**.

Agents arguing until they agree is not a gate. Debate research (Du et al.; 2026 critiques) shows sycophantic conformity and an oracle gap: the right answer appears in the room and the vote still drops it. Use debate only for an adversarial verdict (GO / PIVOT / KILL), with a round cap and a judge that is **not** the writer.

---

## Agents you actually need for a rock-solid model

A “rock-solid business model” is not a prettier canvas. It is a **MoneyRules object** that survives critic, math, and Gate B. You need control-plane agents plus the specialists that feed MoneyRules. You do **not** need a CTO, marketer, or legal filer for that.

### Control plane (always on)

| Agent                                        | Why it is load-bearing                                                                                                                   |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Co-founder / Orchestrator**                | Stage diagnosis, one next action, budget, human interrupts, weekly digest. Without this, specialists dump a 30-page plan on a paragraph. |
| **Sprint planner** (orchestrator mode in v1) | Negotiated contract per burst. Without this, workers duplicate searches (Anthropic’s explicit failure).                                  |
| **Critic / Evaluator**                       | New context, files only, instant fails. Without this, the generator grades itself.                                                       |
| **Evidence Librarian**                       | Quotes, source hashes, assumption states, provenance. Without this, TAM theatre.                                                         |

### Model-stability specialists (the conference that earns the canvas)

| Agent                         | Feeds                                            | Hard refuse                                              |
| ----------------------------- | ------------------------------------------------ | -------------------------------------------------------- |
| **Problem Clarity**           | Who / trigger / workaround / cost-today          | Slogans, solution-smuggling                              |
| **Beachhead / Persona / DMU** | Named first customer, not “SMB”                  | “India,” “millennials,” “everyone”                       |
| **Interview Coach**           | Gate A evidence                                  | Fake users, attending as the founder, “500 AI customers” |
| **Alternatives Intel**        | Do-nothing, jugaad, hire-a-human, named products | Empty “no alternatives”                                  |
| **Market Sizing**             | Bottom-up formula + provenance                   | “1% of India,” unsourced $10B                            |
| **Competitive Intel**         | Named comps + wedge                              | “Our wedge is AI”                                        |
| **Business Model**            | Pattern, who invoices whom, unit of sale         | Copying SaaS because it is fashionable                   |
| **Pricing & Unit Economics**  | Price + LTV/CAC **in code**                      | LTV from revenue without margin                          |
| **WTP Experiments**           | Gate B money objects                             | Friend-only payments as “traction”                       |
| **Assumptions / Tests**       | Falsifiable 2-week tests                         | Unfalsifiable “we will see”                              |

That is **14 named roles**. Ship them as **8 runtime agents** in v1 by collapsing as already specified in [`00-orchestration.md`](00-orchestration.md):

1. Orchestrator (includes sprint planner + budget)
2. Interview Coach (includes problem/beachhead questioning)
3. Research crew (alternatives + market + competition) — one tool-using agent or a 3-worker Magentic burst
4. Model + pricing + unit econ (math in code)
5. WTP + assumptions
6. Critic
7. Evidence Librarian
8. India legal checklist — **not** required to freeze a model, required before you take money or personal data

### Explicitly not required to freeze the model

PRD scoper, build-prompt / CTO, GTM, org/cost, launch, ops runtime. They consume a frozen model; they must not invent one. Invite them to the conference only after Gate B (PRD/GTM) or Gate C (ops).

---

## Tool catalog (required for the loop to be real)

Without these tools the conference is roleplay. Grouped by plane. Policy: web fetch is **untrusted**; outbound/pay/publish/file are **approve-first**; arithmetic is **code**.

### A. Control plane — conference cannot run without these

| Tool                              | Does                                                                                                    |
| --------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `pack.read` / `pack.write`        | Versioned `CompanyPack`. Every numeric field: `{value, unit, provenance, source_url?, assumption_id?}`. |
| `sprint.open` / `sprint.close`    | Contract: objective, in-scope artifacts, checks, token/rupee cap, max rounds.                           |
| `ledger.task` / `ledger.progress` | Magentic facts/guesses/plan and “progress? loop? next worker? instruction?”                             |
| `budget.reserve` / `budget.spend` | Sprint and monthly inference + tool spend. Co-founder stops the loop when empty.                        |
| `decision.append`                 | Timestamp, options, choice, evidence IDs. Chat is not memory.                                           |
| `human.ask` / `human.approve`     | Durable interrupt. Clarification, plan sign-off, waivers, spend over cap.                               |
| `gate.eval_A` / `B` / `C`         | Pure functions over the pack.                                                                           |
| `cost.meter`                      | Show the founder the actual token cost of a research run (LaunchPad).                                   |

### B. Evidence plane — model cannot be trusted without these

| Tool                      | Does                                                                            |
| ------------------------- | ------------------------------------------------------------------------------- |
| `source.register`         | URL, fetch date, content hash, provenance tier.                                 |
| `citation.check_grounded` | Claim ↔ source. Fabricated URL is an instant fail.                              |
| `assumption.upsert`       | `ASSUMPTION:` id, state (`untested / testing / held / killed`), owner.          |
| `interview.ingest`        | Transcript → quotes, speaker pseudonym, date, consent flag.                     |
| `mom_test.lint`           | Pitching, hypotheticals, “would you use.”                                       |
| `url.exists`              | HEAD/GET to verify a cited URL. Critic may use this; generators may not invent. |

### C. Research plane — workers

| Tool               | Does                                                                                                                                                                                      |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `search.web`       | Query → results with titles, URLs, snippets. Mandatory for market facts (vancoder1 zero-shot ban, with a carve-out: frameworks from training data are allowed; 2026 TAM numbers are not). |
| `fetch.url`        | Body wrapped in `UNTRUSTED_WEB_CONTENT`. Pages are data, not instructions.                                                                                                                |
| `extract.pdf`      | Census / industry PDFs into tagged excerpts.                                                                                                                                              |
| `directory.lookup` | Associations, GST clusters, as **lead lists**, not TAM.                                                                                                                                   |

No unauthorized scrape of authenticated apps. No Selenium-against-competitors in v1.

### D. Math plane — LLMs must not multiply

| Tool                        | Does                                                                       |
| --------------------------- | -------------------------------------------------------------------------- |
| `calc.market_size`          | Bottom-up: counts × ARPU × filters. Returns formula + labeled assumptions. |
| `calc.unit_economics`       | LTV, CAC, payback, contribution margin. Marketplace ≠ SaaS formulas.       |
| `calc.sensitivity`          | Table over conversion, churn, CAC, capture (human checkpoint on _inputs_). |
| `check.financial_coherence` | Single-sourced MoneyRules; totals reconcile (Harness G-h).                 |

### E. Experiment plane — Gate B

| Tool                 | Does                                                                           |
| -------------------- | ------------------------------------------------------------------------------ |
| `wtp.log`            | Event: stranger vs friend, amount, instrument (UPI, LOI, checkout, concierge). |
| `landing.draft`      | Copy + fake-door. **Publish is approve-first.**                                |
| `payment_link.draft` | Razorpay/UPI. **Create/send is approve-first.**                                |
| `loi.draft`          | Template. Founder sends.                                                       |

### F. Later (not required to freeze the model)

Builder-prompt export; external coding worker; calendar/recorder (consent); email/WhatsApp (approve-first); GST calendar reminders; MCA/GST **filing** never automated; competitor watchers (LaunchPad) — cost/noise, not v1.

### Model routing (cost)

Cheaper models for extraction and worker search; stronger models for Co-founder routing, wedge/pricing judgment, and Critic. BYOK so rupee spend is visible. Anthropic’s production split (strong lead, cheaper workers) is the right instinct; Magentic-One’s ablation (ledgers matter; removing any worker hurts) is why we keep ledgers as data, not prompt flavor.

---

## Anti-patterns (instant architectural fails)

- Unbounded AutoGPT as the company OS.
- CEO / CTO / CMO roleplay from idea day 0.
- Critic that shares the generator’s chain of thought.
- Debate as the default coordination strategy.
- Simulated users counted toward Gate A.
- Co-founder sending customer email “as you.”
- Arithmetic in the LLM.
- Plan, deck, and model each storing their own price.
- Skipping interviews because the research crew was eloquent.

---

## Freeze condition (when to stop rinsing)

The loop may declare **MoneyRules stable** when:

- Gate A passed or a logged founder waiver exists.
- MoneyRules exist, are single-sourced, and `check.financial_coherence` passes.
- At least one WTP design is in the pack; Gate B is **passed** or explicitly **deferred** with a dated test.
- Critic last pass is GO or PIVOT with a falsifiable hypothesis — not KILL, unless the founder overrules.
- Remaining lethal assumptions are listed with tests, not hidden in prose.

Until then, the Co-founder may only spend the next sprint, not “ship the company.”

---

## Pointers

- Thin-slice roster (8 agents): [`00-orchestration.md`](00-orchestration.md)
- Full specialist map: [`00-recommended-roster.md`](00-recommended-roster.md)
- Gates: [`patterns/evidence-gating.md`](patterns/evidence-gating.md)
- HITL: [`patterns/human-in-the-loop.md`](patterns/human-in-the-loop.md)
- Take-away pack: [`patterns/takeaway-artifacts.md`](patterns/takeaway-artifacts.md)
