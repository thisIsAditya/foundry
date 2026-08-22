# Co-founder chat experience

**Status:** proposed Phase 2 plan  
**Implements:** P2.1  
**Depends on:** [Phase 2 overview](00-README.md), [web journey
experience](../03-web-journey-experience.md), and [bounded operations and
runtime boundary](03-bounded-operations-and-runtime-boundary.md)

## 1. Objective

Replace the bespoke chat thread with a trustworthy co-founder workspace that
explains a decision before presenting an action. The result must feel like
guided business work, not a generic chatbot or a technical agent console.

The redesign does not make conversation canonical. The accepted record,
journey, evidence, decisions, and proposals remain the source of truth; chat
is a contextual interface to those objects.

## 2. Library decision

### 2.1 Primary: assistant-ui with `ExternalStoreRuntime`

Adopt `@assistant-ui/react` as a presentation layer through its
`ExternalStoreRuntime`. This is the intended integration when an application
already owns messages through TanStack Query, Zustand, an API, or a database.
That matches BusinessGenerator’s persisted `ConversationMessage` history and
resumable project SSE stream.

The compatibility spike must prove:

- a server-rendered initial message history hydrates from application queries;
- an external store projects only typed application messages, operations, and
  safe stream events;
- tRPC authorization, idempotency, proposal review, record versioning, and
  SSE reconnect behavior remain application-owned;
- the full Next 16 / React 19 production build, keyboard flow, and narrow
  layout work; and
- no Assistant Cloud, LocalRuntime, generic tool/reasoning renderer, hosted
  history/file store, provider ownership, or new application state authority
  is enabled.

Pin the selected `@assistant-ui/react` release and peer-dependency graph.
Because the package is pre-1.0, production-build and external-store integration
tests are release gates. Prefer its core runtime primitives or selectively
adopted components; do not bootstrap a broad Shadcn redesign merely to obtain
a chat thread.

### 2.2 Fallback: AI Elements as source-owned components

If the assistant-ui spike cannot preserve application ownership without broad
Shadcn or runtime coupling, use the smallest useful subset of
[AI Elements](https://ai-sdk.dev/elements) as copied, source-controlled
React/Tailwind components:

- Conversation and message layout;
- prompt/composer, attachment, submit, and suggestion controls; and
- safe operation/source/reference presentations.

AI Elements does not solve the external-store and operation-state problem on
its own. Do not use its `useChat` transport or add `@ai-sdk/react` unless a
separate application-owned per-turn UI-message endpoint is deliberately
designed and tested. Do not adopt both libraries in the product.

### 2.3 Explicitly rejected

Do not use Stream Chat or another hosted channel service for this product. Its
channel, membership, delivery, and hosted-message model would create a second
conversation authority where BusinessGenerator already owns tenant-scoped
history, approval, evidence, and record versioning.

## 3. Architectural contract

```text
Server route shell
  → persisted ConversationMessage / bounded history query
  → client CofounderThread island
      → CofounderTransport
          → authenticated application command
              → CofounderOperation
                  → DirectAiSdkRuntime or optional Harness runtime
              → persisted explanation / proposal / activity
          ← safe operation and UI-message projection
```

### 3.1 Server remains authoritative

The client must never:

- invent, reconcile, or accept business-record state;
- treat a streamed draft as a saved co-founder result;
- infer proposal acceptance from text;
- store authoritative founder messages only in browser memory; or
- render hidden reasoning, raw tool arguments/results, provider credentials,
  private model tokens, or another operation’s events.

Persist the founder message and operation idempotency record before starting
work. Persist a co-founder response projection only after runtime response
validation. Persist material changes only through `ProposalService` and the
existing founder review command.

### 3.2 Durable co-founder response projection

The current co-founder service stores a `CofounderTurn` in operation recovery
but writes only a `concise_answer` conversation block. That loses the
interaction type, references, uncertainty, proposal, step, and safe operation
metadata after refresh.

Add a versioned, application-owned typed response projection to the persisted
message/block model. It stores only:

- interaction type;
- safe explanation;
- typed record/evidence/decision/step/proposal references;
- uncertainty and blocked-condition labels;
- proposal and step identifiers;
- operation identifier/state; and
- a presentation schema version.

It does not store hidden reasoning, raw model output, prompt text, raw tool
arguments/results, provider credentials, or a client-rendered HTML snapshot.
Historic plain messages remain readable as legacy Inform content; the client
does not infer material semantics from old markdown.

### 3.3 External-store transport adapter

Create a narrow `CofounderTransport` owned by the app, not a generic SDK
default. It should:

1. submit a founder message, optional current step reference, and idempotency
   key to an authenticated command;
2. receive an operation id and subscribe only to its safe lifecycle events;
3. map those events into the assistant-ui external-store presentation state;
4. rehydrate the persisted message/proposal after terminal completion; and
5. preserve unsent text and attachment intent on retryable failure or
   cancellation.

Use a dedicated route only if a UI-message stream is needed by the selected
library. The existing project SSE endpoint remains a generic activity
subscription and must not become a raw model-output stream. Any new endpoint
must enforce session/access-key authentication, project membership, strict
operation filtering, reconnect behavior, and request abort handling.

## 4. Conversation information architecture

### 4.1 Full co-founder destination

`/p/[projectId]/co-founder` remains the full, deep-linkable conversation
surface. It has:

1. a compact current-stage and objective context strip;
2. a current-step help affordance when a step is active;
3. persisted conversation history;
4. one live operation presentation at a time;
5. structured response blocks;
6. a composer with suggestions, attachments, keyboard support, and draft
   recovery; and
7. a clear route to the record, evidence, journey step, or proposal affected by
   a turn.

The shell and initial history remain server-rendered. The thread itself is the
only substantial client island.

### 4.2 Contextual help surface

The wide-screen rail and narrow-screen sheet are secondary entry points, not
competing chat clients. They render the same co-founder thread state through a
shared provider; opening one must not create a separate EventSource,
idempotency key, or conversation store.

The mobile sheet must transfer focus on open, trap it while open, restore it on
close, support Escape, and leave the full route available for longer work.

## 5. Response grammar

Every co-founder response has one primary interaction type and a corresponding
presentation:

| Type | Required presentation | Founder action |
| --- | --- | --- |
| Ask | Plain question, why it matters, suggested response affordances | Supply founder-only context or choose an option. |
| Inform | Short explanation with linked record/evidence context | Continue or inspect the linked state. |
| Recommend | What I found → what I think → recommendation → uncertainty | Accept a direction only through a proposal, or modify/ask why. |
| Generate | Clearly marked draft artifact/material and inputs used | Review, copy, revise, or convert to a proposal when material. |
| Review | Current state, evidence, uncertainties, and focused review target | Inspect one record item, evidence item, or step. |
| Change | Current → proposed, rationale, evidence, uncertainty, and downstream impact | Accept selected changes, modify, or keep current. |

Use a dedicated proposal-review block for material changes; never flatten a
proposal into a markdown bubble or rely on a transient confirm dialog.

## 6. Component plan

### 6.1 Replace/refactor

Replace or substantially refactor:

- `components/conversation/conversation-thread.tsx`;
- `components/conversation/conversation-message-view.tsx`;
- custom chat shell, auto-scroll, composer, suggestion, attachment, and
  operation-status CSS;
- `components/chrome/cofounder-rail.tsx`; and
- obsolete internal blocks in `agent-step-trace.tsx` and legacy
  plan/work/research links.

Keep and adapt:

- server-side conversation queries and message persistence;
- `ChatMarkdown` only if it remains safe, accessible, and compatible with the
  selected message component;
- `InteractionTypeFrame`, `ProposalReview`, `JourneyStageStrip`, and
  provenance/readiness primitives; and
- the project stream only as a safe application event source.

### 6.2 New app-owned components

Add focused components rather than one large client file:

- `CofounderThread` — assistant-ui external-store composition and hydrated
  application message state;
- `CofounderComposer` — text, attachments, suggestions, submit, retry, and
  local draft preservation;
- `CofounderOperationStatus` — queued/running/awaiting-founder/terminal state
  with cancel/retry affordances;
- `CofounderResponseFrame` — the six interaction types and links to the
  durable object;
- `CofounderProposalCard` — a compact entry into the durable proposal review;
- `CofounderReferenceList` — typed links to journey, record, evidence,
  decisions, and proposals; and
- `useCofounderTransport` — the only client bridge to commands and safe
  operation events.

No component may receive an unrestricted `unknown` tool result or a raw
runtime event.

## 7. State and recovery behavior

```text
Draft
  → founder submits
  → message persisted + operation created
  → queued/running status
  → safe structured response or proposal reference
  → terminal completion and persisted-history refresh
```

Failure paths:

- **Validation/provider failure:** keep the text and attachment selections,
  show a recovery action, and do not create a success-looking co-founder
  bubble.
- **Cancellation:** immediately show a canceled status, retain the draft for
  retry, and state that accepted record state is unchanged.
- **Reconnect:** rejoin only the known operation; deduplicate events by
  sequence/operation id; rehydrate terminal result from the server.
- **Duplicate submit:** reuse the same idempotency key and render the original
  operation/result rather than another founder message or proposal.
- **Concurrent record revision:** link to the focused proposal/record conflict
  state rather than overwriting the visible content.

## 8. Accessibility and responsive requirements

The chat redesign must prove:

- readable 16px-or-larger body text, contrast, visible focus, and no
  color-only state;
- keyboard operation for suggestions, attachments, send, cancel, retry, copy,
  reference links, and proposal controls;
- 44×44 CSS-pixel targets for interactive controls;
- correct labels and live announcements for submitted, queued, running,
  awaiting-founder, completed, failed, and canceled states;
- logical focus behavior after submit, error, proposal navigation, sheet open,
  and sheet close;
- no horizontal overflow at 375px, 768px, 1024px, or 1440px;
- reduced-motion behavior for status transitions and scrolling; and
- no hidden-on-hover-only controls for actions a keyboard or touch user needs.

## 9. Acceptance tests

Add browser and component coverage for:

1. opening the full co-founder destination with server-rendered history;
2. reloading a persisted Ask, Inform, Recommend, Generate, Review, and Change
   response without losing its typed presentation;
3. asking a question and seeing a structured Ask response with one next action;
4. reviewing a Change response through the durable proposal surface;
5. canceling a running turn and confirming the accepted record remains
   unchanged;
6. a provider/transport failure that preserves unsent text and allows retry;
7. reconnecting after a dropped stream without duplicate founder/co-founder
   messages;
8. attachment selection and failure recovery without a duplicate evidence item;
9. keyboard-only composer, suggestion, cancel, proposal, and mobile-sheet
   flows; and
10. an axe scan of the co-founder route and the contextual sheet.

The redesign is complete only when every state and action is connected to a
journey objective, evidence/record context, a founder decision, or a next
step. A visually improved text transcript alone does not satisfy this plan.
