# Implementation v5 — App-native co-founder plan

**Status:** proposed implementation plan  
**Date:** 22 August 2026  
**Depends on:** the V4 founder-journey baseline and its application-owned
business record, policy, and proposal model.

## 1. The target relationship

BusinessGenerator is a self-sufficient founder workspace. A founder can
manually create, edit, review, connect, defer, and export all durable business
state without running an AI model.

The co-founder is not a second product, a privileged database client, or the
authority on the venture. It is a **permissioned workflow client** of the same
application commands and read models the founder uses:

```text
Founder UI ────────────────┐
                             ├─ application commands and query models
Cofounder capability tools ─┘        │
                                      ├─ policy and workspace scope
                                      ├─ versioning and provenance
                                      ├─ approval and idempotency
                                      └─ audit and activity history
```

The distinction is deliberate:

| Action class | Founder | Co-founder |
| --- | --- | --- |
| Read venture state and approved evidence | Direct, authorized | Bounded, authorized, cited |
| Enter founder observations | Direct | Prepare a draft for founder review |
| Transform an uploaded source | Review extraction candidates | Extract into reviewable candidates |
| Change material record or journey state | Explicit command with version check | Create a proposal; never apply it |
| Send, publish, purchase, file, or otherwise act externally | Explicit future product policy only | Not available |

“Like the founder” means the co-founder uses the app’s public domain
vocabulary and obeys the same validation, not that it receives founder-equivalent
authority. A model cannot attest that an interview occurred, give consent for a
participant, or silently convert an unverified claim into accepted evidence.

## 2. Current-state assessment

V4 already establishes the right authority boundary:

- `JourneyService`, record items, proposal versions, workspace policy, and
  activity events are app-owned.
- The core web product supports manual journey, evidence, interview capture,
  decision review, and export without depending on chat.
- `CofounderRuntime` receives a validated context packet and returns a
  structured response; it cannot write accepted state directly.
- Operations are durable and cancellation/idempotency protections exist.
- Harness is isolated from the app process and does not receive database,
  session, object-store, or ambient app credentials.

However, V4 currently implements a **bounded structured responder with a narrow
proposal bridge**, not the fully tool-using, research-grounded workflow client
described above:

1. the worker composes a thinner context than `ContextService`; it omits
   proposal, active-step, readiness, and conversation context;
2. the Harness prompt explicitly says it has no tools, and the worker exposes
   only `venture.readCurrentState` and `proposal.createDraft` in practice;
3. the richer gateway manifest is partly declarative: approved evidence search
   is disabled, and several draft capabilities return a placeholder result;
4. conversation context is eight recent messages with no durable,
   source-linked summary or explicit project-memory policy;
5. document ingestion can produce searchable content blocks, but there is no
   interview-bundle schema, extraction review, batch acceptance, or provenance
   link from a source to created interviews and quotes; and
6. research cannot yet produce citation-preserving evidence claims through an
   approved source adapter.
7. the business-record model view has no founder-facing section editor, so a
   founder cannot yet complete every structured record workflow without a
   proposal or an internal API path; and
8. web and worker composition currently require Harness URL/token configuration
   and select Harness as the only runtime, so “AI disabled” is not yet a
   first-class deployment mode.

V5 closes these gaps without moving business authority into Harness or
reintroducing an agent roster, generic automation system, unrestricted browser,
filesystem, database, MCP, or external-write tools.

## 3. Delivery order

Read and implement this folder in order:

1. [Command parity and capability contracts](01-command-parity-and-capability-contracts.md)
2. [Grounded context, memory, and research](02-grounded-context-memory-and-research.md)
3. [Interview and source import workflow](03-interview-and-source-import.md)
4. [Runtime tool bridge, UX, and release gates](04-runtime-tool-bridge-ux-and-release.md)

```text
V5.0  Establish command inventory, capability policy, and app/UI parity
  ↓
V5.1  Ship one canonical context/memory envelope and cited retrieval
  ↓
V5.2  Ship reviewable interview-bundle imports and source-to-record provenance
  ↓
V5.3  Enable a small tool loop through the app-owned gateway
  ↓
V5.4  Measure grounded guidance, review quality, and safe failure recovery
```

Each stage must leave the founder workflow fully usable with the co-founder
disabled. Feature flags choose a runtime or capability path; they never hide
the manual command that owns durable state.

## 4. V5 exit criteria

V5 is complete only when an authorized founder can:

1. perform every supported journey, record, evidence, interview, and proposal
   workflow directly in the app;
2. upload a multi-interview file, inspect independently extracted interview
   candidates and quotes, correct them, then accept some, all, or none;
3. ask the co-founder to inspect scoped current state, relevant history, and
   approved evidence, with every factual claim linked to a source or explicitly
   labelled as an assumption or interpretation;
4. ask the co-founder to research through approved providers and receive
   citation-preserving evidence drafts rather than unsupported prose;
5. see the co-founder prepare the same reviewable drafts and proposals exposed
   by the UI, while no model or retry can silently accept a material change; and
6. recover safely from provider failure, citation failure, malformed extraction,
   duplicate import, cancellation, stale state, and rejected proposals.
