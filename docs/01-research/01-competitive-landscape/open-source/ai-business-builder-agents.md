# AI Business Builder Agents — blutrich/ai-business-builder-agents

**Repo:** https://github.com/blutrich/ai-business-builder-agents  
**License:** MIT  
**Stars:** 4  
**Shape:** Claude Code **plugin**: agents, skills, Python scrapers. Origin story: lessons from building Bond (author claims a $5M AI business in 12 months). Author: Ofer Blutrich.

## Architecture

```
User → business-router (diagnose phase)
     → phase flow (validation | launch | build | monetize | growth)
     → specialist agent
     → process-guardian (score 1–10, revise or rewrite)
```

## Five phases and agents

| Phase        | Flow                             | Agents                                          | Encoded rule                                                                      |
| ------------ | -------------------------------- | ----------------------------------------------- | --------------------------------------------------------------------------------- |
| 1 Validation | Torres Opportunity Solution Tree | research-agent, interview-agent                 | Quotes from Reddit/forums; interview scripts that **forbid pitching the product** |
| 2 Launch     | Hormozi value equation           | offer-architect, brand-builder, prompt-engineer | Offer stack + landing copy + cheap domain                                         |
| 3 Build      | ONE feature test                 | prd-writer, prompt-engineer                     | One-week ship; explicit out-of-scope; skip prescribing tech stack                 |
| 4 Monetize   | Revenue gate                     | monetization-strategist                         | **5 paying customers who are not friends**; 30-day clock                          |
| 5 Growth     | Growth trifecta                  | growth-strategist                               | Outreach → organic → retargeting **in sequence**, not at once                     |

**Process guardian** instant fails: placeholders, wrong-phase advice, fabricated research, MVP with 4+ features, non-pasteable builder prompts. Score 9–10 ships; 7–8 auto-revise; <7 rewrite.

Scripts (stdlib only): Reddit pain scraper, competitor scanner from Reddit, LinkedIn engager _planning_ (not scraping profiles).

## Tool philosophy

Tool-agnostic suggestions (Lovable/Bolt/v0 for build, Apollo/Clay for outreach, HubSpot for CRM). Agents do not lock a vendor.

## Strengths

- Closest OSS **product sense** to what we want: deliverables, not advice.
- Phase detection + “most people linger in Build” push toward revenue.
- Interview agent encodes The Mom Test’s cardinal rule.
- Quality gate is implemented as a separate agent — same idea as the Business Plan Harness.

## Weaknesses

- Claude Code only.
- Reddit ≠ statistically valid research.
- Hormozi/Bond playbook is **B2B info-product/SaaS biased**. A deep-tech or regulated India business will be mis-coached.
- No financial model, no India legal, no long-term ops OS.
- 4 stars, last meaningful update March 2026.

## What to steal

- Router that asks “where are you?” instead of running the whole pipeline.
- Revenue gate (5 non-friend payments) as a hard artifact.
- ONE feature PRD + builder prompt.
- Instant-fail list for the critic.
- Paste-ready outputs.

## What to avoid

- Treating Reddit quotes as customer discovery.
- Forbidding SEO/content in all cases (wrong for some India D2C/content businesses; right for _first five customers_).
- Copying Bond’s sales motion as universal law.
