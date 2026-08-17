# Orchestration design

> **17 Aug 2026.** The “agent conference” is a **Magentic sprint** nested in this graph — not a free-form CEO/CTO board meeting. Decision log: [`01-conference-loop.md`](01-conference-loop.md).

## Recommended runtime

**LangGraph-style durable graph** (or equivalent) for the company journey. Crews for bounded research bursts. External **coding** workers. This matches: gates, human interrupts, long-running state.

Do not use unbounded AutoGPT loops as the spine.

## State object (`CompanyPack`)

A versioned JSON/git store, not a chat log. Minimum entities:

- Problem, beachhead, persona, DMU
- Alternatives[], Competitors[]
- Interviews[] with quotes and Mom Test scores
- Assumptions[] with state and provenance
- MoneyRules (model, price, units) — **single source**
- MarketSize with formula
- WTP events
- PRD, out_of_scope, metrics, kill_lines
- Legal checklists and filing status
- Verdicts (Gate A/B/C)
- Artifact views: Lean Canvas, BMC, plan, deck (generated)

Every numeric field: `{ value, unit, provenance, source_url?, assumption_id? }`.

## Graph (happy path)

```
diagnose → problem ⇄ interviews (loop)
    → gate_A
    → persona + alternatives + market + competition (parallel)
    → model + pricing → unit_econ (code node)
    → wtp_experiments → gate_B
    → assumptions → prd → build (human)
    → legal subgraph (parallel)
    → launch → metrics
    → gate_C → ops runtime  |  pivot (back to diagnose)  |  kill
```

Critic runs **after** each major write, in a **new context**, reading files only.

## Human interrupts (required)

- Send outbound communications
- Charge money / issue refunds
- Publish landing pages to a custom domain
- Any government filing
- Changing MoneyRules after artifacts exist (warn on drift)
- Accepting Gate pass when evidence is thin (override logged)

## Thin slice for v1 (8 agents)

If we cannot ship 21 agents:

1. Orchestrator
2. Interview Coach (includes problem/beachhead questioning)
3. Research crew (alternatives + market + competition) as **one** tool-using agent
4. Model + pricing + unit econ (split math to code)
5. WTP + PRD scoper
6. Critic
7. Evidence Librarian
8. India Legal/Compliance checklist agent

Runtime ops is Phase C of the **company**, not of the incubator MVP.

## Models

Follow Blutrich’s instinct: cheaper models for extraction; stronger models for wedge, pricing judgment, critic. Let the user BYOK (CoFounderBot) so Indian founders can control rupee spend.

## Evaluation

- Golden packs: a known good company (with fake but consistent numbers) must keep MoneyRules identical across views.
- Instant fails: fabricated URLs, 4-feature MVP, friend-only WTP, “SMB” beachhead, unsourced $10B TAM.
- Mom Test linter on interview transcripts.
