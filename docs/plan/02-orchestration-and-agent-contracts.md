# Orchestration and agent contracts

## 1. Runtime pattern

The app uses three nested patterns:

| Layer | Pattern | Purpose |
|---|---|---|
| Company journey | Durable gated graph | Controls phase order, loops, human pauses, and pack state |
| Work burst | Magentic-style orchestrator-worker | Decomposes one bounded objective, runs independent workers, tracks progress, and replans on stalls |
| Quality | Evaluator-optimizer | A separate critic evaluates the proposed result against a rubric and deterministic checks |

The founder sees one contractor. The runtime can use several specialists without exposing a noisy group conversation.

## 2. Agent roster

### Control-plane agents

| Agent | Responsibility | Must not do |
|---|---|---|
| Orchestrator / Co-founder | Diagnose phase, ask founder questions, open sprints, select workers, enforce budget and gates, summarize decisions | Impersonate the founder, invent evidence, silently change MoneyRules |
| Evidence Librarian | Register sources, normalize quotes, maintain provenance, link claims to evidence, prevent destructive overwrites | Decide the business model or make unsupported sources look verified |
| Critic / Evaluator | Read a snapshot in a new context, apply rubric, identify instant fails, return GO/PIVOT/KILL recommendation | Write the business plan it is grading or hide defects to finish the sprint |

### Validation and model specialists

| Agent | Responsibility | Typical tools |
|---|---|---|
| Interview Coach | Turn founder context into interview scripts, lint transcripts, extract quotes and pain patterns, prepare Gate A review | Calendar, transcript parser, interview linter, evidence service |
| Research Crew | Research alternatives, market boundaries, and competitors in independent work packets | Web search, web fetch, PDF parser, source registry |
| Business Model Analyst | Compare revenue patterns, define who pays whom, define unit of sale, draft MoneyRules | Pack service, business-model library, evidence service |
| Pricing and Unit Economics Analyst | Propose pricing and packaging, run code-backed economics and sensitivity analysis | Calculator, spreadsheet engine, MoneyRules, assumptions |
| WTP and Experiment Analyst | Design demo-sell-build experiments, record payment and commitment signals, define pass/fail thresholds | Landing draft, payment-link draft, LOI draft, WTP log |
| Assumption and Test Analyst | Rank lethal assumptions and define falsifiable experiments with pre-registered outcomes | Assumption service, experiment board, decision log |

### Later specialists

| Agent | Activation condition |
|---|---|
| MVBP / PRD Scoper | Gate A passed and product hypothesis is ready |
| Build Prompt / Coding Worker | MVBP scope approved |
| GTM / First-100 | Gate B has a credible offer and target |
| India Legal and Compliance | Before handling regulated data, taking money, hiring, or filing preparation |
| Org and Cost | Product and business model are sufficiently stable |
| Launch | MVBP and legal readiness are reviewed |
| Ops Runtime | Gate C or explicit launch operating mode |

Do not expose all agents as permanent user-selectable personas. The orchestrator should choose a specialist based on the current phase and task contract.

## 3. Agent contract

Every agent invocation receives a contract with these fields:

| Contract field | Meaning |
|---|---|
| Objective | One concrete question or outcome |
| Phase | Current journey phase and allowed transitions |
| Pack snapshot | Exact pack revision the worker may read |
| Relevant evidence | IDs or retrieval query, not an unbounded transcript |
| Inputs | Founder answers, selected documents, prior artifact references |
| Output schema | Required findings, proposals, evidence links, risks, and next action |
| Tool allowlist | Only the tools required for the objective |
| Risk policy | Auto, approval-required, or forbidden actions |
| Budget | Maximum model tokens, tool cost, time, and worker count |
| Quality checks | Required deterministic and evaluator checks |
| Stop conditions | Conditions under which the worker must stop or ask the founder |
| Prompt version | Immutable instruction and rubric version |

The output must contain:

- a concise result;
- proposed pack changes;
- evidence references;
- assumptions introduced or changed;
- unresolved conflicts;
- confidence and provenance labels;
- artifacts created or updated;
- recommended next action;
- usage and cost;
- explicit blocked or incomplete status when applicable.

Private chain-of-thought is not a product output. The user receives conclusions, evidence, tool activity, decisions, and concise rationale.

## 4. Conference sprint lifecycle

### Stage 1: Diagnose

The orchestrator identifies the current phase, reads open assumptions and prior decisions, and asks only the questions that can materially change the next task.

If the user has only supplied an idea, the default action is clarification and problem framing, not market-size generation or code.

### Stage 2: Contract

The orchestrator creates a `SprintContract` containing:

- objective;
- why the objective matters now;
- artifacts to produce;
- evidence required;
- workers and boundaries;
- max rounds and max stalls;
- cost/time budget;
- approval points;
- acceptance checks;
- expected founder involvement.

Expensive or side-effecting sprints require founder plan approval before execution.

### Stage 3: Fan out

Independent workers run in parallel only when:

- they read the same stable snapshot;
- they write separate draft artifacts or evidence records;
- they do not need to negotiate mid-task;
- their combined cost fits the reserved budget.

For example, alternatives, market sizing, and competitor research may run in parallel after the problem and beachhead are stable enough.

### Stage 4: Synthesize

The orchestrator reads worker summaries and artifact references. It resolves conflicts by returning to evidence, asking a targeted follow-up, or opening a bounded debate. It does not average unsupported claims.

### Stage 5: Critique

The critic receives:

- the pack snapshot;
- the sprint contract;
- the produced artifacts;
- cited evidence;
- the rubric;
- deterministic check results.

It does not receive the generator’s private reasoning or an instruction to be agreeable.

### Stage 6: Gate and commit

The domain layer checks schema, provenance, numeric consistency, and phase gates. The founder can:

- accept the proposed revision;
- request a revision;
- reject it;
- record a waiver with reason and expiry;
- pause the journey.

The accepted revision becomes a new pack version. Drafts remain inspectable.

### Stage 7: Close

The orchestrator returns:

- what changed;
- what remains unverified;
- cost and time used;
- decisions needed;
- next recommended action;
- links to artifacts and evidence.

The sprint is closed, paused, failed closed, or routed to the next phase.

## 5. Dynamic coordination policy

Do not use one coordination topology for every task.

| Task class | Default strategy | Escalate when |
|---|---|---|
| Clarification | One orchestrator conversation | Answers conflict or materially change phase |
| Structured extraction | One extractor plus deterministic validation | Confidence is low or fields conflict |
| Market breadth | Parallel research workers plus synthesis | Sources disagree or coverage is thin |
| Financial arithmetic | Deterministic calculator | Inputs are ambiguous or model type is unsupported |
| Compliance checklist | Single retrieval/check agent | Rules conflict, jurisdiction is uncertain, or source is stale |
| Novel business-model design | Synthesis across model, customer, and evidence views | Wedge or price remains contested |
| Adversarial GO/PIVOT/KILL | Bounded bull, skeptic, and moderator | No agreement after cap; founder decides |
| External side effect | Draft agent plus approval policy | Always for publish, pay, send, file, or delete |

## 6. Gate definitions

Gates are domain functions over the pack. Agents may recommend a waiver, but they cannot mark a failed gate as passed without an explicit founder action.

### Gate A: problem evidence

Requires a configurable threshold of:

- interviews with real, non-friend participants;
- quotes linked to interview records;
- repeatable pain or costly workaround;
- evidence that the interview was not a hypothetical pitch;
- a specific beachhead and decision-maker hypothesis.

### Gate B: willingness to pay

Requires at least one credible non-friend money signal, such as:

- paid pilot;
- completed checkout;
- invoice or deposit;
- signed LOI with defined next step;
- paid concierge engagement.

A waitlist, positive comment, or simulated customer does not satisfy Gate B.

### Gate C: early operating evidence

Requires pre-registered thresholds appropriate to the model, for example:

- paying strangers;
- repeat usage or completed customer outcome;
- delivery margin or contribution margin;
- retention or repeat purchase;
- evidence that the first distribution motion can be repeated.

The gate configuration must be visible and editable before the experiment begins.

## 7. Tool policy

Tools have four risk classes:

| Risk class | Examples | Default |
|---|---|---|
| Read | Read pack, search, fetch, retrieve, inspect document | Auto within scope |
| Compute | Market calculator, unit economics, sensitivity, format conversion | Auto with limits |
| Draft | Email draft, landing draft, payment-link draft, legal checklist draft | Auto draft; never execute |
| Side effect | Send, publish, charge, file, delete, change live price | Approval or forbidden |

The policy engine must evaluate the user, workspace, project, agent, tool, data scope, and current gate before execution.

## 8. Budget policy

Budget is not only a billing feature. It is an orchestration control.

Track separately:

- model input and output usage;
- tool/provider charges;
- document processing charges;
- artifact rendering charges;
- reserved versus actual spend;
- spend by sprint, agent, provider, model, and artifact.

The orchestrator must stop or ask before:

- exceeding the sprint cap;
- spawning more workers than allowed;
- retrying a failed worker beyond its retry budget;
- switching to a paid fallback provider;
- launching a watcher or recurring job.

The user should see an estimate before a sprint and actual cost after it closes.

## 9. Failure behavior

| Failure | User-visible behavior |
|---|---|
| Missing founder input | Ask one focused question; preserve the paused sprint |
| Thin evidence | Mark result unverified; route to interview or experiment |
| Worker disagreement | Show conflict and sources; do not average it into certainty |
| Tool timeout | Retry within policy, then show a retry or alternative |
| Provider failure | Show provider/model failure and explicit fallback choice |
| Budget exhausted | Stop the sprint and show partial artifacts |
| Critic failure | Fail closed; preserve draft and show failed checks |
| Stale pack mutation | Ask to rebase or discard; never overwrite |
| Unsafe tool request | Block with a policy explanation and possible draft alternative |
