# Co-founder chat delta

**Implements:** feedback item 1; decisions D2, D3. Extends `components/conversation/conversation-thread.tsx`, `conversation-message-view.tsx`, and `use-project-stream.ts` in place — same components, no rewrite (`00-README.md` rule 1).

## 1. Composer redesign

`ConversationThread`'s `<form>` (currently a single `.textarea` + Send button + static topic chips) becomes a Cursor/Claude-style composer:

- Multi-line auto-growing text area (reused `.textarea` styling, new auto-resize behavior only).
- Attachment control identical in mechanism to the venture composer's (`04` §2) — `evidence.createUploadIntent`/`confirmUpload`, now scoped to the existing project. Attached evidence IDs ride on `conversation.send` as a new optional `attachmentIds` field (§4); rendered as removable chips above the text area before send, and as a small file-reference chip inside the sent message after.
- The effort preset (D3) — a compact three-way segmented control (Quick / Standard / Thorough), defaulting to Standard, persisted per-project in the same Zustand store `use-project-stream.ts` already keeps (so it doesn't reset every navigation, but is explicitly not persisted server-side as a preference — it's a per-turn dial, not a `FounderPreference`).
- The static `TOPIC_CHIPS` array is reused unchanged — item 5 asks to remove *redundant* UI, not helpful shortcuts; these chips fill the input, they don't duplicate information shown elsewhere.

## 2. Tool-call step trace (D2)

New `components/conversation/agent-step-trace.tsx`. While a co-founder turn is in flight, `use-project-stream.ts`'s existing `events` array (already collecting every `StreamEvent` for the project, just not rendered — `apps/web/lib/stream/use-project-stream.ts` lines 27–43) is filtered client-side by `runId` (present on every relevant event type) into an ordered step list:

| Event | Step rendering |
|---|---|
| `message_started` | "Thinking" (spinner) |
| `tool_planned` | Collapsed row: tool name + one-line description from `tool.input`'s shape (best-effort label, not raw JSON) |
| `tool_started` → `tool_progress` → `tool_completed` | The same row transitions through pending/running/done states; expandable to show `result` summarized (not raw-dumped — see §3) |
| `evidence_found` | A distinct row ("Found N sources") linking into the Research drawer once the turn completes |
| `job_state_changed` / `founder_task_created` / `score_changed` | Terminal rows appended after the tool rows, since these represent the turn's *output*, not an intermediate step |
| `message_completed` | Collapses the whole trace into a single "Worked for Ns · N tools" summary row, expandable on click — this is the resting state once a turn is done, matching Cursor/Claude's "collapsed by default, expand to inspect" pattern from item 1 |

This is new client-side derivation only — no new `StreamEvent` variant, no backend change. `ConversationMessageView`'s existing `BlockCard` switch (`conversation-message-view.tsx`) is untouched; `AgentStepTrace` renders *above* a message's blocks while that message's turn is still in flight (keyed by `runId`, correlated to the message once `conversation_message_appended` arrives for it), and is discarded (not persisted) once the message is fully rendered from `conversation.list` on the next load — the durable record of what happened is still the `ConversationMessage`/`ConversationBlock` structure and the `AgentRun`/`ToolCall` rows already persisted by the agent runtime, not a duplicate transcript (`00-README.md` rule 6's "one source of truth" applied to UI state).

## 3. Labeling tool calls without a raw-JSON dump

`tool.input`/`result` are `z.unknown()` in `ToolCallSchema` (`packages/domain/src/entities/tool-call.ts`) — deliberately generic since tools vary. `AgentStepTrace` uses a small `describeToolCall(toolDefinitionId, input)` lookup (new, in the same file) keyed by the known `ToolDefinitionId`s the agent runtime already registers, each mapping to a short template ("Searching the web for…", "Reading a source…", "Checking pricing math…"). Any `toolDefinitionId` without a template falls back to a generic "Running a step…" label — this keeps the trace legible without requiring every future tool addition to also touch the frontend, while covering the common cases explicitly.

## 4. Backend: additive fields on `conversation.send`

`SendConversationInputSchema` (`packages/api-contracts/src/commands/cofounder.ts`) gains:

```ts
effort: z.enum(['quick', 'standard', 'thorough']).default('standard'),
attachmentIds: z.array(EvidenceItemIdSchema).max(5).optional(),
```

Full wiring (how `effort` bounds the coordinator run, how `attachmentIds` reach context assembly) is in `09-backend-and-trpc-delta.md` §2–§3. `ConversationThread`'s mutation call passes both; `sourceId` (existing, currently unused by the UI) is unaffected.

## 5. What is not being rebuilt

`ConversationMessageView`'s ten `ConversationBlock` kinds keep their exact rendering (`conversation-message-view.tsx` is unchanged beyond receiving the wider 40%-rail layout) — item 1's "tool calls visible" is additive *above* these cards during a turn, not a replacement for the structured-card system that already enforces "material work shows up as cards, not only chat text" (`implementation-v2/06` §3). `useProjectStream`'s SSE subscription mechanism, `conversation.list`/`conversation.send` procedures, and the idempotency-key retry pattern in `ConversationThread`'s `onSubmit` are all reused verbatim.
