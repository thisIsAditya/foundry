# Step 10 — Unit economics (LTV and CAC)

**Phase:** 2  
**Sources:** Aulet 17–19; SaaS standard LTV:CAC; starter notes’ “napkin math before scaling.”

## What this step is

Answer: **if this works, does a customer worth keeping cost too much to get?**

### LTV (lifetime value)

Profit from one customer over a finite horizon (Aulet often uses ~5 years), using **gross margin**, retention/churn, and a discount rate that is **honest about risk**. For a bootstrap subscription, a simpler form is fine:

`LTV ≈ ARPU × gross margin % × (1 / churn)`  
with a cap (e.g. 24–36 months) if churn is unknown.

### CAC / COCA (cost to acquire)

All sales and marketing cost to get **one new** customer in a period, including founder time if you would otherwise pay someone. Exclude cost to serve existing customers.

### Path

Early CAC **may exceed** LTV. That can be acceptable while you learn. You need a **story** for CAC falling (referrals, a channel, product-led) and LTV rising (retention, expansion). Target that mature LTV is **on the order of 3× CAC**, payback in a timeframe your cash can survive.

### Marketplace / transaction models

Use contribution margin per transaction × expected transactions × retention. Do not paste SaaS formulas.

## Evidence required

- Spreadsheet or model with inputs labeled.
- Sensitivity: “if churn is 8% not 3%, LTV dies.”
- Cash payback in months.

## Common failure modes

- LTV using revenue not margin.
- CAC that ignores founder salary.
- 10-year LTV for a product nobody has used for 10 days.

## Agent

Unit Economics Agent — **code does the arithmetic**; LLM only proposes inputs. Human confirms inputs (Harness financial checkpoint).

## Take-away

`unit_economics.md` + `model.xlsx` / JSON. Single-sourced from pricing + model.
