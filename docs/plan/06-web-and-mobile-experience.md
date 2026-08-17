# Web and mobile experience

## 1. Shared product model

Web and mobile are two views over the same project state. They must share:

- authentication and workspace membership;
- project and pack state;
- current phase and next action;
- sprint controls;
- approvals and decisions;
- evidence and citations;
- artifact versions and export;
- usage and provider settings;
- notification preferences.

They should not share every layout. A dense evidence table is useful on web; a focused next-action card is better on mobile.

## 2. Navigation

### Mobile

Use four primary destinations:

1. **Home** — current phase, next action, decisions, budget, and recent changes.
2. **Work** — active sprint, experiments, tasks, approvals, and activity.
3. **Pack** — business model sections and generated artifacts.
4. **Evidence** — sources, interviews, quotes, assumptions, and citations.

Settings, provider connections, members, integrations, and exports live behind a workspace/project menu.

### Web

Use a workspace shell with:

- left navigation for phase and primary destinations;
- central work area;
- optional right inspector for evidence, assumptions, citations, or approvals;
- persistent project status and budget.

Recommended web destinations:

- Founder Desk;
- Journey;
- Sprint;
- CompanyPack;
- Evidence Library;
- Experiments;
- Artifacts;
- Decisions and approvals;
- Settings and integrations.

## 3. Mobile-first interaction principles

- One dominant action per screen.
- Show “why this matters” before asking for input.
- Keep questions short and grouped by decision.
- Allow voice note, camera capture, document share, and quick text input.
- Use bottom sheets for evidence details and approvals.
- Use push notifications only for decisions, failures, approvals, or scheduled founder actions.
- Make sprint pause, stop, and approval controls reachable without navigating through agent logs.
- Support poor network conditions with optimistic draft capture and resumable uploads.
- Keep long documents readable through structured sections, not tiny previews.

## 4. Web workspace principles

- Support side-by-side artifact and source inspection.
- Make pack diffs easy to scan.
- Provide filters for known, assumed, unverified, stale, and blocked.
- Make tables and spreadsheets usable at desktop width.
- Provide a sprint console for plan, workers, cost, approvals, and checks.
- Allow export configuration and artifact regeneration.
- Keep private agent reasoning hidden; expose concise activity and evidence.

## 5. Onboarding flow

The first session should produce a useful project state, not a blank chat.

### Step 1: Create workspace

Ask for:

- founder name;
- workspace name;
- timezone and country;
- preferred language;
- collaboration preference.

### Step 2: Create venture

Ask for:

- idea in the founder’s own words;
- target geography;
- business type if known;
- intended outcome: explore, validate, build, raise, grant, loan, or operate;
- constraints: budget, time, team, skills, regulation, distribution access.

### Step 3: Choose inference mode

Offer:

- managed;
- provider BYOK;
- private;
- local-first.

Do not make provider configuration a blocker for entering the idea. The app can allow a low-cost setup flow and ask for the provider before expensive research.

### Step 4: Explain the contract

Tell the founder:

- the system will ask questions before making plans;
- research claims will carry citations;
- customer interviews remain human;
- external actions require approval;
- the founder may pause, export, or delete the project.

### Step 5: First output

Create:

- initial problem hypotheses;
- unknowns;
- suggested phase;
- three to five clarification questions;
- first sprint preview;
- estimated cost;
- “what will not happen yet” list.

## 6. Core screens

### Founder Desk

Display:

- current phase;
- one next action;
- evidence health;
- top assumptions;
- decision queue;
- current sprint or start-sprint action;
- budget and provider status;
- recently changed artifacts.

### Sprint preview

Before starting:

- objective;
- expected outputs;
- workers and why they are needed;
- data sources;
- tools and permissions;
- estimated cost/time;
- approval points;
- stop conditions.

Actions:

- start;
- edit objective;
- reduce scope;
- approve plan;
- save as draft;
- cancel.

### Sprint activity

Show:

- worker names and status;
- artifacts produced;
- sources found;
- current cost;
- blocked tasks;
- approval requests;
- retry or stop controls.

Do not show raw chain-of-thought or a simulated meeting transcript by default.

### Pack

Show the pack as sections:

- status;
- last updated;
- confidence/provenance summary;
- open assumptions;
- source count;
- artifact links;
- stale warnings.

Each section supports:

- inspect;
- edit founder input;
- review proposed change;
- view diff;
- view evidence;
- regenerate dependent artifact.

### Evidence Library

Tabs or filters:

- all sources;
- interviews;
- web research;
- uploaded documents;
- quotes;
- assumptions;
- unverified;
- stale;
- deleted/tombstoned references.

Every evidence item should answer:

- What is the claim?
- Where did it come from?
- Is it direct or inferred?
- When was it captured?
- What does it support?
- What would disprove it?

### Artifact viewer

Support:

- document preview;
- slide preview;
- sheet preview;
- source/citation panel;
- pack revision;
- stale dependencies;
- export/share controls;
- regenerate with selected template.

## 7. Common interaction cards

The UI should use structured cards inside conversation and work screens.

| Card | Contents |
|---|---|
| Clarification | Question, why it matters, quick answer options, free-text answer |
| Finding | Claim, confidence, provenance, citations, affected pack sections |
| Assumption | Statement, risk, current state, proposed test |
| Decision | Options, trade-offs, evidence, recommendation, founder choice |
| Sprint plan | Objective, workers, cost, permissions, acceptance checks |
| Approval | Exact action payload, risk, destination, expiry, approve/reject |
| Artifact | Type, revision, preview, status, stale dependencies |
| Gate | Criteria, current result, missing evidence, waiver action |
| Conflict | Competing findings, source comparison, resolution choices |
| Task | Founder action, due date, expected evidence, completion control |

## 8. Responsive parity rules

The following must work on both surfaces:

- read and answer clarifying questions;
- review and approve a sprint;
- pause or stop a sprint;
- approve or reject a side effect;
- inspect a citation;
- add a founder assertion;
- upload a document;
- view current pack status;
- view and export a supported artifact;
- record a decision.

The following may be web-first:

- complex spreadsheet editing;
- full document comparison;
- multi-source evidence matrix;
- template design;
- member administration;
- detailed trace and cost analysis.

The following may be mobile-first:

- voice notes;
- camera and document capture;
- quick interview note entry;
- push approval;
- daily digest;
- founder task completion.

## 9. Design system

Create shared tokens and semantic components across web and React Native:

- colors for primary, secondary, warning, danger, success, evidence, assumption, and stale;
- spacing and typography;
- status pills;
- evidence chips;
- cards;
- bottom sheets;
- tables;
- timeline;
- progress indicators;
- approval controls;
- empty/error/blocked states.

The component API should express domain meaning rather than only visual appearance. For example, an `EvidenceBadge` should know how to present provenance and verification status consistently on both platforms.

## 10. Accessibility and trust

- Maintain keyboard accessibility on web.
- Support screen readers and dynamic font sizing on mobile.
- Never encode meaning only by color.
- Show source and action destinations in plain language.
- Make destructive actions reversible where possible.
- Label system-generated content.
- Make the approval payload inspectable before confirmation.
- Preserve user draft input during network failures.

## 11. Notification policy

Notify the founder for:

- a question blocking progress;
- an approval required;
- a sprint completed;
- a sprint failed or exceeded its policy;
- a document processing failure;
- a gate result;
- a scheduled experiment or interview action;
- a material source or MoneyRules conflict.

Do not notify for every agent message, tool call, or low-value progress update.
