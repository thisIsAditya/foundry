# Shared product requirements

This document defines the behavior shared by web, mobile, and worker/backend. Platform-specific requirements are in the following documents.

## 1. Product promise

BusinessGenerator helps a founder move from:

> “I have an idea”

to:

> “I understand the customer, problem, alternatives, evidence, business model, price, risks, next experiment, and the decision I should make next.”

The product earns trust by showing useful progress before demanding founder effort. It builds a complete first version, labels what is weak, researches what it can, and asks the founder to supply only what cannot be responsibly automated.

The product is not an automated business-success machine. It must make uncertainty visible and help the founder reduce it.

## 2. Experience principles

### 2.1 Complete before perfect

Every project should have an end-to-end business model draft shortly after the founder enters an idea. The first draft may score poorly. A blank or blocked plan is not an acceptable first outcome.

### 2.2 Research before interrogation

The system should search and synthesize what can be learned from public sources before asking the founder for information that is already available elsewhere. It may still ask for founder-specific context, private constraints, and real-world validation.

### 2.3 The founder and AI share the work

AI owns research, synthesis, calculations, drafts, comparisons, and preparation. The founder owns lived context, relationships, interviews, real commitments, judgment, and external approvals.

### 2.4 One co-founder, many workers

The founder communicates with one co-founder. The co-founder may delegate to research, economics, product, legal-guide, or launch work roles. The founder sees the work and results but does not need to manage a group conversation.

### 2.5 Evidence is stronger than confidence

The app must distinguish:

- `known`: directly supplied or directly observed;
- `cited`: supported by a traceable source;
- `derived`: calculated from known inputs;
- `assumption`: plausible but unverified;
- `needs_founder`: requires a founder action or private fact;
- `stale`: previously supported but affected by changed inputs;
- `blocked`: cannot proceed under policy or missing required input.

The co-founder must not upgrade an assumption to a fact merely because the model sounds confident.

### 2.6 Visible work creates momentum

The founder should be able to see what AI is doing, what the founder owns, what is waiting, what changed, and what the next useful action is. Progress should be expressed as findings, citations, plan changes, and decisions, not artificial typing or agent theatrics.

### 2.7 Safe by default

The first product version drafts external actions but never sends, publishes, charges, schedules, or files. Any future execution path must remain approval-gated and auditable.

## 3. Tracer-bullet journey

The journey remains a useful organizing model, but it is no longer a hard waterfall. All nine phases should have a visible draft from the beginning, and research or founder work can improve any section without forcing the founder through a locked sequence.

| Phase                  | Question                                                   | AI contribution                                                     | Founder contribution                                       | Main improvement        |
| ---------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------- | ---------------------------------------------------------- | ----------------------- |
| Diagnose               | What are we trying to learn first?                         | Interpret the idea, identify unknowns, start a baseline plan        | Provide intent, constraints, and personal context          | Clear starting point    |
| Problem                | Who has which recurring problem?                           | Frame problem candidates and customer segments from research        | Correct the lived context and choose a plausible beachhead | Better customer clarity |
| Evidence               | Do real people experience it?                              | Prepare interview scripts, analyze quotes, detect patterns          | Conduct and record real conversations                      | Evidence strength       |
| Market and competition | What alternatives already win?                             | Research alternatives, competitors, market boundaries, and sources  | Correct hidden alternatives and relationships              | Market support          |
| Model and pricing      | Who pays whom, for what unit, at what price?               | Compare models and calculate scenarios                              | Choose constraints and business intent                     | Economics               |
| Willingness to pay     | Will someone exchange money or make a credible commitment? | Prepare offers, outreach, and experiment drafts                     | Make the offer and record the real signal                  | WTP score               |
| Product                | What is the smallest valuable experiment?                  | Scope an MVBP, metric, payment path, and kill line                  | Confirm what they can build or deliver                     | Execution readiness     |
| Build and launch       | Can the offer create value in reality?                     | Prepare build prompts, launch checklist, first-100 plan, and drafts | Build, deliver, contact, and approve actions               | Launch readiness        |
| Operate                | What should be repeated, corrected, or stopped?            | Analyze actual metrics and recommend GO/PIVOT/KILL                  | Record reality and make the decision                       | Operating evidence      |

The system may recommend a founder task in one phase while continuing research or drafting in other phases.

## 4. Complete business model

The first tracer bullet must cover these logical sections:

1. Context, founder objective, constraints, geography, and jurisdiction.
2. Problem statement and why it matters.
3. Beachhead customer segment.
4. Persona and decision-making unit.
5. Existing alternatives, substitutes, and competitors.
6. Evidence ledger, interviews, quotes, and sources.
7. Assumptions, experiments, and open questions.
8. Market model and sizing method.
9. Business model and canonical MoneyRules.
10. Pricing, packaging, and unit economics.
11. Willingness-to-pay events and offer tests.
12. MVBP, out-of-scope list, success metrics, and kill lines.
13. Go-to-market and first-100 customer plan.
14. Team, skills, technology, operating costs, and runway.
15. Legal, privacy, and compliance checklist.
16. Launch and operating playbooks.
17. Gates, decisions, risks, waivers, and artifact references.

Each section must have:

- a human-readable summary;
- structured fields where calculations or validations depend on them;
- a status;
- provenance for important claims;
- linked evidence and assumptions;
- last updated revision;
- the next action that would improve it.

The current five pack sections may remain useful as storage or navigation groupings during migration, but they must not hide the complete business model from the founder.

## 5. First-session experience

Within five minutes of entering an idea, the founder should be able to see:

1. A plain-language one-page opportunity summary.
2. A complete business model draft with weak sections visibly marked.
3. The overall score and dimension scores.
4. The assumptions that most affect the score.
5. A proposed baseline research plan with expected outputs, sources, estimated time, and estimated cost.
6. A work board showing AI jobs and founder tasks.
7. A co-founder message explaining what was generated, what is uncertain, and what can happen next.

The baseline research plan is shown before it runs. The founder starts it from the board or co-founder message.

## 6. Co-founder behavior

### 6.1 Conversation

The co-founder must:

- maintain a durable project conversation history;
- remember accepted facts, decisions, assumptions, constraints, and founder preferences;
- retrieve relevant history instead of sending an unbounded transcript to the model;
- explain why it is asking a question;
- state what it can do without the founder;
- offer concrete help instead of merely repeating the founder's answer;
- summarize changes into the plan, work board, or founder task list.

The co-founder must not:

- pretend that research was performed when no source was retrieved;
- claim that a draft is validated;
- invent interviews, quotes, payments, customers, competitors, or market numbers;
- force a phase transition simply because a form is complete;
- expose private chain-of-thought;
- create separate founder-facing personas for each worker.

### 6.2 Proactive help

When a founder task is created, the co-founder should offer relevant help such as:

- interview questionnaire and conversation opener;
- target-person description and outreach message;
- interview note template and quote extraction;
- survey or landing-page draft;
- offer and payment-conversation script;
- meeting agenda and follow-up email draft;
- competitor-research questions;
- pricing interview script;
- experiment design and pass/fail threshold;
- MVBP scoping worksheet;
- launch checklist and first-100 outreach draft;
- review questions for a CA, CS, lawyer, or other professional.

These are offers and drafts. They do not create a hidden obligation or perform an external action.

## 7. Scorecard

### 7.1 Score model

The product shows a 0–100 overall score plus seven dimension scores. Each dimension is scored from 0 to 5 and converted using the weight.

| Dimension           | Weight | What earns a high score                                                              |
| ------------------- | -----: | ------------------------------------------------------------------------------------ |
| Customer clarity    |     15 | Specific beachhead, clear problem, persona, and buyer roles                          |
| Evidence strength   |     20 | Independent interviews, linked quotes, repeated pain, source quality                 |
| Market support      |     15 | Named alternatives, credible competitors, cited market boundaries, clear wedge       |
| Business economics  |     15 | Canonical price/unit/cost, coherent model, calculated unit economics                 |
| Willingness to pay  |     15 | Independent payment, paid pilot, credible commitment, or strong offer result         |
| Execution readiness |     10 | Focused MVBP, payment path, metric, team/cost/launch plan                            |
| Risk control        |     10 | Important assumptions tested, legal/operational risks identified, kill lines defined |

Initial default score:

- unsupported assumptions score low;
- a complete section can still score low;
- citations improve support but do not prove customer demand;
- founder assertions are visible and do not count as independent evidence;
- friend/family interest does not satisfy independent validation;
- missing data is scored as unknown, not as a neutral average.

The score must show the largest reasons it is low and the smallest set of actions likely to improve it.

### 7.2 Score transparency

Every score update should explain:

- the input records used;
- the evidence and assumptions that affected it;
- the rule or weight applied;
- what changed since the previous score;
- the next action that could improve it.

Scores are attached to a pack revision and are recalculated when relevant evidence, assumptions, MoneyRules, or metrics change.

## 8. Plan revisions

AI work produces a draft revision, never a silent mutation of the accepted plan.

A revision must include:

- parent revision;
- originating job and model profile;
- changed sections and fields;
- before/after diff;
- evidence references;
- assumptions added or changed;
- score before and after;
- unresolved conflicts;
- confidence and provenance;
- recommended next action.

The founder may:

- accept the whole revision;
- accept individual sections;
- reject the revision;
- leave it pending;
- ask the co-founder to explain a change.

Accepting one section must not silently accept unrelated changes.

## 9. Jobs and founder tasks

### 9.1 Job states

Jobs use these states:

`proposed → queued → running → needs_founder → needs_approval → complete`

Terminal alternatives are `blocked`, `failed`, `canceled`, and `expired`.

### 9.2 Job contract

Every job records:

- objective and why it matters now;
- plain-language work role;
- assigned owner (`co-founder`, `AI`, or `founder`);
- source and pack revision snapshot;
- inputs and expected outputs;
- tools and source policies;
- model/provider;
- reasoning effort;
- context-window policy;
- estimated and actual cost;
- time budget;
- approval requirements;
- progress events;
- findings, citations, proposed changes, and next action.

### 9.3 Founder task contract

Every founder task records:

- the task in plain language;
- why it matters;
- expected time and difficulty;
- preparation materials;
- script/template/help action;
- evidence to capture;
- completion criteria;
- due date or suggested timing;
- linked score dimensions and plan sections.

The founder can mark a task complete only by providing the requested result or explicitly marking it skipped/deferred with a reason.

## 10. Research requirements

Baseline research must support:

- general public web search;
- company and competitor research;
- academic papers and research repositories;
- public market and industry data;
- source fetching and snapshots;
- citations at claim or finding level;
- source date, publisher, URL, and retrieval status;
- conflicting-source detection;
- stale-source marking;
- confidence and provenance labels.

Research output must be a reusable evidence bundle, not only chat prose. Claims without a source or founder input must remain assumptions.

Research jobs should be bounded by:

- objective;
- source types;
- geography;
- date range;
- result count;
- time budget;
- model/tool budget;
- stop condition.

## 11. Human ownership and safety

Founder-owned:

- private context and final interpretation;
- real conversations and interviews;
- real payment or commitment tests;
- acceptance of plan revisions;
- approval of any future external action;
- final GO/PIVOT/KILL decision.

AI-owned:

- research and source organization;
- comparison and synthesis;
- calculations using approved tools;
- draft surveys, emails, agendas, payment-link instructions, and launch materials;
- identifying contradictions, stale sections, and highest-value next actions.

Draft-only first release:

- no email send;
- no calendar or Google Meet write;
- no survey publish;
- no payment-link send or charge;
- no landing-page publish;
- no ad spend;
- no government filing.

## 12. Non-functional requirements

- A founder must be able to understand the plan without knowing the terms “Gate A,” “DMU,” or “MoneyRules”; technical terms require plain-language labels.
- Long-running research must be asynchronous and resumable.
- Every important AI result must be reproducible from a job contract, model profile, source snapshot, and pack revision.
- Every model and tool call must be attributable to a job and usage record.
- User-controlled budgets must have hard policy ceilings.
- Web and mobile must use the same project state, revisions, jobs, tasks, score, and conversation history.
- The system must degrade gracefully when a provider, search source, or worker is unavailable.
- All output is draft unless explicitly marked accepted, cited, or observed.
