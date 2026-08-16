# Implementation checklist and sequencing

`plan/10-delivery-roadmap.md` sequences the **product**. This document sequences the **build** — the concrete, ordered engineering steps to stand up the technical foundation so Phase 0 through Phase 5 of the product roadmap can be implemented on top of it without backtracking. Treat each numbered milestone as a checklist a coding agent can execute top to bottom.

## Milestone 0 — repository scaffolding

- [ ] Initialize the pnpm + Turborepo monorepo exactly as specified in `01-monorepo-and-project-structure.md`.
- [ ] Add `packages/config` first (tsconfig base, ESLint flat config, Vitest base config, Tailwind shared scale) — every other package depends on it existing.
- [ ] Add `packages/domain` (empty entity/value-object skeletons matching `plan/03` §2–4, with Zod schemas) — nothing else can be typed correctly without it.
- [ ] Add `.env.example`, `docker-compose.yml` (Postgres 17 + `vector`/`pg_trgm` init script, Valkey), `.nvmrc` (`24`).
- [ ] Add root `turbo.json` with `build`/`dev`/`lint`/`typecheck`/`test` pipelines and correct `dependsOn` ordering.
- [ ] Verify: `pnpm install && pnpm turbo run lint typecheck` succeeds on an empty scaffold before writing any feature code.

## Milestone 1 — database and persistence foundation

- [ ] Add `packages/db`: `postgres.js` connection factory, `node-pg-migrate` config, and the identity/collaboration tables from `06-database-schema.md` §3.
- [ ] Run `npx @better-auth/cli generate` against the Better Auth config from `09-authentication-and-security.md` §3 to produce the one-time `sessions`/`accounts`/`verifications`/`api_keys` migration; hand-review it, then commit it as `packages/db/migrations/0001_better_auth.sql` alongside the hand-written `users`/`workspaces`/etc. migration from the previous step; run both against the local Docker Postgres.
- [ ] Add the RLS policy pattern from `09-authentication-and-security.md` §6 for the first tenant-scoped table (`workspaces`/`projects`) and a test proving isolation (`11-testing-strategy.md` §3).
- [ ] Add the remaining table groups from `06-database-schema.md` §4–8 incrementally, **in the order the product phases need them** (journey/pack tables before Milestone 4's Phase 1 work; sprint/execution tables before Milestone 5's Phase 1 orchestrator work; artifact tables before Milestone 7's Phase 3 work) — do not create every table in one giant migration.

## Milestone 2 — auth and API skeleton

- [ ] Add `apps/web` (Next.js 16 app shell, no feature screens yet) per `02-web-frontend-architecture.md` §1–2.
- [ ] Wire Better Auth (`lib/auth.ts` with the `pg.Pool` adapter, Google OAuth, `apiKey` plugin, `expo` plugin; `middleware.ts` on the Node.js runtime) per `09-authentication-and-security.md` §1–4. Seed one `admin`-role test account and confirm the `POST /api/auth/verify-access-key` → `x-api-key` round trip works before touching Google OAuth.
- [ ] Wire the tRPC skeleton (`server/trpc.ts`, `context.ts`, `middleware/auth.ts`, an empty `routers/_app.ts`) per `05-api-and-backend-architecture.md` §2, §4.
- [ ] Add `workspace.create`, `workspace.list`, `project.create`, `project.list` — the smallest possible vertical slice that proves auth + tRPC + raw SQL repositories + RLS all work together end to end.
- [ ] Add `packages/api-contracts` and confirm `AppRouter`'s type flows into a throwaway client call with full inference.
- [ ] Write the API contract tests for these four procedures (`11-testing-strategy.md` §4) before adding any more procedures — this is the template every later procedure copies.

## Milestone 3 — infrastructure baseline (parallelizable with Milestone 2)

- [ ] Add `infra/cdk` with `NetworkStack` and `DataStack` for the `dev` environment only.
- [ ] Deploy `dev`'s RDS + ElastiCache Serverless; point local development's `.env` at them once available (or keep using Docker Compose locally and reserve AWS `dev` for CI/shared testing — either is acceptable, document the team's choice in `plan/11-decisions-and-open-questions.md`).
- [ ] Add `EcrStack`, `CiStack` (GitHub OIDC role), and a minimal `ci.yml` that builds and typechecks on every PR.
- [ ] Add `docker/web.Dockerfile` and confirm it builds and runs the Milestone 2 skeleton locally (`docker build && docker run`) before wiring ECS.
- [ ] Add `EcsStack` for `dev` and a `deploy-dev.yml` that deploys the Milestone 2 skeleton to a real ALB URL. **Getting a "hello world" tRPC call working end-to-end on real ECS Fargate before building any product feature is the single most important risk-reduction step in this plan.**

## Milestone 4 — evidence and document intelligence foundation

Unblocks Phase 1 (validation studio).

- [ ] Add `apps/worker` skeleton (health server, BullMQ connection, no queues yet) and its `EcsStack` service + `worker.Dockerfile`.
- [ ] Add the `ingestion` queue (`07-caching-queues-and-streaming.md` §2) with a trivial no-op processor, deployed and provably consuming a job end to end.
- [ ] Add `evidence.createUploadIntent`/`confirmUpload` (S3 presigned URLs, `05-api-and-backend-architecture.md` §7) and the `sources`/`source_snapshots`/`documents`/`content_blocks` tables.
- [ ] Add `packages/document-intelligence`'s parser pipeline for plain text and PDF first (per `plan/04-document-intelligence.md`), with the malware-scan and MIME-sniff steps from `09-authentication-and-security.md` §9 — do not skip these to "add security later."
- [ ] Add full-text (`tsvector`) retrieval before vector retrieval — it is simpler, has no embedding-model dependency, and unblocks citation-checking tools sooner.

## Milestone 5 — agent runtime foundation

Unblocks Phase 0's "basic conversational turn" and Phase 1's orchestrator.

- [ ] Add `packages/agent-runtime`'s provider registry (`08-agent-runtime-implementation.md` §2) for exactly one provider family first (Anthropic direct is the simplest to validate end to end), then add the others.
- [ ] Add `provider.connect`/`listConnections` and the `provider_connections` table, including the capability-probe validation call.
- [ ] Add the orchestrator agent definition and a single-turn interactive call path (`08-agent-runtime-implementation.md` §10) wired to `project.answerClarification`.
- [ ] Add the SSE streaming endpoint and the `StreamEvent` normalizer (`07-caching-queues-and-streaming.md` §4, `08-agent-runtime-implementation.md` §6) — verify a full round trip: client opens the stream, orchestrator streams `text_delta` events, client renders them.
- [ ] Add the `sprint` queue and `SprintRunner` skeleton (contract → single mock worker → synthesis, no critic yet) to prove the BullMQ-driven agent execution path before adding the full agent roster.
- [ ] Add the critic runtime and Gate A evaluation (`plan/02` §4 Stage 5–6) — this is what makes Phase 1's exit criteria ("Gate A cannot pass on simulated interviews") enforceable.
- [ ] Add the `user_mcp_servers` table, the `mcpServer` router, and the `mcp-bridge` (`08-agent-runtime-implementation.md` §11) — implement and test against a local test MCP server fixture before exposing the "add MCP server" screen to founders, since this is the one path in the system that connects to an arbitrary user-supplied URL.

## Milestone 6 — money, calculators, and Gate B

Unblocks Phase 2.

- [ ] Add `money_rules`, `market_models`, and the deterministic calculator tools (`plan/07` §7 "Calculation tools") as plain TypeScript functions first, then wrap them as AI SDK tools — the calculators must be independently unit-testable without any model in the loop (`11-testing-strategy.md` §2).
- [ ] Add the Business Model Analyst and Pricing/Unit-Economics Analyst agent definitions.
- [ ] Add the WTP event log and Gate B evaluation.
- [ ] Add spreadsheet artifact generation for the market/economics workbook (`plan/07` §5) — this is the first artifact type; get the artifact dependency graph (`plan/07` §6) working here before adding every other artifact type in Milestone 7.

## Milestone 7 — artifacts, exports, and company pack

Unblocks Phase 3.

- [ ] Add the `render` queue and `packages/artifacts`' pipeline (`plan/07` §3) for Markdown/HTML/PDF first (per `plan/07` §3's own recommendation), then slides/spreadsheets for other artifact types.
- [ ] Add `artifact.generate`/`export` and the stale-dependency invalidation logic (`plan/03` §6, `plan/07` §6).
- [ ] Add pack export (JSON + manifest, `plan/07` §11).
- [ ] Add `apps/mobile` in parallel with this milestone (not before) — by this point the API surface is stable enough that the mobile client is mostly a presentation-layer exercise (`03-mobile-frontend-architecture.md`), rather than co-evolving with a moving API.

## Milestone 8 — MVBP/GTM and launch runtime

Unblocks Phases 4–5. By this point the technical foundation (auth, API, database, agent runtime, artifacts, mobile) is complete; remaining work is primarily new agent definitions, new tools, new approval-gated integrations, and new screens — no new infrastructure category should be needed. If one seems needed, stop and update `01-monorepo-and-project-structure.md` and this document before proceeding (per `13-coding-standards-and-conventions.md` §6).

## Cross-cutting work that runs continuously, not as a milestone

- Security checklist items (`09-authentication-and-security.md` §12) apply from Milestone 2 onward, not as a pre-launch afterthought.
- Observability instrumentation (`12-observability-and-cost-management.md` §1) is added to `apps/web` and `apps/worker` in Milestone 2 and Milestone 4 respectively — every subsequent milestone inherits it for free rather than retrofitting it.
- Testing per `11-testing-strategy.md` is written alongside each milestone's code, in the same PR, not batched at the end.
- Re-check `00-tech-stack-and-versions.md`'s pinned versions at the start of each milestone if significant time has passed since the previous milestone shipped.

## Explicit non-goals for the initial build

Matching `plan/00-product-brief.md`'s non-goals and `plan/10-delivery-roadmap.md`'s "do not build a generic agent platform first": do not build a plugin marketplace, a general-purpose chatbot mode unrelated to the founder journey, a multi-region active-active deployment, or a custom workflow-engine abstraction layer over BullMQ. Every one of these is a plausible-sounding "foundational" investment that this plan deliberately defers because it does not unblock any near-term product phase.
