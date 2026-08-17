# Worker and backend requirements

The worker/backend is the product engine. It turns a founder idea into a complete draft, performs bounded research, stores durable memory, coordinates AI jobs, calculates the score, and proposes versioned plan changes.

## 1. Responsibilities

The backend must provide:

- durable project, pack, evidence, conversation, task, job, score, and preference state;
- co-founder orchestration;
- job planning and scheduling;
- research adapters and citation storage;
- model/provider selection;
- tool policy and safe controls;
- prompt/context assembly;
- structured outputs and validation;
- pack revision proposals;
- score calculation;
- usage and budget accounting;
- progress events and notifications;
- audit history.

The worker must be asynchronous for research, synthesis, scoring, rendering, and any job that can outlive a request.

## 2. Core domain additions

The target model should add or formalize these entities:

### Conversation

- project ID;
- durable message ID;
- actor (`founder`, `co-founder`, `system`);
- text and structured blocks;
- references to jobs, tasks, evidence, sections, and revisions;
- timestamp;
- visibility;
- summary/index status.

### FounderPreference

- project or workspace scope;
- preference key;
- value;
- source message;
- confidence;
- created/updated time;
- founder confirmation state.

Examples include preferred customer type, risk tolerance, budget, working style, geography, language, communication style, and availability. A preference is not an immutable fact until confirmed where it matters.

### AiJob

- job ID and project ID;
- objective;
- why now;
- role label;
- owner;
- job state;
- parent job;
- pack revision snapshot;
- inputs;
- output contract;
- source policy;
- tools;
- provider/model;
- reasoning effort;
- context-window policy;
- budget and duration limits;
- actual usage;
- progress events;
- outputs;
- failure/retry details;
- created/started/completed timestamps.

### FounderTask

- task ID;
- project ID;
- title and explanation;
- owner;
- linked job;
- linked plan sections and score dimensions;
- preparation/draft references;
- evidence schema;
- completion state;
- due/suggested time;
- defer/skip reason;
- completion evidence.

### ResearchSource and ResearchFinding

Sources must preserve:

- URL or source identifier;
- publisher/author;
- title;
- publication date;
- retrieval date;
- source category;
- snapshot/hash;
- fetch status;
- geographic scope;
- reliability notes.

Findings must preserve:

- claim;
- source references;
- citation locator;
- confidence;
- affected plan sections;
- conflicting findings;
- stale status;
- extraction method;
- originating job.

### PlanScore

- pack revision ID;
- overall score;
- dimension scores;
- inputs/rule version;
- reasons;
- top improvement actions;
- calculation timestamp.

## 3. Co-founder orchestration

The co-founder is the control-plane agent. It should:

1. Load the current plan, score, relevant history, open tasks, active jobs, evidence, assumptions, and founder preferences.
2. Decide whether to answer, research, create a draft revision, create a founder task, create a job, or ask a targeted question.
3. Prefer autonomous research and drafting when the missing information can be learned responsibly.
4. Ask the founder only for private context, judgment, real-world action, or a choice that changes the plan materially.
5. Explain its decision and create durable work items.
6. Summarize material results back into the conversation.

The co-founder may delegate to work roles such as:

- problem and customer researcher;
- evidence librarian;
- competitor and market researcher;
- business model analyst;
- pricing and unit economics analyst;
- willingness-to-pay and experiment planner;
- MVBP/product scoper;
- GTM/first-100 planner;
- org and cost planner;
- legal/compliance guide;
- launch and operations planner;
- critic/evaluator.

These are internal work roles, not separate founder-facing agents.

## 4. Tracer-bullet generation

### Initial generation

Given an idea and optional founder context, the backend must:

1. Create a complete initial pack revision.
2. Populate every logical section with one of:
   - founder input;
   - cited research;
   - derived calculation;
   - explicit assumption;
   - open question;
   - not applicable with a reason.
3. Calculate the initial score.
4. Identify the top assumptions and score gaps.
5. Generate a proposed baseline research plan.
6. Generate the first founder task only where AI cannot provide credible progress.

The initial generation should not invent specific customers, prices, quotes, market sizes, or payment signals. It may propose hypotheses and research questions.

### Continuous improvement

Every completed job or founder submission may produce a draft revision. The proposal pipeline must:

- validate structured section bodies;
- link claims to evidence or assumptions;
- preserve parent revision;
- compute score before and after;
- mark dependent artifacts stale;
- identify conflicts;
- make the draft reviewable by section.

## 5. Research runtime

### Research planner

The planner creates a bounded research contract:

- question;
- section targets;
- source categories;
- geography;
- date range;
- search queries;
- result limit;
- fetch depth;
- cross-check requirement;
- time and spend budget;
- expected output;
- stop conditions.

The founder reviews and starts the baseline plan from web or mobile.

### Research workers

Workers should support:

- public web search;
- page fetch and extraction;
- competitor/company profiles;
- academic paper discovery;
- market/report discovery;
- source deduplication;
- citation extraction;
- comparison tables;
- contradiction detection.

The runtime must preserve source snapshots and not rely on the model's unsupported memory of a source.

### Research output

Each research job returns:

- concise findings;
- claims;
- citations;
- source quality notes;
- conflicts;
- assumptions remaining;
- affected plan sections;
- proposed changes;
- score delta;
- recommended next action.

## 6. Context and memory

Conversation history is durable, but model context is selective.

Context assembly should include:

- recent conversation messages;
- a rolling project conversation summary;
- accepted founder preferences relevant to the task;
- current accepted pack revision;
- pending draft revision if relevant;
- relevant evidence and citations;
- open assumptions and founder tasks;
- active jobs and recent outputs;
- decisions and their rationale;
- score and score reasons.

The context builder must:

- respect the selected context-window setting within hard provider limits;
- prioritize accepted and current information over stale drafts;
- avoid duplicate or contradictory facts;
- show provenance for injected facts;
- record which context items were used for reproducibility.

## 7. Job controls and policy

The founder can safely override:

- provider/model;
- reasoning effort;
- context-window size;
- approved tools/source classes;
- maximum spend;
- maximum duration;
- run/pause/cancel.

The backend must enforce:

- workspace and project budget ceilings;
- provider capability limits;
- maximum context and output size;
- tool allowlists;
- source and data permissions;
- risk ceilings;
- concurrency limits;
- cancellation and timeout;
- immutable job contract history.

Founder controls must not:

- enable forbidden tools;
- bypass evidence requirements;
- expose another workspace's data;
- silently mutate accepted plan state;
- cause an external side effect.

## 8. Tool requirements

Tool use should be selected by the job role and contract, not by a global tool bag.

Initial useful tool groups:

- market sizing calculator;
- unit economics calculator;
- sensitivity calculator;
- MoneyRules reconciliation;
- MVBP scope checker;
- source search/fetch;
- citation extraction;
- draft survey/interview;
- draft email;
- draft meeting agenda;
- draft payment-link instructions;
- draft landing copy;
- builder prompt;
- legal/compliance checklist.

Tool output must be structured, validated, attributable to the job, and included in the job result. A model must not claim to have called a tool if the call was not recorded.

## 9. Scoring service

The scoring service must implement the shared seven-dimension rubric and version it.

It must:

- calculate scores deterministically from stored inputs;
- distinguish missing data from a zero result;
- show score reasons;
- expose score deltas;
- produce top improvement actions;
- recalculate on relevant accepted evidence, payment signal, MoneyRules, plan, or metric changes;
- preserve historical score snapshots.

The score is an aid to prioritization, not a claim that a venture will succeed.

## 10. Draft-only actions

The backend may generate records for:

- email drafts;
- survey/questionnaire drafts;
- meeting and Google Meet details as a draft;
- payment-link instructions;
- landing-page drafts;
- calendar-event drafts;
- invoice drafts;
- legal/compliance drafts.

The first product version must not call external write APIs. Integration credentials are not required for draft generation. A future execution feature must add explicit approval, payload hashing, idempotency, audit, and execution status.

## 11. Progress and notifications

Every job emits durable progress events:

- proposed;
- contract reviewed;
- queued;
- source search started;
- source fetched;
- finding created;
- synthesis started;
- draft revision ready;
- score updated;
- needs founder;
- completed;
- failed;
- canceled.

Events are projected to web and mobile. Notification workers notify only for meaningful founder actions, failures, material score changes, or completed outputs.

## 12. Usage and budget

Every model and tool call records:

- job ID;
- provider and model;
- input/output tokens or equivalent;
- tool name and duration;
- estimated and actual cost;
- budget reservation and release;
- failure or retry.

The board must show estimated cost before starting and actual cost after completion. A job stops or asks for approval when it reaches its configured budget.

## 13. Backend acceptance criteria

- An idea creates a complete low-confidence plan without requiring interviews first.
- The co-founder can create a bounded research proposal and explain it.
- Starting research produces citations and reusable findings.
- A job can create a draft pack revision with a score delta and section diff.
- The founder can accept only selected sections.
- Durable conversation history and preferences are available across sessions and clients.
- The co-founder can create guided founder tasks and help drafts.
- Job controls are enforced server-side, not only hidden in UI.
- No unapproved external write occurs.
- Missing provider, search failure, timeout, or malformed model output creates a visible recoverable job state.
