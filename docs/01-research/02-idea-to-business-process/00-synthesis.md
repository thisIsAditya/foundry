# Question 2 — How a description becomes a company

This is an independent synthesis. The starter `research.md` notes were treated as one hypothesis, then checked against Customer Development (Blank), Lean Startup (Ries), Disciplined Entrepreneurship (Aulet, 24 steps), Lean Canvas (Maurya), The Mom Test (Fitzpatrick), YC practice, and India company law. Where they agree, we keep the step. Where they disagree, we say so and choose a rule.

## The one-sentence process

**Search for a painful, specific customer and a way they will pay, with the smallest possible product, while keeping legal and ops just far enough ahead that you can take money — then lock the model and scale.**

A startup is not a small version of a large company. Blank’s definition still holds: it is a temporary organization **searching** for a repeatable, scalable business model. After the search succeeds, the organization **executes**. Mixing those modes is how people hire a sales team before anyone has bought.

## What every serious framework agrees on

These are not optional “nice to haves.” They show up in Blank, Ries, Aulet, Maurya, and YC:

1. **Start with a customer and a problem, not a product.** Aulet’s Theme 1 is “Who is your customer?” Maurya: love the problem. YC: make something people want.
2. **Get out of the building.** Blank: there are no facts inside. Fitzpatrick: talk about their life, not your idea.
3. **Narrow the first market.** Aulet’s beachhead; Ries’s early adopters; YC’s “do things that don’t scale.”
4. **Treat the plan as hypotheses.** Lean Canvas is an assumption board. Aulet Step 20–21: list leaps of faith, then test them.
5. **Willingness to pay is a different question from “they like it.”** Aulet’s MVBP requires payment. Maurya: Demo–Sell–Build. Blutrich’s revenue gate: 5 non-friend payments.
6. **MVP is an experiment, not a tiny version of the vision.** Ries. Aulet goes further: **MVBP** = customer gets value, pays, and you can learn.
7. **Do not scale marketing spend before a repeatable sales motion exists.** Blank’s Customer Creation comes _after_ Customer Validation.
8. **Unit economics must be plausible before “growth.”** Aulet: LTV should head toward ≥ 3× COCA. Napkin math now; precision later.

## Where the frameworks disagree (and what we choose)

| Dispute                           | Positions                                                                                                                                  | Our rule for BusinessGenerator                                                                                                                              |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| How much research before building | Aulet: weeks of segmentation and TAM before a sketch. Ries: ship experiments fast. Maurya: Demo–Sell–Build.                                | **Talk before you build. You may sell a demo or landing page before code.** Do not require a 40-page TAM memo first. Do require interviews and a WTP test.  |
| TAM size                          | Aulet: beachhead TAM often ~$20–100M/year; $1B+ usually means you defined it too broadly. VC: show a path to a huge market via follow-ons. | Compute **beachhead TAM bottom-up** _and_ a follow-on story. If beachhead TAM is tiny, say so. Do not fake a $10B TAM.                                      |
| MVP vs MVBP                       | Most builders ship a free prototype. Aulet requires payment.                                                                               | Default **MVBP**. Free pilots only if the next gated action is converting them to paid on a date.                                                           |
| Business plan                     | LivePlan world: write the plan to get a loan. YC: plans are obsolete, traction talks.                                                      | Generate a **company pack** for the founder. Generate a **bank/investor view** only when that is the actual next action. Never start with the 30-page plan. |
| When to incorporate               | Lawyers: day 0. Lean: delay cost. India B2B: GSTIN often needed to invoice.                                                                | **Legal is parallel, not first.** Trigger earlier if you must invoice GST, hire, or take investment. See [india/](india/00-overview.md).                    |
| How many interviews               | Common blog: 15–20. Aulet: also “next 10 customers.” I-Corps: often 100.                                                                   | **Minimum 12–15** problem interviews before solution design; more if B2B DMU is complex. Quality (Mom Test) beats quota.                                    |

## The chronology we recommend

Not a waterfall. Loops are expected. The **gates** are what matter.

```
Frame the problem and a narrow customer
        ↓
Talk to real people (problem interviews)  ←── you will repeat this
        ↓ GATE A: pain is real, frequent, expensive; alternatives exist
Map persona, DMU, alternatives, quantified value
        ↓
Size the beachhead; map competition; pick a wedge
        ↓
Choose how you charge; napkin LTV/CAC
        ↓ GATE B: someone will pay (preorder, LOI, paid pilot, or real checkout)
Scope MVBP; define the one metric that would falsify you
        ↓
Build the smallest thing; run experiments on remaining assumptions
        ↓  (legal/GST/DPDP/IP in parallel once Gate B is in sight)
Launch to the beachhead; do things that don’t scale
        ↓ GATE C: dogs eat the dog food (usage + payment + learning)
Install the operating system (support, cash, compliance, CRM)
        ↓
Expand, raise, or kill — on evidence, not hope
```

Compressed (this matches the spirit of the starter notes, with two corrections):

> Problem interviews → willingness-to-pay → MVBP scope → build → legal/ops in parallel → launch → feedback loop.

**Corrections to the starter notes:**

- “Market sizing before interviews” is backwards. Aulet does segmentation research _with_ conversations. A TAM built from a desktop report is decoration.
- “Tech stack” is not a Phase-4 strategy decision. It is a constraint of team, MVBP, and cost, decided **after** the product is specified.
- Legal is not a final boss after the product. In India, GST and DPDP can become blocking _as soon as you take money or personal data_.
- The biggest trap is still correct: **skipping interviews and building an impressive MVP.** Automating that trap with agents would be a worse product.

## Phases and step files

Full map: [`steps/00-phase-map.md`](steps/00-phase-map.md)

| Phase                 | Steps                                                                      | Gate                   |
| --------------------- | -------------------------------------------------------------------------- | ---------------------- |
| 1. Problem validation | [01](steps/01-problem-clarity.md)–[05](steps/05-persona-and-dmu.md)        | Pain evidence          |
| 2. Market and model   | [06](steps/06-market-sizing.md)–[11](steps/11-willingness-to-pay.md)       | WTP evidence           |
| 3. Product            | [12](steps/12-assumptions-and-tests.md)–[16](steps/16-build-mvbp.md)       | Falsifiable MVBP       |
| 4. GTM and team       | [17](steps/17-distribution-first-100.md)–[20](steps/20-costs-and-stack.md) | First-100 plan         |
| 5. Legal              | [21](steps/21-entity-and-registration.md)–[23](steps/23-compliance.md)     | Can legally take money |
| 6. Operate            | [24](steps/24-launch.md)–[26](steps/26-scale-or-kill.md)                   | Plan-vs-actual         |

Framework deep-dives live in [`frameworks/`](frameworks/). India detail lives in [`india/`](india/00-overview.md).
