# Implementation plan — Foundry

**Status:** implementation baseline
**Date:** 17 August 2026
**Scope:** the concrete build specification for the system designed in `plan/00`–`plan/13` — libraries and exact versions, monorepo layout, web and mobile architecture, API and database design, caching/queues/streaming, agent runtime wiring, authentication and security, AWS ECS deployment, testing, observability/cost, coding standards, and build sequencing.
**Codename:** every package scope, database name, and AWS resource name in this folder uses the placeholder `Foundry` (no product name has been decided — see `00-tech-stack-and-versions.md` §1 and `01-monorepo-and-project-structure.md` §10 for the exact rename surface).

## How this folder relates to `plan/`

`plan/00` through `plan/13` are the **product and system design** — what the app must do and why. This folder is the **build specification** — exactly how to build it, in enough detail that an implementing engineer or coding agent should not need to make an unrecorded architectural judgment call. Every document below cites the specific `plan/` section it implements; when in doubt about product behavior, the parent `plan/` documents are authoritative, and this folder should be updated to match rather than silently diverging.

## Document map

| Document | Purpose |
|---|---|
| [00-tech-stack-and-versions.md](00-tech-stack-and-versions.md) | Every library and its pinned version, researched against the current (August 2026) ecosystem, with the reasoning for each choice |
| [01-monorepo-and-project-structure.md](01-monorepo-and-project-structure.md) | Full repository file tree: apps, packages, infra, and the dependency-direction rules between them |
| [02-web-frontend-architecture.md](02-web-frontend-architecture.md) | Next.js rendering model, routes, screen-to-API mapping, component layering, state management |
| [03-mobile-frontend-architecture.md](03-mobile-frontend-architecture.md) | Expo/React Native navigation, auth, streaming, offline behavior, and parity rules with web |
| [04-shared-packages-and-design-system.md](04-shared-packages-and-design-system.md) | `@foundry/domain`, `@foundry/api-contracts`, design tokens, and the other shared packages web and mobile both depend on |
| [05-api-and-backend-architecture.md](05-api-and-backend-architecture.md) | tRPC vs. REST boundary, the full procedure catalogue, service-class contract, file upload flow, error vocabulary |
| [06-database-schema.md](06-database-schema.md) | PostgreSQL 17 schema (DDL) for every aggregate in `plan/03`, written as plain hand-maintained SQL — no ORM — plus indexing and the migration workflow |
| [07-caching-queues-and-streaming.md](07-caching-queues-and-streaming.md) | Redis/Valkey topology, BullMQ queues, SSE streaming architecture, rate limiting, idempotency |
| [08-agent-runtime-implementation.md](08-agent-runtime-implementation.md) | AI SDK provider wiring, model profiles, agent definitions, orchestrator/critic/sprint runner classes, code-mode sandbox, tool registry integration, and the user-level MCP server bridge |
| [09-authentication-and-security.md](09-authentication-and-security.md) | Better Auth (Google OAuth + admin/test API-key sign-in, shared with mobile via `@better-auth/expo`), authorization model, tenant isolation/RLS, secret management, prompt-injection and file-safety controls, and the MCP trust boundary |
| [10-aws-infrastructure-and-deployment.md](10-aws-infrastructure-and-deployment.md) | AWS CDK stacks, ECS Fargate topology, networking, CI/CD pipeline, migrations-on-deploy, and a baseline cost estimate |
| [11-testing-strategy.md](11-testing-strategy.md) | Unit/integration/E2E/agent-eval/load testing layers, tools, and CI gating |
| [12-observability-and-cost-management.md](12-observability-and-cost-management.md) | OpenTelemetry instrumentation, the CloudWatch-first MVP observability stack and its deferred Grafana upgrade path, alarms, and cost-control practices |
| [13-coding-standards-and-conventions.md](13-coding-standards-and-conventions.md) | Naming, TypeScript strictness, enforced architectural boundaries, comment policy, concrete numeric limits, and the PR "definition of done" |
| [14-implementation-checklist-and-sequencing.md](14-implementation-checklist-and-sequencing.md) | The ordered build milestones that stand up this technical foundation underneath `plan/10`'s product delivery phases |

## Recommended reading order

1. `00` (stack) and `01` (structure) together — these fix the vocabulary every later document uses.
2. `06` (database) and `05` (API) — the data and contract layer everything else calls into.
3. `02`/`03`/`04` (web, mobile, shared packages) as a set.
4. `07` (caching/queues/streaming) and `08` (agent runtime) together — these are the most novel/product-specific technical layers.
5. `09` (security) and `10` (AWS deployment) — the operational boundary.
6. `11` (testing) and `12` (observability/cost) — how correctness and cost are verified continuously.
7. `13` (coding standards) as a standing reference, and `14` (sequencing) before writing the first line of application code.

## Non-negotiable constraints carried from the product design

- No provider secret, BYOK credential, or session token ever reaches a client or a log line (`plan/05`, enforced in `09-authentication-and-security.md`).
- The domain layer — not the AI SDK, not a chat transcript, not a model provider — remains the system of record (`plan/01`, enforced throughout `05`–`08`).
- Every mutation of a versioned aggregate carries the pack/contract/payload version it was based on and is rejected if stale (`plan/01` §7, enforced in `05-api-and-backend-architecture.md` §3 and `06-database-schema.md`).
- Side-effecting tools always route through approval policy; code mode never gains direct access to a side-effecting tool (`plan/05` §7, `plan/02` §7, enforced in `08-agent-runtime-implementation.md` §7–8).
- A user-added MCP server is always treated as untrusted third-party code: every tool it exposes is forced to `side_effect` risk class regardless of its own metadata, is scoped to the user who added it (never the whole workspace), and is checked against an SSRF hostname guard before any connection is made (`08-agent-runtime-implementation.md` §11, `09-authentication-and-security.md` §7a).
- The system is deployed to AWS ECS (Fargate) and is built to be cost-effective by default — every infrastructure choice in `10` and `12` defers avoidable fixed cost until a pre-specified trigger is hit, rather than provisioning for hypothetical future scale up front.
