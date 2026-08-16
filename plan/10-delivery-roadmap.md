# Delivery roadmap

## 1. Delivery strategy

Build vertical slices through the founder journey. Do not build a generic agent platform first.

Each phase must produce:

- a user-visible workflow;
- a persisted domain state;
- at least one meaningful artifact;
- policy and audit behavior;
- deterministic acceptance checks;
- web and mobile access where the feature is expected to be cross-platform.

The first release should prove that the app can improve a founder’s next decision. It should not attempt to automate the entire company.

## 2. Phase 0 — foundation

### Goal

Create a secure, provider-neutral foundation that can host a project and a resumable conversation.

### Scope

- authentication;
- workspace and project creation;
- project membership;
- project privacy mode;
- provider connection records and health check;
- model profiles;
- initial `CompanyPack`;
- pack revisions and human input;
- object storage upload intent;
- usage and budget ledger;
- chat streaming;
- audit events;
- basic web shell and mobile shell.

### Exit criteria

- A founder can create a venture on web and mobile.
- The founder can choose managed, BYOK, private, or local-first mode.
- No provider secret reaches a client.
- A pack revision can be created, diffed, exported, and resumed.
- A basic conversational turn is traceable from client to model and back.
- Budget and provider failures are visible.

## 3. Phase 1 — validation studio

### Goal

Make the evidence-first loop useful before product building.

### Scope

- orchestrator;
- interview coach;
- evidence librarian;
- problem, beachhead, persona, and DMU sections;
- interview note/transcript ingestion;
- quote extraction and Mom Test lint;
- web search and fetch with untrusted-content handling;
- source registry and citations;
- alternatives and competitor research;
- Gate A;
- mobile quick capture and voice-note intake;
- evidence library and citation viewer.

### Exit criteria

- The app refuses to generate a confident business plan from an unexamined idea.
- A founder can record a real interview and link quotes to a problem hypothesis.
- Web findings retain source and locator.
- Gate A cannot pass on simulated interviews.
- A founder can see what is known, assumed, and missing.

## 4. Phase 2 — model and money

### Goal

Turn evidence into a coherent business model and a testable offer.

### Scope

- business model analyst;
- MoneyRules service;
- pricing and packaging;
- deterministic market-size calculator;
- unit economics and sensitivity calculator;
- WTP and experiment analyst;
- WTP event log;
- Gate B;
- assumption and experiment board;
- spreadsheet generation for market and economics;
- financial coherence checks.

### Exit criteria

- Price exists in one canonical place.
- Canvas, narrative, spreadsheet, and deck references cannot silently diverge.
- Every numeric value has unit, period, currency where relevant, provenance, and source/assumption link.
- LTV, CAC, margin, and payback are calculated outside the model.
- Gate B distinguishes real money signals from interest and waitlists.

## 5. Phase 3 — company pack and exports

### Goal

Give the founder a useful, owned company pack.

### Scope

- artifact dependency graph;
- Markdown/HTML/PDF pack;
- Lean Canvas and Business Model Canvas views;
- evidence report;
- assumption board;
- pricing and unit economics workbook;
- one-page business brief;
- slide outline and deck preview;
- JSON/export manifest;
- current/stale warnings;
- pack diff and revision review.

### Exit criteria

- A founder can export a coherent pack without manually copying values between documents.
- Changing MoneyRules makes dependent artifacts stale.
- Every important claim can be traced to evidence or labeled as an assumption.
- Export includes provenance and source manifest.

## 6. Phase 4 — MVBP, GTM, and professional handoff

### Goal

Move from a validated model to the smallest valuable product and a credible first customer motion.

### Scope

- MVBP/PRD scoper;
- out-of-scope and kill-line enforcement;
- builder prompt and concierge runbook;
- GTM first-100 plan;
- organization and cost view;
- India legal/IP/privacy/compliance checklists;
- professional reviewer role;
- approval-controlled landing and payment drafts;
- calendar integration for interviews.

### Exit criteria

- The app blocks feature-heavy scope without a waiver.
- Build recommendations reference the accepted model and evidence.
- Legal output is clearly a checklist/draft for professional review.
- Outreach, publish, and payment actions remain approve-first.

## 7. Phase 5 — launch and operating runtime

### Goal

Use the accepted company pack to help run a real early business.

### Scope

- launch checklist;
- metric definitions and observations;
- Gate C;
- support draft agent;
- finance/invoice draft agent;
- CRM follow-up draft agent;
- compliance reminders;
- growth draft agent;
- plan-versus-actual dashboard;
- approved integrations.

### Exit criteria

- Runtime agents read accepted pack state and do not invent a second ICP or price.
- Changes to MoneyRules trigger a migration proposal.
- Side effects remain approval-controlled.
- Founder receives a useful weekly digest.

## 8. Recommended first vertical slice

The first demoable slice should be:

1. Founder enters an idea and constraints.
2. Orchestrator asks focused clarification questions.
3. App creates a problem and beachhead draft.
4. Founder uploads an interview note or transcript.
5. Interview Coach extracts quotes and flags Mom Test issues.
6. Evidence Librarian stores citations and provenance.
7. Critic reviews the problem evidence.
8. Gate A reports pass, fail, or missing evidence.
9. Founder receives one next action.

This slice proves the product’s differentiation. A generic chat, landing page generator, or multi-agent transcript does not.

## 9. Workstream sequencing

### Build first

- domain objects and pack revision rules;
- authorization and data scope;
- provider adapter and model profiles;
- orchestrator contract;
- evidence/source model;
- document ingestion basics;
- approval policy;
- usage/budget;
- deterministic checks.

### Build second

- artifact renderers;
- mobile capture;
- richer retrieval;
- WTP and financials;
- professional review;
- exports.

### Build later

- live integrations;
- operations runtime;
- watcher jobs;
- broad tool marketplace;
- fully local/offline sync;
- autonomous coding/build execution.

## 10. Acceptance criteria for each feature

Every feature proposal must answer:

- Which user decision does this improve?
- Which domain objects does it create or change?
- What is the source of truth?
- Is it synchronous or durable?
- Which tools and providers can it use?
- What data classification applies?
- What is the approval policy?
- What happens on failure or provider outage?
- What deterministic checks exist?
- How is it represented on web and mobile?
- How is it exported or audited?

## 11. Definition of done for a sprint

A feature sprint is complete only when:

- the user-visible flow works;
- domain state is persisted and versioned;
- permissions are enforced;
- cost is recorded;
- errors and blocked states are visible;
- the result is auditable;
- web/mobile behavior is intentionally defined;
- tests include at least one adversarial or failure case;
- documentation and export behavior are updated.
