# Phase map — 26 steps

Each step has its own file. Agents in [`../../03-agent-architecture/`](../../03-agent-architecture/00-recommended-roster.md) map 1:1 onto these steps plus a critic, librarian, and runtime ops.

**Rule:** a later step may start as a draft, but **gates** block treating it as true.

```
PHASE 1  Problem validation
  01 Problem clarity
  02 Beachhead customer
  03 Existing alternatives
  04 Customer discovery interviews     ← GATE A (pain evidence)
  05 Persona and decision-making unit

PHASE 2  Market and model
  06 Market sizing (TAM/SAM/SOM)
  07 Competitive landscape and wedge
  08 Business model
  09 Pricing framework
  10 Unit economics (LTV, CAC)
  11 Willingness to pay                ← GATE B (money signal)

PHASE 3  Product
  12 Key assumptions and tests
  13 MVBP / MVP scope
  14 Success metrics
  15 Roadmap and feedback loop
  16 Build the MVBP

PHASE 4  GTM and team
  17 Distribution — first 100
  18 Team and skills
  19 Tech stack decision
  20 Operating cost estimate

PHASE 5  Legal (parallel from Gate B; earlier if required)
  21 Entity and registration
  22 IP, contracts, privacy
  23 Compliance (GST, DPDP, sector)

PHASE 6  Operate
  24 Launch
  25 Operations system
  26 Scale, expand, or kill            ← GATE C then scale
```

## Parallelism (what can overlap)

| May run in parallel                                 | Must wait                                    |
| --------------------------------------------------- | -------------------------------------------- |
| 06–07 desktop research while 04 interviews continue | 13 scope waits for Gate A (and preferably B) |
| 18–20 planning while 16 is built                    | 17 paid acquisition waits for Gate B         |
| 21–23 paperwork once you will take money or data    | 26 scale waits for Gate C                    |
| 25 ops setup during 24 launch                       | Growth spend waits for a repeatable 17       |

## Outputs the founder takes away

After Phase 5, export the company pack listed in [`../../01-competitive-landscape/00-gap-analysis.md`](../../01-competitive-landscape/00-gap-analysis.md). After Phase 6, the pack is **live** (numbers update from actuals).
