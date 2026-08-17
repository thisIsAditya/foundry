# Question 3 — Which agents to build

Agents should **mirror the 26 steps**, plus a few control-plane roles that every serious repo independently rediscovered: an **orchestrator**, a **critic that is not the writer**, an **evidence librarian**, and **runtime ops** after launch.

Do not start with “CEO, CTO, CMO” roleplay (MetaGPT/ChatDev). That simulates a software company. We are simulating a **disciplined founder loop**.

## Design principles (from the research)

1. **Stage diagnosis first** (FounderOS, Blutrich router). Never dump 26 steps.
2. **Gates are code, not vibes.** Gate A needs N interviews with quotes. Gate B needs non-friend money objects. Arithmetic is in code (Harness G-h).
3. **Generator ≠ Evaluator** (Business Plan Harness; Blutrich process-guardian). Separate context.
4. **Provenance on every number** (LaunchPad-v2): founder_asserted / workflow_derived / externally_verified.
5. **Approve-first** on email, publish, pay, file, scrape (CoFounderBot, Agentfounder, LaunchPad).
6. **Humans do interviews and legal filings** (see [00-what-not-to-automate.md](00-what-not-to-automate.md)).
7. **Single-sourced money rules.** Pricing lives in one object; deck and model only reference it.
8. **Take-away pack is the product.** Chat is a UI.
9. **Runtime agents consume the pack.** They are not a second product.
10. **Show token cost** (LaunchPad). Research runs are expensive; founders in India will care.

## Control plane (always on)

| Agent                                                 | Job                                              |
| ----------------------------------------------------- | ------------------------------------------------ |
| [Orchestrator](agents/00-orchestrator.md)             | Diagnose phase, route, lock gates, weekly digest |
| [Critic / Evaluator](agents/01-critic.md)             | Adversarial grade; GO/PIVOT/KILL; instant fails  |
| [Evidence Librarian](agents/02-evidence-librarian.md) | Quotes, sources, assumption states, provenance   |

## Incubation specialists (map to steps)

| Agent                                                           | Steps  | Notes                         |
| --------------------------------------------------------------- | ------ | ----------------------------- |
| [Problem Clarity](agents/03-problem-clarity.md)                 | 01     | Slogan filter                 |
| [Beachhead / Persona](agents/04-beachhead-persona.md)           | 02, 05 | Includes DMU                  |
| [Alternatives Intel](agents/05-alternatives-intel.md)           | 03, 07 | Substitutes first             |
| [Interview Coach](agents/06-interview-coach.md)                 | 04     | Mom Test; no fake users       |
| [Market Sizing](agents/07-market-sizing.md)                     | 06     | Calculator + search           |
| [Competitive Intel](agents/08-competitive-intel.md)             | 07     | Wedge; named comps            |
| [Business Model](agents/09-business-model.md)                   | 08     | Pattern library               |
| [Pricing & Unit Economics](agents/10-pricing-unit-economics.md) | 09–10  | Code does math                |
| [WTP Experiments](agents/11-wtp.md)                             | 11     | Landing, concierge, invoice   |
| [Assumptions / Tests](agents/12-assumptions.md)                 | 12     | Falsifiable experiments       |
| [PRD / MVBP Scoper](agents/13-prd-scoper.md)                    | 13–15  | One feature; metrics; cadence |
| [Build Prompt](agents/14-build-prompt.md)                       | 16     | Paste into Lovable/Cursor     |
| [GTM First-100](agents/15-gtm.md)                               | 17     | Manual channels               |
| [Org & Cost](agents/16-org-cost.md)                             | 18–20  | MVP vs scale; opex            |
| [Legal Guide](agents/17-legal-guide.md)                         | 21     | India entity; CA handoff      |
| [IP & Privacy](agents/18-ip-privacy.md)                         | 22     | Drafts labeled drafts         |
| [Compliance](agents/19-compliance.md)                           | 23     | GST/DPDP calendar             |
| [Launch](agents/20-launch.md)                                   | 24     | Checklist vs kill metric      |

## Runtime (after Gate C, or thin versions at launch)

| Agent                                   | Job                                                                 |
| --------------------------------------- | ------------------------------------------------------------------- |
| [Ops runtime](agents/21-ops-runtime.md) | Support, finance, CRM, compliance pings, growth — bound to the pack |

You do **not** need 40 agents in v1. See [00-orchestration.md](00-orchestration.md) for the **thin slice** (8 agents) that still covers the loop.
