# V5.0 — Command parity and capability contracts

## 1. Objective

Make the app’s supported founder workflows explicit and usable independently of
AI, then allow the co-founder to invoke a smaller, typed subset through the
same application-owned command layer.

This phase does not add autonomous writes. It eliminates the current mismatch
where the capability manifest advertises actions that are disabled, placeholders,
or separately reimplemented in the worker.

## 2. Prerequisite: founder-complete and AI-optional composition

Before enabling a matching capability, make the corresponding founder path
complete:

- add a founder-facing business-record section editor with the same
  expected-version, provenance, staleness, activity, and acceptance rules as
  proposal review;
- ensure founder-authored note, assumption, and decision changes create an
  accepted record version rather than patching an item outside the version
  model;
- write record-to-evidence, interview, decision, proposal, and source
  relationships through the existing relation model, so the record can explain
  what supports or contradicts each item;
- make interview capture preserve the user-selected participant type and
  consent instead of applying a fixed value in a contextual journey path; and
- treat legacy `projects.current_phase` strictly as a compatibility projection
  from the authoritative journey, never as a competing stage writer;
- make co-founder configuration optional at application boot. With AI disabled
  or unavailable, Overview, Journey, Model, Evidence, Decisions, imports, and
  exports must still start and operate normally.

Restore a direct runtime implementation behind the portable
`CofounderRuntime` interface before treating Harness as a production
requirement. The selected runtime is an optional execution dependency; neither
the web application nor a worker startup may require a Harness token to deliver
the manual product.

## 3. One command surface, two callers

For every durable domain action, define:

```text
command name + Zod input/output + policy permission + expected version
+ idempotency key + provenance rule + audit/activity event + UI route
```

Founder UI calls the command directly. A co-founder capability calls the same
command through a constrained adapter that adds operation scope, capability
policy, and a founder-visible result.

The co-founder must never call repositories, tRPC route handlers, or service
internals as tools.

### Required inventory

Create a maintained capability matrix covering at least:

| Domain action | Manual UI/command | Co-founder mode | V5 rule |
| --- | --- | --- | --- |
| Read journey, record, proposals, evidence | Existing read models | Read only | Return bounded, referenceable results |
| Create observation, interview, quote | Explicit capture command | Extraction draft only | Founder confirms provenance and consent |
| Create evidence item | Explicit capture command | Evidence draft | Citation/source snapshot required |
| Record decision or assumption | Explicit record command | Proposal/draft | Material changes need proposal review |
| Create/modify journey step | Explicit journey command | Suggested step or proposal | Never advance automatically |
| Prepare an experiment, guide, or artifact | Explicit draft command | Draft | Link to accepted record version |
| Calculate economics | Explicit calculator command | Deterministic tool | Input/output schema and units required |
| Research external sources | Approved source adapter | Read + evidence draft | Citation-preserving only |

If a manual command or UI route does not exist, the corresponding co-founder
capability cannot ship as a shortcut.

Step recommendations are also application data: a runtime-suggested step is
validated, persisted as a founder-visible recommendation/activity item, and
linked to the Journey route. It cannot silently alter a stage, mark a step
complete, or disappear after a message is rendered.

## 4. CapabilityGateway completion

Replace the loose manifest with a typed registry. Each capability definition
must provide:

- stable `name@version`;
- Zod request and response schemas;
- allowed runtime kinds and operation execution mode;
- actor/workspace/project/operation scope;
- policy permission, risk class, timeout, spend/token limit, and cancellation
  behavior;
- idempotency semantics;
- source/provenance requirements;
- activity/audit outcome classification; and
- a safe, founder-visible success or recovery message.

Start with exactly these capabilities:

1. `venture.readCurrentState@1`
2. `evidence.searchApproved@1`
3. `business.calculate@1`
4. `material.prepareDraft@1`
5. `evidence.createDraft@1`
6. `proposal.createDraft@1`

Do not expose `artifact.createDraft` until an application-owned artifact draft
command and review UI exist. Do not expose any generic action or broad
“founder.write” capability.

## 5. Remove duplicated worker policy

The current worker must stop independently implementing proposal persistence and
its own narrow context/capability behavior. It should adapt the shared
`ContextService` and `CapabilityGateway` through host-neutral ports:

```text
worker operation
  → ContextService.buildPacket
  → CofounderRuntime
  → RuntimeCapabilityPort
  → CapabilityGateway
  → owning domain service / command
```

This gives inline and worker execution identical authorization, validation,
audit, citation, idempotency, and acceptance behavior.

## 6. Acceptance criteria

- Every enabled co-founder capability has a working, founder-accessible
  application command and review surface.
- A capability call and equivalent manual action produce the same durable
  shape, audit event class, and provenance rules.
- Disabled, placeholder, and duplicate worker-only capability paths are
  removed rather than advertised.
- A role that cannot perform a manual action cannot cause it through a
  co-founder operation.
- Repeated worker attempts return the original draft/proposal/import result.
- Tests cover schema rejection, authorization, cancellation, idempotency,
  expected-version conflict, and safe event reduction per capability.
- The app’s manual routes and commands remain usable with no model credentials,
  Harness URL, or Harness token present.
