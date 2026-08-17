# Security, privacy, and governance

## 1. Trust model

The system handles:

- private business ideas;
- interview transcripts and personal data;
- provider credentials;
- financial assumptions;
- uploaded documents;
- customer lists and contact details;
- draft outbound communication;
- possible payment and compliance workflows.

Assume that:

- user input can be malicious or accidental;
- uploaded files can contain prompt injection;
- fetched web pages are untrusted;
- agent outputs can be wrong;
- tools can have side effects;
- providers can fail or retain data according to their own terms;
- a compromised integration token can affect an external system.

Security must be enforced by services and policies, not only by prompts.

## 2. Tenant isolation

Every request and persisted object must resolve:

- user;
- workspace;
- project;
- role;
- data scope;
- connection scope.

Enforce authorization in the API and domain service. Do not rely on a client-provided project ID without checking membership.

Search indexes, embeddings, caches, traces, object storage keys, and generated exports must carry tenant scope. Cross-project retrieval is forbidden by default.

## 3. Roles and permissions

Recommended roles:

| Role | Typical permissions |
|---|---|
| Owner | Full project control, provider and budget settings, approvals, deletion, export |
| Founder editor | Edit founder inputs, run drafts, review artifacts, cannot change workspace ownership |
| Collaborator | Project-scoped work and comments, limited run budget |
| Reviewer | Read/comment on selected pack sections, no side effects |
| Professional reviewer | Explicitly invited, can annotate legal/finance sections, not treated as legal authority automatically |
| Support operator | Operational support metadata only; content access requires audited break-glass access |

Separate:

- reading an object;
- proposing a change;
- accepting a pack change;
- running a tool;
- approving a side effect;
- changing policy;
- exporting or sharing.

## 4. Secret management

Provider keys, OAuth tokens, webhook secrets, and signing keys must:

- be encrypted at rest;
- be redacted from logs and traces;
- be unavailable to model context;
- be scoped to a workspace/project where possible;
- support rotation and revocation;
- have last-used and last-validated metadata;
- be deleted or tombstoned according to retention policy.

The browser and mobile app should receive only a connection status and safe display label.

## 5. Prompt-injection defense

Treat these as untrusted content:

- web pages;
- uploaded documents;
- email bodies;
- calendar descriptions;
- CRM notes;
- MCP tool results;
- generated code;
- third-party API fields.

Protection layers:

1. Label untrusted content in the context builder.
2. Keep instructions and data in separate message sections.
3. Do not let retrieved content redefine tool policy or system role.
4. Allowlist tools per sprint.
5. Validate tool inputs in domain services.
6. Require approval for side effects.
7. Run adversarial fixtures through every parser and retrieval path.
8. Record the source of every instruction-like string that reached a model.

Prompt injection is not solved by adding a warning sentence to a system prompt.

## 6. File and parser safety

- Scan uploads for malware.
- Limit file size, page count, decompression ratio, and parsing time.
- Reject dangerous archive nesting.
- Render office documents in isolated workers.
- Do not execute macros, embedded scripts, or external links by default.
- Sanitize HTML before preview.
- Prevent server-side request forgery during URL fetch.
- Restrict outbound domains and follow redirect policy.
- Store source hashes and parser versions.
- Treat OCR and extraction as untrusted proposals.

## 7. Code and sandbox safety

Generated code must run in a separate, constrained execution environment.

Minimum controls:

- no host filesystem access;
- no secrets;
- no unrestricted network;
- no database credentials;
- CPU, memory, time, output, and source-size limits;
- maximum tool calls;
- immutable working inputs;
- result size limits;
- process termination;
- complete audit record.

Code mode may call only approved data tools. It must never be a shortcut around approval or domain validation.

## 8. Approval governance

Use a policy table with `auto`, `approve`, and `forbid`.

| Action | Default |
|---|---|
| Read pack, retrieve, calculate, draft | Auto within scope |
| Create a source snapshot | Auto, with source policy |
| Record founder input | Auto after user submission |
| Change MoneyRules after accepted artifacts exist | Approve |
| Publish a landing page or custom domain | Approve |
| Send email, WhatsApp, or outreach | Approve |
| Charge money, issue refund, or create live payment request | Approve |
| Change a live price | Approve |
| Invite external collaborator | Approve |
| Government or regulatory filing | Forbid automation; prepare a human-review packet |
| Unsupervised customer call or impersonation | Forbid |
| Process children’s sensitive data without a reviewed policy | Forbid |
| Bulk scraping or bypassing access control | Forbid |
| Delete evidence referenced by an accepted decision | Approve and mark dependents |

Approvals must show the exact action, destination, payload summary, risk, data involved, expiry, and rollback/retry behavior.

## 9. India-aware privacy and compliance posture

The product should provide India-aware checklists, not legal opinions.

Plan for:

- purpose-limited collection;
- consent and notice records where applicable;
- access, correction, deletion, and retention handling;
- sensitive-data minimization;
- processor/subprocessor inventory;
- breach and incident process;
- GST, entity, IP, contract, and DPDP review handoffs.

The app should label legal outputs as:

- informational;
- source-backed checklist;
- draft for professional review;
- human-confirmed;
- expired or requires re-check.

Do not claim that the app filed a form, created a compliant entity, or provided legal/tax advice.

## 10. Data classification

Use a small classification scheme:

| Class | Examples | Default routing |
|---|---|---|
| Public | Published web sources, public company descriptions | Managed or BYOK |
| Project private | Founder idea, strategy, assumptions, drafts | Workspace policy |
| Personal | Interview transcript, contact details, voice note | Restricted providers and retention |
| Sensitive | Financial data, credentials, regulated/health data | Private/BYOK or blocked |
| Restricted action data | Payment, government, live customer communication | Approval-only and minimal retention |

Classification should be attached to documents, evidence, tool calls, model runs, and artifacts.

## 11. Retention and deletion

Workspace owners need controls for:

- retention duration;
- source deletion;
- transcript deletion;
- generated-artifact deletion;
- trace redaction;
- provider history policy;
- export before deletion;
- account and workspace deletion.

Deletion must propagate to indexes, caches, embeddings, exports, and derived artifacts where legally and technically possible. Audit records can preserve that a deletion occurred without preserving deleted content.

## 12. Auditability

Audit events should answer:

- who acted;
- on which project;
- using which agent, model, tool, and version;
- with which pack/source revision;
- what was proposed;
- what was accepted;
- what approval was given;
- what data left the trust boundary;
- how much it cost;
- what failed.

Audit logs are not a replacement for user-readable decisions. The product should provide both a simple activity view and a detailed audit export.

## 13. Incident response

Required controls:

- revoke provider and integration connections;
- disable a tool or model profile globally;
- pause all active sprints for a workspace;
- quarantine a source or parser version;
- invalidate signed upload/download links;
- notify affected owners;
- preserve forensic metadata without exposing secrets;
- re-run affected artifacts after remediation.

## 14. Security acceptance criteria

Before public launch:

- cross-tenant access tests pass;
- secrets do not appear in logs, traces, prompts, or exports;
- malicious document and web fixtures do not alter tool policy;
- side-effect tools cannot run without policy and approval;
- stale pack writes are rejected;
- deletion removes searchable content;
- provider fallback is visible and policy-controlled;
- code-mode execution cannot reach host secrets or databases;
- all critical tool calls are auditable.
