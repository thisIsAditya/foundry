# Multi-agent frameworks (engines, not incubators)

Use these as **runtime choices** for BusinessGenerator. None of them know what a beachhead market is.

Star counts: GitHub API, 15 Aug 2026.

## Landscape

| Project | Stars | What it is | Fit for us |
|---|---|---|---|
| **AutoGPT** (Significant-Gravitas) | 186,609 | General autonomous agent platform | Too generic; weak domain structure |
| **OpenHands** | 84,110 | AI software engineer | Phase B/C **build** worker, not strategy |
| **MetaGPT** | 69,828 | SOP-driven “software company” (PM, architect, engineer). Commercial MGX | Good for *code* SOPs; naive as a startup |
| **AutoGen** (Microsoft) | 60,432 | Multi-agent programming framework | Solid if we want Microsoft stack |
| **CrewAI** | 57,103 | Role-playing crews, fast prototype | Good for research crews; watch cost/control |
| **LangGraph** | 39,729 | Stateful graphs, durable execution | **Best default** for gated production workflows |
| **ChatDev** | 34,000 | Communicative software company; 2.0 is a no-code agent platform | Same as MetaGPT: software, not customers |
| **SuperAGI** | 17,654 | Dev-first autonomous agents | Overlap with AutoGPT |
| **CAMEL** | 17,588 | Research framework on agent scaling | Research, not product |

## MetaGPT / ChatDev specifically

They take **one line of requirements** and emit user stories, competitive analysis, APIs, code. Philosophy: `Code = SOP(Team)`. That is the right idea for **engineering** and the wrong idea for **customer development**. An SOP that starts at “write the PRD” assumes the PRD should exist.

If we use them, they sit **behind** the MVP-scoper agent, never in front of interviews.

## Recommended engineering choice (research opinion)

- **Orchestration / gates / human-in-the-loop:** LangGraph (or equivalent durable graph). Sprint contracts and phase locks are graphs, not chats.
- **Research sub-crew:** CrewAI or a small LangGraph subgraph with search tools.
- **Coding worker:** OpenHands / Claude Code / Cursor — out of process.
- **Do not** start on AutoGPT-style unbounded autonomy.

See also [`../../03-agent-architecture/00-orchestration.md`](../../03-agent-architecture/00-orchestration.md).
