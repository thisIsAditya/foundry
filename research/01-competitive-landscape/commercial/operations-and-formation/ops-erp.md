# Operations suites (Zoho, Odoo, ERPNext, Tally)

Once a business exists, founders in India do not buy LivePlan. They buy **GST billing, inventory, CRM, payroll, and accounting**. If we ignore this layer we will incubate companies into a void.

## Zoho One

The most important India-adjacent suite: CRM, books, invoice, inventory, people, campaigns, desk, analytics — one contract. GST-aware invoicing. This is what a serious Indian SME actually runs on.

**Implication:** do not rebuild ERP. **Integrate and generate configuration** (chart of accounts, GST tax rates, pipeline stages named after our ICP, support macros from the offer’s FAQ).

## Odoo

Open-core ERP (Community + Enterprise). Apps for accounting, inventory, manufacturing, website, CRM. Strong for product businesses that will hire an implementer. Too heavy for day-0 idea stage.

**Implication:** optional export of Odoo/ERPNext starter modules as an advanced take-away.

## ERPNext (Frappe)

Open-source ERP with excellent India GST support and a large Indian partner network. Honest alternative to Zoho for founders who want to own the stack.

## Tally, Vyapar, myBillBook, Khatabook

The real “first software” for Indian traders. Invoicing and GST, not strategy. If our user is a kirana or wholesaler, telling them to use HubSpot is malpractice.

**Implication:** the ops agent must **branch by business type**.

## HubSpot, Pipedrive, QuickBooks, Xero, Gusto, Deel

Global defaults. LivePlan already syncs QBO/Xero. We should treat these as **connectors in Phase C**, not as competitors in Phase A.

## What to steal

- GST-ready invoice as a default artifact for India.
- “Company already knows its pipeline stages” as the integration story vs empty Zoho.

## What to avoid

- Building a sixth ERP.
- Forcing SaaS CRM on a cash-and-GST-invoice business.
