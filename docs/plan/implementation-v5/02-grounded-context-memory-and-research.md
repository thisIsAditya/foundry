# V5.1 — Grounded context, memory, and research

## 1. Objective

Give the co-founder enough relevant, app-owned context to provide useful
fact-based help without treating the model’s session or a full conversation
transcript as durable memory.

Every factual statement supplied to the founder must resolve to a stored
record, approved source snapshot, or explicit uncertainty. Research results
become reviewable evidence drafts, never truth merely because a model fetched
them.

## 2. Canonical context envelope

Replace divergent inline and worker packets with a single versioned
`CofounderContextEnvelope`. Build it deterministically for every operation.

### Required layers, in precedence order

1. requesting actor, project, permission scope, operation intent, and
   capability budget;
2. current journey stage, objective, active/deferred/blocked steps, and pending
   proposals;
3. accepted record items plus their version, status, provenance, and staleness;
4. relevant evidence items, source snapshots, interview IDs, quotes, decisions,
   assumptions, experiments, and record relationships;
5. a bounded, maintained project memory summary plus a selected recent-message
   window;
6. retrieval results selected for the request, with citation IDs and
   freshness/authority metadata;
7. explicit omissions, selection rationale, and context-size accounting.

The envelope never carries database credentials, session cookies, raw
object-store data, unbounded transcripts, hidden reasoning, or cross-project
records. Raw documents are retrieved only by a source-aware operation and only
when their approved excerpt is necessary.

Every reference a runtime returns must be validated against an ID that was
included in the envelope or returned by a scoped capability during the same
operation. Unknown, unauthorized, stale, or cross-project IDs invalidate the
claim rather than being displayed as a citation.

## 3. Project memory

Add app-owned, versioned memory artifacts; do not reuse Harness persistence.

Memory may contain only compact, attributable summaries such as:

- founder goals, constraints, and preferences the founder has approved for
  reuse;
- accepted decisions and their rationale;
- unresolved questions, assumptions, contradictions, and known blocks;
- active experiment framing and latest verified learning;
- conversation summaries anchored to a source message range and record version.

Each memory entry needs author/source type, source references, generated-at
time, superseded-at time, access scope, and staleness rules. The founder can
inspect, correct, and delete it. A summary is always a derived aid, not the
record of truth.

## 4. Citation-preserving research

Implement an application-owned research provider interface, not unrestricted
browser access inside Harness:

```text
research request
  → query policy and budget
  → approved provider adapter
  → fetch and source snapshot
  → extract quote/excerpt with URL, publisher, timestamp, and retrieval time
  → evidence draft with claim-to-citation mapping
  → founder review / accept / reject
```

Source snapshots must preserve the excerpt used by the model, canonical URL,
publisher/domain, retrieval timestamp, content hash, and any applicable
license/robots outcome. A missing, stale, inaccessible, or contradictory
source cannot support an asserted fact.

The co-founder response contract must split:

- `facts`: each with one or more valid references;
- `interpretation`: the model’s reasoned conclusion;
- `assumptions` and `uncertainty`;
- `recommendation`; and
- a `draft` or `proposal` when a persisted change is suggested.

Rendering should show evidence near the conclusion, with progressive disclosure
for excerpts and methodology. It must not imply that web research validates
customer demand, willingness to pay, legal compliance, or business outcomes.

## 5. Acceptance criteria

- Inline and worker calls serialize the same context envelope for the same
  project state and intent.
- The system can explain why an included record/source was selected and why an
  available one was omitted.
- Context from one workspace/project is never selectable in another.
- A co-founder factual claim without valid stored references is downgraded to
  interpretation or rejected before display.
- Research returns no result rather than invented citations when the provider
  cannot substantiate a claim.
- Founder-visible memory is inspectable, editable/deletable, source-linked, and
  regenerated only through auditable application commands.
