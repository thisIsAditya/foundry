# Artifacts and tool catalog

## 1. Artifact philosophy

The founder should leave with a coherent company pack, not a collection of chat messages.

Artifacts are generated views over structured project state. Each artifact records:

- artifact type;
- pack revision;
- template version;
- source and citation references;
- generated time;
- generator and model profile;
- dependency list;
- current/stale status;
- export formats;
- visibility and sharing policy.

The model may draft content, but the artifact service owns structure, rendering, pagination, formulas, and packaging.

## 2. Artifact types

### Strategy and evidence

- problem brief;
- beachhead and persona;
- DMU map;
- alternatives matrix;
- competitor and wedge brief;
- evidence report;
- interview summary;
- assumption and experiment board;
- GO/PIVOT/KILL review.

### Business model and finance

- Lean Canvas;
- Business Model Canvas;
- value proposition brief;
- business model narrative;
- pricing and packaging;
- unit economics model;
- market-size workbook;
- sensitivity analysis;
- runway and operating-cost view.

### Product and execution

- MVBP / PRD;
- out-of-scope list;
- success metrics and kill line;
- builder prompt;
- concierge runbook;
- first-100 plan;
- launch checklist;
- operating playbooks.

### Formal outputs

- founder company pack;
- bank or grant plan;
- investor view;
- one-page brief;
- slide deck;
- operating dashboard;
- machine-readable JSON export.

The formal outputs are generated last and are not allowed to become a second source of truth.

## 3. Document generation

### Document pipeline

1. Select pack revision and template.
2. Resolve referenced claims, numbers, assumptions, and citations.
3. Validate that required sections exist.
4. Render structured content to an intermediate document model.
5. Apply layout and pagination.
6. Generate preview.
7. Run citation, numeric, and stale-dependency checks.
8. Store immutable artifact version.
9. Expose export and sharing permissions.

Supported outputs may include Markdown, HTML, PDF, and DOCX. The first release should prioritize Markdown/HTML and PDF because they are easiest to diff and export reliably.

## 4. Slide generation

Slides should be generated from a slide outline, not as free-form prose.

Each slide has:

- purpose;
- title;
- key message;
- claims;
- evidence/citations;
- data visual or table;
- speaker notes;
- source pack revision;
- layout class.

Rules:

- one message per slide;
- no unsupported metric;
- no duplicated MoneyRules;
- chart labels include units and source;
- a slide may show an assumption only when labeled;
- charts and diagrams are generated from structured data.

Output targets can include PPTX, PDF, and web preview.

## 5. Spreadsheet generation

Spreadsheets require stronger determinism than narrative documents.

A workbook should contain:

- input sheet;
- assumptions sheet;
- canonical MoneyRules sheet;
- calculation sheets;
- sensitivity sheet;
- summary/dashboard sheet;
- source and methodology sheet;
- change log.

Cells that come from founder input, external evidence, or formulas must be visibly distinguishable. Formulas should be generated from validated calculation specifications, not guessed by a language model.

The workbook service must reconcile:

- revenue;
- price and volume;
- gross margin;
- operating costs;
- cash flow;
- runway;
- LTV/CAC;
- payback;
- market-size totals.

If a formula cannot be validated, the workbook should contain an explicit review warning.

## 6. Artifact dependency graph

Examples:

- persona depends on interviews and beachhead;
- market size depends on beachhead, counts, price/unit, and sources;
- pricing depends on quantified value, business model, and WTP experiments;
- unit economics depends on MoneyRules, cost inputs, and assumptions;
- deck depends on problem, evidence, wedge, MoneyRules, traction, and pack revision;
- invoice or support playbook depends on accepted MoneyRules and offer.

When an upstream object changes:

1. identify dependent artifacts;
2. mark them stale;
3. explain the stale reason;
4. offer regeneration;
5. require human review for material changes.

## 7. Tool registry

Tools are capabilities available to agents through a versioned registry.

### Control tools

| Tool family | Responsibility |
|---|---|
| Pack read and propose | Read selected pack sections and submit validated changes |
| Sprint management | Open, pause, resume, stop, and close sprints |
| Ledger management | Read and update task/progress ledgers |
| Budget management | Reserve, settle, and check spend |
| Decision log | Record decisions and options |
| Gate evaluation | Evaluate configured gate rules |
| Approval management | Create, approve, reject, expire, and inspect pending actions |
| Cost meter | Return estimated and actual usage |

### Evidence tools

| Tool family | Responsibility |
|---|---|
| Source registration | Register URL/file and snapshot metadata |
| Web search | Return candidate sources and query trace |
| Web fetch | Fetch and snapshot untrusted external content |
| Document retrieval | Search project-scoped content |
| Citation checker | Check claim-to-source grounding |
| Interview ingestion | Store transcript/notes and extract candidate quotes |
| Mom Test linter | Flag pitching and hypothetical questions |
| Assumption service | Create and transition assumptions |
| URL verifier | Check that cited URL exists and is relevant |

### File and document tools

| Tool family | Responsibility |
|---|---|
| Upload/download | Signed object-storage transfers |
| PDF/HTML/JSON parser | Normalize content and preserve locators |
| OCR/table extractor | Process scans and tables |
| Spreadsheet reader | Read workbook values, formulas, sheets, and ranges |
| Slide/document reader | Extract text, notes, structure, and references |
| Artifact renderer | Generate documents, slides, sheets, and previews |
| Export/share | Create restricted links or downloadable files |

### Calculation tools

| Tool family | Responsibility |
|---|---|
| Market calculator | Bottom-up market-size formulas |
| Unit economics calculator | Margin, LTV, CAC, payback, and model-specific formulas |
| Sensitivity calculator | Scenario ranges and threshold tests |
| Reconciliation checker | Ensure totals and MoneyRules identities agree |
| Chart data builder | Produce labeled structured series |

### Experiment tools

| Tool family | Responsibility |
|---|---|
| WTP log | Record payment, invoice, deposit, LOI, and concierge signals |
| Landing draft | Prepare copy and test configuration |
| Payment-link draft | Prepare a payment request without sending |
| LOI draft | Create a founder-reviewable commitment document |
| Calendar draft | Prepare interview or experiment scheduling |

### Integrations

Add only when a user action justifies them:

- calendar;
- email;
- WhatsApp or approved messaging;
- storage providers;
- payment provider;
- CRM;
- accounting;
- analytics;
- legal/compliance source feeds.

Every integration connection is scoped, revocable, and visible to the user.

## 8. Tool definition requirements

Every tool definition must document:

- purpose;
- input fields;
- output fields;
- validation rules;
- access scope;
- data classification;
- cost;
- risk class;
- approval rule;
- timeout and retry;
- idempotency behavior;
- audit event;
- error categories;
- test fixtures.

Tool descriptions should tell an agent when not to use the tool. A tool catalog that only describes happy paths invites unsafe calls.

## 9. Tool selection and discovery

Do not expose every tool to every agent.

The orchestrator creates a per-sprint tool manifest based on:

- phase;
- objective;
- data scope;
- user permissions;
- provider capabilities;
- policy;
- budget;
- risk.

For large catalogs, support deferred tool discovery or an allowlisted registry search. The agent should see the smallest relevant tool surface.

## 10. MCP strategy

Treat MCP as an integration boundary, not as a trust boundary.

Recommended rules:

- allowlist servers per workspace;
- require explicit server metadata and owner;
- discover only approved tools;
- wrap tool outputs with source and trust metadata;
- run tools through the same policy engine as native tools;
- require approval for side effects;
- isolate credentials;
- log server, tool, arguments hash, and result status;
- disable a server without deleting project evidence;
- do not allow an MCP server to change gates or canonical MoneyRules directly.

The app may expose its own read-only pack and evidence tools through MCP later, but internal domain services remain authoritative.

## 11. Export and ownership

The founder should be able to export:

- structured JSON pack;
- evidence manifest;
- source/citation manifest;
- Markdown/HTML views;
- PDF;
- spreadsheet;
- slide deck;
- decision and experiment log.

Export must preserve provenance and mark unavailable or deleted sources. A hosted product may charge for compute or premium templates, but it should not make the founder’s core strategy pack inaccessible.
