# V5.2 — Interview and source import workflow

## 1. Objective

Let founders capture interviews manually or import a file containing multiple
interviews while preserving the difference between:

- a user-supplied source;
- a model’s extraction;
- a founder-confirmed interview record; and
- evidence derived from an accepted interview.

The import feature accelerates structured entry. It does not let AI invent
participants, consent, quotes, or validation.

## 2. Manual workflow remains first-class

Keep and extend the manual interview capture route. A founder must be able to
create an interview, set participant classification, record consent, set date
and source attribution, enter quotes/notes, correct content, and remove or
supersede it without AI.

Use the same command schemas for individual manual creation and batch-accepted
import candidates. UI labels must make clear that a founder assertion or a
friend/family interview is stored but does not become independent evidence.

## 3. Import state machine

Introduce durable source-import records, candidates, and review decisions:

```text
uploaded source
  → text extracted / normalized
  → classification: interview bundle | single interview | other
  → candidate extraction
  → founder review and correction
  → accept selected candidates | reject | retry with instruction
  → durable interviews, quotes, source links, and activity event
```

An import candidate contains:

- source ID and immutable snapshot/hash;
- proposed participant type, label, date, consent status, notes, and quote
  boundaries;
- source offsets or excerpt IDs for every extracted field;
- extraction model/runtime version and safe confidence category;
- founder edits and per-candidate decision;
- validation errors and duplicate-match candidates.

No candidate is an `Interview` until accepted. Consent defaults to
`unknown/unconfirmed`, never `true`, when it cannot be demonstrated by the
uploaded source.

## 4. Extraction boundary

The extraction runtime gets a bounded normalized text representation and returns
a strict `InterviewImportCandidate[]` schema. It may call
`evidence.createDraft@1`; it cannot invoke the final `addInterview` command.

For accepted candidates, application code—not model prose—performs:

- permission check;
- duplicate detection and explicit merge/keep-both choice;
- consent validation;
- quote length/count limits and content normalization;
- source snapshot and excerpt relationship creation;
- per-candidate idempotency;
- all-or-selected transaction behavior;
- activity/audit records.

Failed parse, malformed extraction, unsafe content, virus scan failure, or
cancellation leaves the source available and produces no interview rows.

## 5. UX requirements

The evidence surface needs:

1. **Upload and intent** — “Import interview notes” alongside generic evidence
   upload; explain accepted formats and that no data is saved as interviews yet.
2. **Extraction review** — one candidate per interview, with side-by-side
   source excerpts, field provenance, consent warning, and editable quotes.
3. **Batch decision** — accept selected, reject selected, or keep as source
   only; no all-or-nothing pressure.
4. **Result** — count created, skipped, duplicate, and needs-attention records,
   then deep links to those interviews and their original source.

No review screen can present a model confidence percentage as evidence quality.
Show precise reasons: missing consent, ambiguous participant type, duplicated
quote, or unsupported extraction.

## 6. Acceptance criteria

- A manually entered interview and an accepted imported interview use the same
  domain command and durable entity shape.
- A source with three interviews can yield three independently editable,
  independently accepted/rejected candidates.
- Every accepted quote links to its original source snapshot/excerpt.
- The app never defaults inferred consent to true.
- Duplicate retries cannot create repeated interviews or quotes.
- An upload can remain in the evidence library without being imported.
- RLS, source ownership, deletion/retention, virus scanning, MIME/size limits,
  and sensitive-data redaction are covered by integration tests.
