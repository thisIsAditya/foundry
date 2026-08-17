# AI Business Planner — vancoder1/ai-business-planner

**Repo:** https://github.com/vancoder1/ai-business-planner  
**License:** MIT  
**Stars:** 0  
**Shape:** Instruction pack + **MCP search server** for Cursor, VS Code Copilot, Claude Desktop, Windsurf, Continue, Zed.

## What it is

A “strategy engine” that turns an idea into a phased markdown project. The distinctive rule: **zero-shot ban** — the model may not invent business facts from training data; it must use the MCP web server (cached extraction). Without MCP, the README says the system will hallucinate URLs.

## Project SSOT files

| File                 | Phase                          |
| -------------------- | ------------------------------ |
| `00_CONTEXT.md`      | Problem, audience, constraints |
| `01_DISCOVERY.md`    | Market, competitors, personas  |
| `01a_CRITIQUE.md`    | Devil’s advocate checkpoint    |
| `02_STRATEGY.md`     | Model and positioning          |
| `03_ARCHITECTURE.md` | Tech, data, infra              |
| `04_DISTRIBUTION.md` | GTM                            |
| `05_EXECUTION.md`    | Launch and roadmap             |
| `scratchpad.md`      | Working notes                  |

Skills include JTBD, competitor “alternative pages,” willingness-to-pay, 70+ marketing psychology models, Product Hunt launch tactics.

Pain-signal ideation: hunt operational bottlenecks, not “AI + X growth trends.”

## Strengths

- Correct hallucination stance.
- Critique as a **named file in the path**, not an optional chat.
- Multi-IDE setup script — they accepted that founders live in Cursor.
- Architecture phase exists (most plan tools skip tech entirely).

## Weaknesses

- 0 stars, Feb 2026 refactor, no product UI.
- Web search ≠ customer interviews.
- “Agent-first, not conversational” can skip clarifying questions the router should ask.

## What to steal

- Evidence policy: no unsourced market claim in the pack.
- `01a_CRITIQUE.md` as a required gate file.
- MCP (or equivalent) search with cache.
- Pain-signal ideation prompt.

## What to avoid

- Banning all prior knowledge. Training data is fine for _frameworks_; it is not fine for _2026 market sizes_. Draw that line in the policy.
