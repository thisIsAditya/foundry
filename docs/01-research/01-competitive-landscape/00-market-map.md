# Market map — idea-to-company software (August 2026)

Four layers. Products listed are the ones that actually show up when a founder searches “turn my idea into a business” or “AI co-founder.” Adjacent tools (ChatGPT, Notion, Canva) sit outside the map because they are general-purpose.

```
IDEA
  │
  ├─ Validation / canvas ──── Foundra, LEANSpark, Strategyzer, Mixo, ModelBox
  │
  ├─ Planning documents ───── LivePlan, IdeaBuddy, Upmetrics, PrometAI, VentureKit
  │
  ├─ Build the product ────── Lovable, Bolt, v0, Replit, Cursor, MetaGPT/ChatDev
  │
  ├─ Form the company ─────── SPICe+ (IN), Stripe Atlas (US), Clerky, LegalZoom
  │
  └─ Run operations ───────── Zoho, Odoo, ERPNext, Durable, HubSpot, QuickBooks
                              + claimed AI OS: WorkoAI, FounderOS, CoFounderBot
```

BusinessGenerator’s intended path is **vertical through all five**, with a hard stop if validation fails.

## Feature coverage (honest, not a vendor ranking)

Legend: **Y** = core job, **P** = partial / marketing claim, **N** = not the product.

| Product                    | Problem interviews     | Canvas / model       | Sourced market data  | Linked financials | Pitch / plan export | Build MVP         | India legal                | Run ops            |
| -------------------------- | ---------------------- | -------------------- | -------------------- | ----------------- | ------------------- | ----------------- | -------------------------- | ------------------ |
| LivePlan                   | N                      | P (Idea Canvas)      | P (Premium research) | **Y**             | **Y**               | N                 | N                          | P (plan vs actual) |
| IdeaBuddy                  | N (quiz)               | **Y**                | P                    | P                 | **Y**               | N                 | N                          | N                  |
| Upmetrics                  | N                      | P                    | P                    | **Y**             | **Y**               | N                 | N                          | P                  |
| PrometAI                   | N                      | P (strategy toolkit) | P                    | P (valuation)     | **Y**               | N                 | N                          | N                  |
| Foundra                    | P (guided)             | **Y** (cards)        | P (web research)     | N                 | P                   | P (scope)         | N                          | N                  |
| LEANSpark                  | P (experiments)        | **Y**                | P                    | P                 | P                   | N                 | N                          | N                  |
| Mixo                       | N                      | N                    | N                    | N                 | N                   | P (landing)       | N                          | N                  |
| Durable                    | N                      | N                    | N                    | N                 | N                   | P (site)          | N                          | **Y** (local biz)  |
| CoFounderBot               | P                      | P                    | P                    | N                 | N                   | **Y** (claim)     | N                          | P (claim)          |
| Agentfounder               | P (claim)              | P                    | P                    | N                 | N                   | **Y** (claim)     | N                          | P (claim)          |
| WorkoAI / FounderOS        | N                      | N                    | N                    | N                 | N                   | N                 | N                          | **Y** (claim)      |
| Zoho One / Odoo            | N                      | N                    | N                    | P                 | N                   | N                 | P (IN GST in Zoho)         | **Y**              |
| FounderOS (OSS)            | **Y** (Mom Test skill) | **Y**                | P (if web)           | P                 | **Y**               | P (PRD)           | P (US-centric legal skill) | P (playbooks)      |
| AI Business Builder Agents | **Y**                  | P                    | P (Reddit scrape)    | N                 | P                   | P (PRD + prompts) | N                          | N                  |
| ChatGPT / Claude           | P                      | P                    | N (hallucinates)     | N                 | P                   | P                 | N                          | N                  |

## Pricing bands (USD, August 2026)

| Band                   | Typical price | Occupants                                                                                                       |
| ---------------------- | ------------- | --------------------------------------------------------------------------------------------------------------- |
| Free / freemium        | $0            | Mixo free tier, IdeaBuddy limited free, VentureKit free, CoFounderBot start, WorkoAI Starter, YC Startup School |
| Idea / validation SaaS | $9–39/mo      | Mixo paid, Foundra $39, IdeaBuddy paid, ModelBox ~$19                                                           |
| Serious planning       | $15–40/mo     | LivePlan $15–40, Upmetrics ~$14–49                                                                              |
| Valuation / strategy   | $55–445/mo    | PrometAI                                                                                                        |
| AI workforce / OS      | $99–1075/mo   | WorkoAI $99–299, FounderOS $124–1075                                                                            |
| One-shot documents     | $69–99 once   | 15MinutePlan.AI (reported)                                                                                      |
| Formation (US)         | $169+/yr      | VentureKit Formation; Stripe Atlas is a separate higher fee                                                     |

India CA-led Pvt Ltd incorporation is typically **₹7,000–₹25,000** in professional fees plus MCA stamp/filing — not a SaaS SKU in this table.

## Buyer jobs, not personas

| Buyer job                          | What they type into Google | What they actually need                 | Who they buy today              |
| ---------------------------------- | -------------------------- | --------------------------------------- | ------------------------------- |
| “I need a plan for a bank/loan”    | business plan software     | Three-statement forecast, lender format | LivePlan, Upmetrics             |
| “I don’t know if the idea is real” | validate startup idea      | Interviews, WTP, alternatives           | Foundra, LEANSpark, a mentor    |
| “Write me a plan tonight”          | AI business plan generator | A PDF                                   | PrometAI, 15MinutePlan, ChatGPT |
| “Build the app”                    | AI app builder             | Working UI                              | Lovable, Bolt, Cursor           |
| “Register my company in India”     | company registration SPICe | DSC, MCA, GST                           | CA + MCA portal                 |
| “Run my small business”            | GST billing CRM India      | Invoicing, GST, payroll                 | Zoho, Tally, Vyapar, Odoo       |
| “Be my co-founder”                 | AI co-founder              | Judgment + execution                    | Unsolved — this is our category |

## Substitutes that are not “apps”

These kill more startups than competing SaaS does:

- Spreadsheets + Google Docs
- A friend’s MBA template
- Accelerator / Startup School (YC is free)
- A CA who files SPICe+ and nothing else
- Hiring an agency for a “brand + website”

Any product in this space is competing with **doing nothing** and with **doing it in Docs**, not only with LivePlan.

## Category dynamics

- **Planning software is adding AI**, not changing the underlying “fill the template” job. LivePlan’s Assistant is the best-integrated example.
- **Validation tools are adding AI conversation** on top of Lean Canvas. LEANSpark has the methodological high ground; Foundra has the cleaner “AI co-founder” story.
- **Agentic co-founders are a 2025–2026 gold rush.** Landing pages converge: specialist swarm, human approval, “runs while you sleep.” Almost none publish cohort outcomes.
- **Ops suites are adding agents** (Salesforce Agentforce, Zoho, HubSpot). They will not move down-market into idea incubation.
- **Open source is encoding founder knowledge as markdown skills** (FounderOS, Claude Code plugins). That is cheap to copy. The moat is the product around gates, evidence, export, and India ops — not the prompts.
