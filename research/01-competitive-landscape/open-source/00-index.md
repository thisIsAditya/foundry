# Open-source repositories — index

Two classes: **domain systems** (idea → plan / company) and **agent engines** (you still have to write the business logic).

Star counts from GitHub API, 15 August 2026.

## Domain systems (read these)

| File | Repo | Stars | Why |
|---|---|---|---|
| [founder-os.md](founder-os.md) | vinicius91carvalho/founder-os | 12 | Best open encoding of the founder journey |
| [ai-business-builder-agents.md](ai-business-builder-agents.md) | blutrich/ai-business-builder-agents | 4 | Phase router + quality guardian + deliverables |
| [business-plan-harness.md](business-plan-harness.md) | greeun/business-plan-harness | 0 | Generator ≠ evaluator; financial gates |
| [ai-business-planner.md](ai-business-planner.md) | vancoder1/ai-business-planner | 0 | MCP search; ban on unsourced ideas |
| [startup-sim-and-crews.md](startup-sim-and-crews.md) | Startup_sim, Market_Research_Crew, others | 0 | CrewAI default architecture |
| [launchpad-v2.md](launchpad-v2.md) | SenseFoundItaly/LaunchPad-v2 | 1–2 | Provenance + approve-first (production-shaped) |

`WBHankins93/business-plan-writer` was publicly described as a 5-agent pipeline (Validator, Market Builder, Financial Checker, Writer, Critic) with typed contracts. GitHub returned **404** on 15 Aug 2026. Treat as a vanished reference design, not a dependency.

## Agent engines (use, do not confuse with a product)

| File | Repo | Stars |
|---|---|---|
| [multi-agent-frameworks.md](multi-agent-frameworks.md) | AutoGPT, MetaGPT, ChatDev, CrewAI, LangGraph, AutoGen, OpenHands, CAMEL, SuperAGI | 17k–186k |

## Pattern that repeats in almost every domain repo

1. Orchestrator diagnoses stage.
2. Specialist agents fill sections.
3. A critic or bull/bear pair attacks the draft.
4. A markdown/PDF dossier comes out.

**What almost none do:** force real interviews, keep a live assumption ledger, file Indian compliance, or operate the company after launch.

That is the open-source gap as well as the commercial gap.
