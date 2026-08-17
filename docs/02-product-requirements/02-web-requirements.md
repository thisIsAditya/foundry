# Web application requirements

The web app is the founder's command center. It should be dense enough to show the state of the venture, but simple enough that a first-time founder always knows what to do next.

## 1. Primary information architecture

The project experience should have these persistent destinations:

1. **Overview** — score, current finding, next action, plan health, and recent changes.
2. **Co-founder** — durable conversation with the only founder-facing AI identity.
3. **Business model** — complete plan, section statuses, evidence, assumptions, and revisions.
4. **Work board** — AI jobs, founder tasks, approvals, blockers, and outputs.
5. **Research and evidence** — sources, citations, interviews, quotes, findings, and conflicts.
6. **Decisions** — decisions, alternatives, rationale, and GO/PIVOT/KILL outcomes.
7. **Settings** — providers, workspace members, project preferences, budgets, and draft-only integrations.

The founder should not have to navigate through a specialist directory to get work done.

## 2. Overview screen

The project overview must show, above the fold:

- venture name and one-sentence opportunity summary;
- overall business-model score;
- dimension score chips or cards;
- what is known, assumed, and missing;
- the highest-impact current finding;
- one recommended next action;
- AI work currently running;
- founder tasks waiting for the founder;
- plan revision waiting for review;
- research plan waiting to be started;
- provider and privacy mode;
- estimated current and next-job cost.

The overview must not open with a blank form or a mandatory questionnaire.

## 3. First idea flow

When creating a project, the founder should be asked for only:

- idea in their own words;
- optional target customer;
- optional geography;
- optional founder objective;
- optional constraints.

After submit:

1. Create a project and initial pack revision.
2. Generate the complete tracer-bullet draft using the input and explicitly labeled assumptions.
3. Generate the initial scorecard.
4. Generate a proposed baseline research job.
5. Create a first founder task only if it is genuinely required; do not block the draft on it.
6. Show a co-founder explanation and progress state.

The founder can browse the plan while the baseline proposal is being prepared.

## 4. Persistent co-founder surface

### Desktop

The co-founder should be available as a persistent panel or expandable side surface from all project destinations. The panel must preserve scroll position and unread state when the founder navigates to inspect a plan section or job.

The conversation surface must support:

- free-text messages;
- suggested questions;
- references to plan sections, jobs, evidence, and tasks;
- action cards;
- research-plan review;
- plan-diff explanation;
- founder-task completion;
- draft generation offers;
- retry and provider error recovery.

### Conversation response types

The co-founder response may contain:

- concise answer;
- cited finding;
- assumption card;
- proposed plan change;
- research plan;
- founder task;
- job creation request;
- draft action;
- decision card;
- blocker and recovery action.

Plain chat text alone is insufficient for material work.

## 5. Business model view

The business model page must show all 17 logical sections from the shared requirements document in a readable overview. Each section card shows:

- section name and plain-language explanation;
- status (`draft`, `assumption-heavy`, `researching`, `needs founder`, `supported`, `stale`, `blocked`, or `accepted`);
- score contribution;
- known facts;
- assumptions;
- citations and evidence count;
- last update;
- next improvement action;
- open draft changes.

The founder can open a section to see:

- human-readable content;
- structured values and calculations;
- evidence side panel;
- assumption side panel;
- source citations;
- revision history;
- diff against the accepted revision;
- accept/reject controls.

The page must make it obvious that a complete low-confidence section is more useful than an empty section, while never presenting assumptions as facts.

## 6. Work board

The work board is the control panel for the venture.

### Board views

Provide:

- Kanban view by job state;
- “assigned to me” founder-task view;
- timeline/activity view;
- cost and budget view;
- completed output view;
- blocked and needs-founder view.

### Job card

Each job card shows:

- plain-language objective;
- work role;
- owner;
- status and current stage;
- why it matters;
- source and plan scope;
- expected output;
- estimated cost/time;
- actual cost/time when complete;
- citations and changed sections;
- founder action if waiting.

The founder can open a job to inspect progress and output, but does not enter a specialist conversation.

### Job controls

The default card exposes:

- start;
- pause;
- cancel;
- retry;
- review output;
- review proposed plan changes.

An advanced settings panel exposes, within policy limits:

- provider/model;
- reasoning effort;
- context-window setting;
- permitted tools and source types;
- maximum spend;
- maximum duration;
- worker count where safe;
- whether the output can create a draft pack revision.

The co-founder remains responsible for the job objective and recommended role. The founder may safely override execution settings but cannot bypass policy, evidence rules, approval rules, or budget ceilings.

## 7. Founder task experience

Founder tasks must never appear as unexplained chores. A task page/card includes:

- “Why this matters”;
- the expected time;
- preparation from the co-founder;
- step-by-step instructions;
- a script, questionnaire, or template;
- what to record;
- how completion affects the score;
- a “Help me” action;
- complete, defer, skip, and discuss actions.

Examples:

- Conduct three non-friend interviews.
- Ask a prospect about their current workaround.
- Offer a paid pilot.
- Confirm who approves the purchase.
- Review a legal checklist with a professional.
- Select one MVBP capability.

When the founder selects “Help me,” the co-founder should prepare the relevant draft or explain the task without opening a new persona.

## 8. Research review

Before starting a research job, the web app must show:

- research question;
- why it matters;
- source categories;
- geography and date range;
- expected findings;
- estimated time;
- estimated cost;
- tools and provider;
- limitations;
- whether it will create a draft revision.

After completion, show:

- source list and citations;
- key findings;
- agreement and conflict between sources;
- claims added to the plan;
- assumptions that remain;
- score changes;
- proposed revision diff.

## 9. Scorecard experience

The scorecard must not be a decorative badge. It must show:

- overall score;
- seven dimension scores;
- score trend across revisions;
- strongest evidence;
- weakest dimensions;
- top three actions likely to improve the score;
- confidence and data freshness;
- why a score changed.

Use plain-language labels first. For example, “Will people pay?” may be the heading, with “willingness to pay” as supporting terminology.

## 10. Plan revision review

The review page must support:

- section-level diff;
- field-level before/after values;
- provenance badges;
- citations next to claims;
- assumptions added or removed;
- score before/after;
- unresolved conflicts;
- accept this section;
- accept all safe sections;
- reject;
- ask co-founder to explain.

The UI must warn when accepting a change makes dependent artifacts stale or changes canonical price, unit, currency, or cost logic.

## 11. Draft actions and integrations

The web app may let the co-founder create:

- email draft;
- interview or survey draft;
- meeting agenda and Google Meet details as text;
- payment-link setup instructions;
- landing-page draft;
- calendar event draft;
- invoice draft;
- legal or compliance checklist.

The first product version must not connect or execute these actions. If a future integration is connected, its write path must be a separate approval-gated requirement.

## 12. Responsive and accessibility requirements

- The project overview, co-founder, business model, work board, evidence capture, and plan review must work at desktop, tablet, and narrow mobile widths.
- Keyboard users can move between chat, board cards, task actions, and revision controls.
- Status must not rely on color alone.
- Long-running work has visible loading, paused, failed, and retry states.
- Errors explain what happened and what the founder can do next.
- The UI uses plain language and explains jargon inline.

## 13. Web acceptance criteria

- A new founder can enter only an idea and see a complete plan draft, score, research proposal, and work board without filling an interview form.
- The founder can start a research job after reviewing its scope.
- A research result displays source citations and a proposed revision.
- The founder can accept one section without accepting unrelated sections.
- The founder can inspect all AI jobs without talking to separate agent personas.
- The founder can see their own tasks with guidance and request help from the co-founder.
- The co-founder conversation remains available while browsing the plan and work board.
- No web control can send, publish, charge, schedule, or file in the first product version.
