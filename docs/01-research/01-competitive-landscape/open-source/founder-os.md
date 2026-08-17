# FounderOS (open source) — vinicius91carvalho/founder-os

**Repo:** https://github.com/vinicius91carvalho/founder-os  
**License:** MIT  
**Stars:** 12 (15 Aug 2026)  
**Shape:** 75 markdown files, **zero runtime**. 12 skills + 1 orchestrator. ~22,000 lines of encoded methodology.

Not related to commercial [runfounderos.com](../commercial/ai-cofounders/founderos-workoai.md).

## What it is

A **pure-knowledge system**. Any capable assistant (Claude, Gemini, GPT-4+, Cursor, Copilot, Codex) that can read markdown becomes a founder copilot. Claude gets nicer auto-routing via skills; other tools follow `skills/00-orchestrator/SKILL.md` manually.

Promise: diagnose stage → run the matching skills → emit a **13-part business plan** and **10-slide pitch deck**, with live web research when the host can search.

## The 12 skills (founder journey)

| Stage      | Skills                                    | Frameworks named                               |
| ---------- | ----------------------------------------- | ---------------------------------------------- |
| Ideation   | 01 Idea Validation, 02 Business Model     | Mom Test, GO/PIVOT/KILL, 55 revenue patterns   |
| Pre-launch | 03 Fundraising, 04 GTM, 05 Product        | SAFE terms, first 100 users, PRD, RICE         |
| Launch     | 06 Sales, 07 Marketing & Brand            | MEDDIC, BANT, Challenger                       |
| Growth     | 08 Growth & Analytics, 09 Operations      | AARRR, OKRs, hiring, board decks               |
| Scale      | 10 Finance, 11 Customer Success, 12 Legal | Burn/runway, churn, entity, cap table, vesting |

Orchestrator asks 3–5 diagnostic questions and **does not dump all 12 skills** on a raw idea.

## Artifact quality rules they care about

The README example stresses **internal consistency**: unit economics in skill 02 match financials in part 10 match the “ask” slide. That is the right bar for our take-away pack.

Web research is optional. Without it, TAM/competitors/benchmarks degrade; other skills still run.

## Strengths

- Densest open library of **actual founder frameworks** in one place.
- Stage routing (the Blutrich plugin independently rediscovered this — it is load-bearing).
- Honest about platform differences (Claude vs Cursor vs ChatGPT).
- License allows us to learn from structure (do not copy copyrighted book text into prompts).

## Weaknesses

- Not a product: no UI, no evidence database, no India pack (legal skill is US-shaped: cap table, SAFE).
- Skills cannot _do_ interviews; they can only coach them.
- 12 stars: no community pressure, quality is one maintainer.

## What to steal

- Stage diagnosis before any generation.
- GO/PIVOT/KILL as a first-class output.
- Skill routing table (idea vs raise vs ops).
- Cross-document number identity.
- 13-part plan / 10-slide deck as **views**, generated last.

## What to avoid

- Shipping “75 markdown files” as the user experience.
- US legal defaults for Indian users.
