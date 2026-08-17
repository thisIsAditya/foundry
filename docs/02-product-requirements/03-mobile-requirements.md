# Mobile application requirements

The mobile app has the same project state and core capabilities as web. It should be optimized for short sessions, capture in the field, quick decisions, and visible momentum rather than dense side-by-side inspection.

## 1. Mobile product role

Mobile is not a reduced read-only companion. A founder must be able to:

- talk to the co-founder;
- see the complete plan and its score;
- start and control jobs within safe limits;
- complete founder tasks;
- capture interviews, quotes, photos, voice notes, and payment signals;
- review and accept plan sections;
- inspect sources and evidence;
- respond to approvals or draft decisions;
- receive progress and blocker notifications.

The mobile layout may simplify the presentation, but it must not remove a core decision or task.

## 2. Primary navigation

Use five primary destinations:

1. **Home** — score, next action, current finding, jobs, and founder tasks.
2. **Co-founder** — persistent project conversation.
3. **Work** — jobs, founder tasks, progress, blockers, and budget.
4. **Plan** — complete business model, score, revisions, and section review.
5. **Evidence** — interviews, quotes, sources, citations, and observations.

Decisions, settings, provider configuration, and draft outputs are available from project menus without hiding their status from Home.

## 3. Mobile Home

Home should answer four questions immediately:

- What is my business idea becoming?
- How solid is it right now?
- What is AI doing?
- What should I do next?

The first screen contains:

- one-sentence opportunity summary;
- overall score and score trend;
- strongest and weakest dimensions;
- current AI activity;
- founder task card;
- research proposal waiting to start;
- latest plan change;
- quick actions for chat, capture, review, and work board.

Do not open with a multi-field intake form.

## 4. Co-founder experience

The co-founder is a primary mobile destination and keeps the same durable history as web.

It must support:

- text and voice-note input;
- suggested prompts;
- cited findings;
- plan-change cards;
- task cards;
- research-plan cards;
- draft-help offers;
- job progress;
- revision review;
- retry and offline recovery.

The co-founder should be able to say:

> “I have enough to draft the first plan. I am uncertain about the customer and price. I found three alternatives and prepared a five-question interview. You can review the plan now or start the research job.”

The founder should never need to open a specialist screen to get help.

## 5. Mobile capture

Capture must be optimized for use immediately after a real-world interaction.

### Interview capture

Support:

- participant type;
- consent;
- date/time;
- optional participant label;
- text notes;
- one quote per line;
- voice note;
- attachment or photo;
- offline draft;
- save and sync later.

The app should remind the founder that friends and family do not count as independent validation, without shaming the user.

### Payment and WTP capture

Support:

- prospect type;
- offer;
- amount and currency;
- payment or commitment instrument;
- date;
- evidence attachment;
- result;
- notes;
- whether the signal was independent.

### Quick observation

Allow the founder to record an observation or assumption from the field and link it to a plan section.

## 6. Mobile Work

The Work destination uses focused lists instead of a wide Kanban by default:

- Needs me;
- Running now;
- Waiting for research;
- Needs review;
- Completed;
- Blocked.

Each job opens to:

- objective and why;
- current progress;
- role label;
- owner;
- estimated and actual budget;
- source scope;
- outputs;
- citations;
- proposed changes;
- safe controls.

Advanced job settings are available from a secondary panel. The mobile app must show the same safe limits as web and must not make it easier to accidentally exceed a budget.

## 7. Founder task flow

The task screen must have one dominant action. It includes:

- task title;
- why it matters;
- estimated time;
- preparation;
- script/template;
- capture action;
- completion criteria;
- score dimensions affected;
- Help me;
- complete, defer, skip, or discuss.

The founder can start an interview task, conduct the conversation, capture notes, and submit evidence without losing the task context.

## 8. Mobile Plan

The Plan destination starts with:

- complete plan outline;
- overall and dimension scores;
- section status;
- largest assumptions;
- score-improvement actions.

A section detail view shows:

- summary;
- claims and values;
- evidence and citations;
- assumptions;
- score contribution;
- revision diff;
- accept/reject controls.

For long sections, use progressive disclosure. Do not show tiny document previews that are impossible to read on a phone.

## 9. Evidence library

Evidence should be filterable by:

- interviews;
- quotes;
- sources;
- findings;
- assumptions;
- payment signals;
- stale or conflicting items.

Opening a citation must show enough context to understand what the source supports. The mobile app should allow quick tagging and linking without requiring a desktop.

## 10. Notifications

Notify only for useful events:

- research completed;
- job needs founder input;
- plan revision ready;
- a job failed or is blocked;
- a founder task is due or suggested;
- score changed materially;
- a budget threshold was reached.

Notifications must deep-link to the relevant project, job, task, or revision and must not expose sensitive project content in the notification preview by default.

## 11. Offline and poor network behavior

- Text, interview notes, quotes, and observations can be captured as local drafts.
- Sync status is visible.
- Duplicate submissions are prevented with idempotency keys.
- A failed sync explains what is pending and allows retry.
- The mobile app must not show a captured note as accepted evidence until the server confirms it.

## 12. Mobile acceptance criteria

- A founder can see the complete plan and score on a phone without opening the web app.
- A founder can continue the same co-founder conversation from web or mobile.
- A founder can start/review safe jobs and see their outputs.
- A founder can complete an interview task from preparation through evidence submission.
- A founder can review and accept a single plan section.
- A founder can capture notes offline and later sync them without duplication.
- Notifications lead to the exact work item that needs attention.
- Mobile never executes external actions in the first product version.
