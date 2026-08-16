# India — DPDP, IP, and sector overlays

## DPDP Act 2023 and Rules 2025

India’s comprehensive digital personal data law. Official text: India Code. Rules notified **13 November 2025** (G.S.R. 846(E) and related instruments).

**Phased picture used in practitioner/legal summaries (verify against MeitY notifications):**

| When | What |
|---|---|
| 13 Nov 2025 | Data Protection Board established; some institutional provisions live |
| ~13 Nov 2026 | Consent Manager framework |
| ~13 May 2027 | Substantive Data Fiduciary duties and penalty enforcement |

Until May 2027, IT Act / SPDI Rules still matter for many teams; **do not tell users they can ignore privacy until 2027.** Building notice and consent now is cheaper than a retrofit.

### Roles

- **Data Principal:** the individual.  
- **Data Fiduciary:** who decides purpose and means (the startup).  
- **Data Processor:** vendor who processes on your behalf (LLM provider, analytics, WhatsApp Business API — contracts needed).

### Core duties to encode in the product

1. **Notice** (s.5 / Rule 3): standalone, plain language, itemised data, purposes, how to withdraw, exercise rights, and complain to the Board. Link to website/app.  
2. **Consent** (s.6): free, specific, informed, unambiguous. Withdrawal **as easy as** giving consent.  
3. **Purpose limitation and minimization.**  
4. **Security safeguards** (s.8(5)) — highest penalty tier in the Act (**up to ₹250 crore** in the Schedule for this failure, as commonly cited).  
5. **Breach intimation** to the Board and principals (Rules specify process/timelines; 72 hours appears in many explainers — encode from the Rules text, not blogs).  
6. **Children:** extra restrictions (s.9).  
7. **Significant Data Fiduciary:** extra duties if notified (s.10) — unlikely at idea stage.

Interviews, waitlists, and support WhatsApp groups are all in scope.

### Product rule

Generate a **notice + consent UX spec** as part of the company pack. Do not silently send interview recordings to a US LLM without processor terms and purpose disclosure.

## Trademarks and IP

- Search the IP India trademark database before committing to a brand. SPICe+ name approval ≠ trademark.  
- File in the right **Nice classes**.  
- Contractor code: written assignment.  
- Avoid using another company’s mark in the brand (common with “AI + famous word”).

## Sector overlays (examples)

- **Payments / lending:** RBI, PA/PG, NBFC — do not “just use UPI” as a product without advice.  
- **Health:** additional sensitivity; DPDP plus professional rules.  
- **Education of minors:** children’s data.  
- **Marketplaces:** intermediary rules, GST e-commerce, consumer protection.

## Labour / shops

State Shops & Establishment; professional tax; minimum wages if you have employees. SPICe+ already pulls some of this for companies.

## Product rule

Compliance agent outputs a **calendar and a “ask a professional about X” list**, not a fake license.
