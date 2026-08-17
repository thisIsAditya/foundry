# Product brief and experience model

## 1. Product promise

BusinessGenerator helps a founder move from:

> “I have an idea”

to:

> “I understand the customer, problem, alternatives, evidence, business model, price, risks, next experiment, and the decision I should make next.”

The app behaves like a capable contractor. It asks for missing inputs, performs bounded research, creates working artifacts, checks its own work with an independent critic, and returns to the founder when judgment or permission is required.

The promise is not that the app can guarantee a successful startup. The promise is that it can make uncertainty visible, reduce avoidable work, and prevent unsupported confidence from being presented as a business.

## 2. Primary users

### Founder

Owns the idea, answers questions, supplies or approves evidence, performs real customer conversations, approves side effects, and owns final decisions.

### Founder collaborator

Can help with research, interviews, financial inputs, or artifacts. Permissions are scoped to a workspace and project; collaborator access does not imply authority to send, spend, publish, or file.

### Professional reviewer

Optional later role for a mentor, CA, CS, lawyer, accountant, or investor. Receives a read-only or comment-only pack view. Professional advice is not silently converted into system truth; it is recorded with source and reviewer identity.

### Internal operator

Support and workspace administration. Cannot inspect project content without explicit support access and an audit trail.

## 3. Core product jobs

| Job | User outcome | System behavior |
|---|---|---|
| Clarify an idea | A specific problem and first customer | Ask a small number of high-value questions; reject slogans and solution-smuggling |
| Validate pain | Evidence from real people | Coach interviews; ingest notes; separate quotes from interpretation |
| Understand the market | Named alternatives, market boundaries, and wedge | Search with citations; label estimates and assumptions |
| Decide how to make money | Coherent model, price, unit, margin, and sensitivity | Maintain canonical `MoneyRules`; calculate with code |
| Decide whether to build | MVBP scope and falsifiable metric | Block feature sprawl; tie build to evidence and a payment path |
| Produce useful work | Documents, slides, sheets, and exports | Generate artifacts from the pack, not independent invented values |
| Keep the founder moving | One next action with a reason | Orchestrator diagnoses stage and presents a bounded sprint |
| Preserve trust | Know what is true, assumed, stale, or pending | Provenance, citations, decisions, approvals, and audit events |

## 4. Founder journey

The journey is a graph, not a mandatory waterfall. A later phase can have a draft, but the UI must distinguish a draft from a passed gate.

| Phase | User-facing question | Primary outputs | Gate or transition |
|---|---|---|---|
| Diagnose | What are we trying to learn first? | Stage, constraints, next action | Founder confirms context |
| Problem | Who has which recurring problem? | Problem statement, beachhead, persona, DMU | Interview plan |
| Evidence | Do real people experience it? | Interview log, quotes, pain patterns | Gate A: repeatable pain evidence |
| Market and competition | What alternatives already win? | Alternatives, competitors, market-sizing method, wedge | Research review |
| Model and pricing | Who pays whom, for what unit, at what price? | Business model, `MoneyRules`, unit economics | Gate B plan |
| Willingness to pay | Will a non-friend exchange money or a credible commitment? | WTP events, offers, LOIs, checkout/concierge results | Gate B: money signal or explicit deferral |
| Product | What is the smallest valuable experiment? | Assumptions, MVBP, out-of-scope list, metric, kill line | Build approval |
| Build and launch | Can the offer create value in reality? | PRD, builder prompt, launch checklist, first-100 plan | Gate C evidence |
| Operate | What should be repeated, measured, or corrected? | Support, finance, CRM, compliance, growth playbooks | GO, PIVOT, or KILL |

## 5. The main screen: Founder Desk

The app should open on a decision-oriented workspace, not an agent directory.

### Header

- venture name and current phase;
- evidence health;
- current budget and estimated sprint cost;
- sync status and pending approvals;
- provider/privacy mode.

### Main content

1. **Next action** — one recommended action, why it matters, and the evidence required.
2. **Current finding** — the latest material change, with confidence and source chips.
3. **Open assumptions** — the three most lethal assumptions, their state, and the next test.
4. **Decision queue** — approvals, clarifications, waivers, and founder choices.
5. **Artifact changes** — what became current, stale, or blocked.
6. **Activity** — compact progress events; detailed traces are optional.

### Conversation behavior

The conversation is an interface to work, not the place where work disappears. Every meaningful response should be able to produce one or more of:

- a proposed pack change;
- a cited finding;
- a decision card;
- an experiment;
- a task for the founder;
- an artifact preview;
- an approval request;
- a blocked-state explanation.

The user may ask naturally, upload files, paste URLs, speak a voice note, or select an action. The orchestrator translates that input into a bounded task.

## 6. Naturalness rules

The app should feel like one reliable contractor even though several agents work behind it.

- Use one consistent co-founder voice for user-facing coordination.
- Mention specialist roles only when useful: “I asked the market researcher to compare…”
- Never make the founder choose between ten agents for a normal task.
- Ask at most a small batch of questions; explain why each unanswered question matters.
- Show the planned work before expensive or side-effecting work begins.
- Show progress as artifacts and decisions, not fake typing or theatrical agent chatter.
- Summarize completed work in plain language with links to evidence.
- Make uncertainty explicit: `Known`, `Founder input`, `Derived`, `Needs verification`, `Blocked`.
- Let the user inspect details without forcing detail on every screen.

## 7. Business model of the app

The product should support three usage modes:

| Mode | Description | Product requirement |
|---|---|---|
| Founder-managed | User supplies provider keys and pays providers directly | Clear BYOK setup, cost meter, no silent fallback |
| Managed | BusinessGenerator provides a model budget or gateway | Per-workspace limits, usage visibility, billing and quotas |
| Private/local | User routes inference to a private endpoint or local model | Connector health, capability warnings, no assumption that local means secure |

The app should not tie project content to a single provider. Provider choice is a workspace or task policy, not a permanent project migration.

## 8. Non-goals for the first release

- Full autonomous operation of a live company.
- Automatic government filings, legal submissions, or tax advice.
- Unsupervised customer interviews or sales calls.
- A general-purpose CRM, ERP, accounting system, or project-management replacement.
- A marketplace of dozens of agents.
- Continuous competitor watchers before the core validation loop is reliable.
- Arbitrary shell access or an unrestricted code interpreter.
- A visually polished 30-page business plan as the first user outcome.

## 9. Success criteria

### User value

- A new founder reaches a clear next action without reading a methodology manual.
- The founder can distinguish evidence from assumptions.
- The founder can export a coherent pack and inspect why each important number exists.
- The app helps the founder complete real interviews and WTP tests rather than simulating them.

### System quality

- No artifact contains a materially conflicting price, unit, or market number without a visible warning.
- Unsupported external claims are blocked or labeled.
- High-risk actions never execute without the required approval.
- A paused sprint can resume after hours or days without losing state.
- Web and mobile expose the same project state, approvals, artifacts, and decisions.

## 10. Product language

Use:

- `CompanyPack`, `evidence`, `assumption`, `experiment`, `sprint`, `gate`, `approval`, `artifact`, `decision`, `next action`.

Avoid as primary UI language:

- `swarm`, `agent colony`, `autonomous employee`, `AI boardroom`, `magic`, `guaranteed`, `validated users` for simulated interactions.
