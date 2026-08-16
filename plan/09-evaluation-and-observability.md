# Evaluation and observability

## 1. Quality stance

The app should measure the quality of the complete system:

- model;
- prompt;
- agent contract;
- retrieval;
- tool definitions;
- domain validation;
- workflow;
- UI presentation;
- human approval behavior.

An agent that writes a persuasive document is not successful if the document is unsupported, inconsistent, unsafe, or impossible to act on.

## 2. Evaluation layers

### Deterministic checks

Use code for:

- schema validation;
- required fields;
- pack version conflicts;
- numeric units and currency;
- MoneyRules identity across artifacts;
- formula and total reconciliation;
- gate thresholds;
- source URL existence;
- approval policy;
- tool allowlists;
- budget limits;
- artifact stale status;
- tenant access.

### Retrieval checks

Measure:

- required passage recall;
- citation precision;
- locator correctness;
- table and unit preservation;
- source freshness;
- contradiction detection;
- scope isolation.

### Agent checks

Measure:

- contract adherence;
- correct phase routing;
- appropriate tool selection;
- unsupported-claim rate;
- refusal of insufficient evidence;
- useful question selection;
- plan completeness;
- recovery from tool failure;
- stop behavior when budget or policy blocks progress.

### Artifact checks

Measure:

- number consistency;
- citations present and correct;
- assumptions labeled;
- no placeholder sections;
- slide readability;
- spreadsheet formulas;
- PDF/DOCX/PPTX output validity;
- stale dependency behavior.

### Human-centered checks

Measure:

- founder can identify next action;
- approval payload is understood;
- evidence versus assumption is clear;
- mobile user can pause or approve;
- error recovery is understandable;
- export is usable without the application.

## 3. Golden packs

Create a set of synthetic but internally consistent company packs representing:

- B2B SaaS;
- Indian services business;
- marketplace;
- D2C/product business;
- regulated or privacy-sensitive concept;
- idea with insufficient evidence;
- idea that should be killed or pivoted;
- model with conflicting currency, price, and margin inputs.

Golden packs should contain fake but consistent numbers and documents. They are for system evaluation, not for user-facing validation.

Required assertions:

- MoneyRules remain identical across canvas, plan, slides, and sheets.
- A change to price marks dependent artifacts stale.
- The same source citation resolves to the same locator.
- An unsupported TAM does not pass the market check.
- Friend-only payments do not pass Gate B.
- Simulated interviews do not pass Gate A.
- A four-feature MVBP is flagged.
- A failed provider does not create a false success.

## 4. Adversarial fixtures

Maintain fixtures for:

- prompt injection in HTML, PDF, and JSON;
- malicious URLs and redirects;
- source contradictions;
- stale legal sources;
- malformed spreadsheets;
- hidden spreadsheet formulas;
- extremely large documents;
- duplicated evidence;
- ambiguous currency and tax;
- local model without tool calling;
- provider fallback with sensitive data;
- approval payload mutation;
- replayed payment or email call;
- worker loop and stalled sprint;
- concurrent founder edit during agent run.

## 5. Evaluation reports

Every evaluated run should record:

- test case;
- pack revision;
- prompt/agent/tool versions;
- provider/model;
- retrieval snapshot;
- expected checks;
- observed result;
- grader or human result;
- cost and latency;
- failure category;
- remediation status.

Do not evaluate only final prose. Inspect intermediate proposed changes, tool calls, source selections, gate inputs, and artifact dependencies.

## 6. Operational traces

Trace a request from client to final result:

- client request ID;
- API request;
- workflow ID;
- sprint ID;
- agent run;
- model call;
- tool call;
- retrieval query;
- source snapshot;
- pack proposal;
- validation;
- approval;
- artifact render;
- notification.

Each span should include safe metadata and hashes, not raw secrets or unrestricted personal content.

## 7. Product metrics

### Founder progress

- time from idea to clear next action;
- percentage of sessions resulting in a completed founder action;
- interview completion rate;
- WTP experiment completion rate;
- time from Gate A to Gate B;
- export rate of coherent pack;
- percentage of users who can explain their top assumptions.

### Evidence quality

- unsupported-claim rate;
- citation correctness;
- source freshness;
- interview quote traceability;
- assumption-to-experiment coverage;
- percentage of numbers with provenance;
- gate waiver frequency.

### Runtime quality

- sprint completion rate;
- stall and replan rate;
- tool failure rate;
- provider failure rate;
- approval rejection rate;
- duplicate side-effect prevention;
- artifact render success;
- pack mutation conflict rate.

### Cost and performance

- cost per interactive turn;
- cost per sprint;
- cost by agent and provider;
- tokens per accepted pack revision;
- median and p95 time to first token;
- median and p95 sprint duration;
- retrieval latency;
- document ingestion latency.

Metrics should be segmented by provider mode, model profile, document type, and mobile/web surface.

## 8. Quality dashboards

The product team needs dashboards for:

1. Active sprint health.
2. Provider and tool errors.
3. Evidence and citation failures.
4. Gate outcomes and waivers.
5. Cost and budget overruns.
6. Artifact stale and render failures.
7. Security policy blocks.
8. User-visible friction and abandoned actions.

The founder-facing digest should remain much simpler: cash/usage, current metric, blocked item, decision needed, and next action.

## 9. Human review

Use human review for:

- new agent definitions;
- new high-risk tools;
- compliance/legal templates;
- model profile changes;
- evaluation failures with ambiguous ground truth;
- any claim that affects public launch or money.

Reviewers should annotate the failure category, not just approve or reject. Those annotations become evaluation cases.

## 10. Release gates

Do not release a new agent or tool because a demo looks good. Require:

- contract tests;
- golden-pack tests;
- adversarial safety fixtures;
- retrieval/citation evaluation;
- cost and latency comparison;
- approval-policy tests;
- migration and replay test;
- mobile/web smoke test;
- rollback plan.

## 11. Replay and reproducibility

Support replay using:

- pack revision;
- source snapshot IDs;
- prompt versions;
- agent definition;
- tool versions;
- model/provider;
- provider options;
- seed or deterministic settings where available;
- budget policy;
- user action history.

Replay is a new run by default. The app should clearly distinguish a historical result from a fresh result with current providers.
