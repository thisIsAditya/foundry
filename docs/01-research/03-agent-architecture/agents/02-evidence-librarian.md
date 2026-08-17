# Evidence Librarian

## Job

Own truth:

- Interview quotes with speaker (pseudonym), date, consent flag
- Source URLs with fetch date and hash
- Assumption IDs and state transitions
- Provenance enum on numbers
- Dedup (“this TAM was overwritten”)

LaunchPad-v2’s ladder is the schema. vancoder1’s zero-shot ban is the policy for **market facts**.

## Tools

DB; web fetch stored as **untrusted** blobs (injection fence).

## Failure modes

- Letting the generator overwrite a verified number with a prettier one.
- Storing personal data without a purpose and deletion path (DPDP).
