# Tech stack and versions

**Status:** implementation baseline
**Date:** 17 August 2026
**Codename used throughout this folder:** `Foundry` (no product name is decided; every package scope, database name, and resource name below is a placeholder using this codename — rename mechanically before launch)
**Audience:** the engineer or coding agent implementing the system described in `plan/00` through `plan/13`.

## 1. How to use this folder

`plan/00`–`plan/13` are the product and system design. This folder (`plan/implementation/`) is the **build specification**: exact libraries, exact versions, exact file layout, exact schemas, exact deployment topology. Where the two disagree, `plan/implementation` wins for *how to build it*, and `plan/00`–`13` win for *what it must do*.

Rules for the implementing agent:

1. Do not substitute a library not listed here without updating this document first.
2. Do not invent a folder that is not in `01-monorepo-and-project-structure.md`.
3. Pin exact versions in lockfiles. The versions below were current as of **August 2026** research; re-verify minor/patch versions at implementation start, but do not change major versions without re-reading `11-decisions-and-open-questions.md`.
4. TypeScript is the only application language. Infrastructure code is also TypeScript (AWS CDK). SQL is used for schema and migrations. No Python, Go, or Java services.

## 2. Runtime and language

| Concern | Decision | Version (Aug 2026) | Why |
|---|---|---|---|
| Language | TypeScript | 5.9.x | Single language across web, mobile, API, workers, and infra reduces context-switching for a coding agent. |
| Backend/worker runtime | Node.js | **24.x (Active LTS, "Krypton")** | Active LTS through Oct 2028 maintenance start; required by AI SDK 7 (Node 22+) and Expo tooling (Node ≥22.13). |
| Package manager | pnpm | 10.x | Workspaces, strict dependency isolation, fastest install/cache behavior for a Turborepo monorepo. |
| Monorepo build tool | Turborepo | 2.x | Task graph caching for `build`/`test`/`lint` across many packages; keeps CI fast and cheap. |
| Module format | ESM only | — | AI SDK 7 requires ESM (`"type": "module"`); do not mix CommonJS. |

Node version is pinned via `.nvmrc` and `engines.node` in every `package.json`. CI and the Docker base image use the same `node:24-bookworm-slim` (amd64) and `node:24-bookworm-slim` (arm64/Graviton) images.

## 3. Web application

| Concern | Decision | Version | Why |
|---|---|---|---|
| Framework | Next.js | 16.3.x | App Router, Server Components, Server Actions, streaming, built-in caching primitives; this is also the framework the AI SDK team optimizes for. |
| UI library | React | 19.2.x | Matches Next.js 16.3 peer requirement and the React version Expo SDK 57 ships, so shared component logic behaves identically on both platforms. |
| Styling | Tailwind CSS | 4.x | Utility-first, fast build (native CSS engine), maps 1:1 to the shared design tokens package and to NativeWind on mobile. |
| Component primitives | Radix UI (`@radix-ui/react-*`) | latest 2.x per-primitive | Unstyled, accessible primitives (dialog, popover, tabs, toast) — avoids re-solving accessibility. |
| Icons | Lucide React | latest | Consistent icon set available for both React and React Native (`lucide-react-native`). |
| Client server-state | tRPC React Query client (`@trpc/tanstack-react-query`) | tRPC 11.x | End-to-end type safety without a separate OpenAPI layer; built on TanStack Query 5.x for caching/retries. |
| Client local UI state | Zustand | 5.x | Minimal, avoids Redux boilerplate; used only for ephemeral UI state (panel open/closed, active tab), never for server data. |
| Forms | React Hook Form + Zod resolver | RHF 7.x, Zod 4.x | Type-safe forms validated with the same Zod schemas used by the API layer. |
| Charts | Visx or Recharts | latest | Used by artifact previews (market-size, unit-economics, sensitivity charts) inside the web app; server-rendered chart images use the same data through the artifact renderer (see `07-artifacts-and-tool-catalog.md`). |
| Spreadsheet bytes | Hand-written OOXML (no ExcelJS) | — | Milestone 6 generates the market/economics workbook from validated calculator specs (`plan/07` §5). Formulas are written as Excel formulas; values are never invented by a model. |
| Document PDF | Hand-written PDF 1.4 in `@foundry/artifacts` | — | Milestone 7 pack/brief/slide exports. Avoids shipping Chromium (or `pdf-lib`) on Fargate; layout is text-first Markdown/HTML with a simple PDF companion. |

## 4. Mobile application

| Concern | Decision | Version | Why |
|---|---|---|---|
| Framework | Expo (managed workflow) | SDK 57 | Fastest path to iOS + Android from one TypeScript codebase; EAS Build/Submit removes the need for local Xcode/Android Studio release pipelines. |
| Native runtime | React Native | 0.86.x | Version pinned by Expo SDK 57. |
| UI library | React | 19.2.3 | Matches Expo SDK 57's bundled React version exactly (must not drift from web's 19.2.x line). |
| Navigation | Expo Router | **57.x** (bundled with SDK 57) | File-based routing consistent with Next.js App Router mental model. SDK 57 versions the router with the SDK (`expo-router@57.0.x`) rather than the older 5.x line. |
| Styling | NativeWind | **4.2.6** | Tailwind classes on React Native views; shares the same design tokens as the web Tailwind config. NativeWind 5.0 was still preview as of August 2026, so 4.2.x is the pinned stable line until 5.0 is `latest`. |
| Local storage / secrets | `expo-secure-store` | bundled with SDK 57 | Stores mobile refresh tokens; backed by Keychain (iOS) / Keystore (Android). |
| Push notifications | Expo Notifications | bundled with SDK 57 | Used for approval requests, sprint completion, and digest notifications (`08-security...` / product notification policy). |
| Minimum Node for tooling | Node 22.13+ | satisfied by Node 24 | Expo CLI requirement; repo already standardizes on Node 24. |

## 5. Shared API and validation layer

| Concern | Decision | Version | Why |
|---|---|---|---|
| Internal API protocol | tRPC | 11.x | Web and mobile are both TypeScript clients we control; tRPC gives end-to-end type inference with zero code generation, which minimizes ambiguity for a coding agent. See `05-api-and-backend-architecture.md` for the boundary where we switch to REST. |
| External/webhook API | Plain REST route handlers (Next.js Route Handlers) | — | Used only for things that are not TypeScript-native callers: OAuth callbacks, payment/webhook receivers, signed-URL callbacks, health checks. |
| Schema validation | Zod | 4.x | Single validation library for tRPC input/output, environment variables, tool schemas, and form validation. |
| DB-row-to-domain bridge | Hand-written Zod schemas in `@foundry/domain` | 4.x | Since there is no ORM schema to generate from, each repository function parses the raw SQL row through the domain package's own Zod schema (the same schema tRPC uses for API output) — one schema per aggregate, written once, shared by API and database layers. |

## 6. AI / agent layer

| Concern | Decision | Version | Why |
|---|---|---|---|
| Model SDK | Vercel AI SDK (`ai`) | 7.0.x (7.0.66 at research time) | Provider-agnostic streaming, tool calling, structured output, and agent-loop primitives; this is the mandated model interaction layer per `plan/05`. |
| Anthropic provider | `@ai-sdk/anthropic` | matches `ai` 7.x line | Direct Anthropic connection family. |
| OpenAI provider | `@ai-sdk/openai` | matches `ai` 7.x line | Direct OpenAI connection family. |
| Bedrock provider | `@ai-sdk/amazon-bedrock` | matches `ai` 7.x line | AWS-governed inference; also reuses the same IAM role the ECS tasks already run under. |
| Managed routing | `@ai-sdk/gateway` (Vercel AI Gateway) | matches `ai` 7.x line | Optional managed routing/fallback/model catalog connection family. |
| OpenAI-compatible / local | `@ai-sdk/openai-compatible` | matches `ai` 7.x line | Used for Ollama, LM Studio, and vLLM endpoints (BYO local model, per `plan/05` §5). |
| Structured output | AI SDK `generateObject`/`streamObject` + Zod schemas | bundled | Deterministic, versioned output schemas per agent contract. |
| Code-mode sandbox | AI SDK code-mode tool + `quickjs-emscripten` runtime | AI SDK 7.x code-mode API; `quickjs-emscripten` latest 0.x | Matches the boundary in `plan/05` §7: isolated JS/TS execution, server-only, no network/file/db access from generated code. |
| Embeddings | Provider-native embedding models via AI SDK `embed`/`embedMany` | — | No separate embeddings SDK; routed through the same provider abstraction and model-profile system. |
| MCP client | `@ai-sdk/mcp` (`createMCPClient`) | matches `ai` 7.x line | Connects to user-added Model Context Protocol servers (§9 below, `08-agent-runtime-implementation.md` §11) and adapts their tools into ordinary AI SDK `tool()` definitions so they flow through the same tool registry and policy engine as built-in tools. |

Node.js 22+ and ESM are hard requirements of AI SDK 7 — already satisfied by the platform choice above.

## 6a. User-added MCP servers

| Concern | Decision | Version | Why |
|---|---|---|---|
| Transport | Streamable HTTP (`transport: { type: 'http', url, headers }`); SSE as a fallback for older servers | MCP spec 2025-06-18 or later | The only two transports that make sense for a remote, user-supplied server reachable from an ECS task; `stdio` is local-process-only and not applicable here. |
| Scope | Per-user, not per-workspace | — | Matches the product decision to keep MCP "user level" for now: a server one founder adds is available only to that founder's own runs, never automatically shared with teammates. See `08-agent-runtime-implementation.md` §11 and `09-authentication-and-security.md` §7a. |
| Storage | `user_mcp_servers` table (`06-database-schema.md` §9) | — | URL, transport type, and an encrypted bearer/API-key header, keyed by `user_id`; reuses the same envelope-encryption mechanism already used for BYOK provider keys (`09-authentication-and-security.md` §6). |
| Trust boundary | Untrusted by default | — | An MCP server is arbitrary third-party (or self-hosted) code the platform does not control. Every tool it exposes is classified `side_effect` and routed through the same `ApprovalRequest` flow as a built-in write tool, regardless of what the MCP server's own tool metadata claims. |

## 7. Data and storage

| Concern | Decision | Version | Why |
|---|---|---|---|
| Primary database | PostgreSQL on Amazon RDS | PostgreSQL 17.x | Newest RDS-supported major version at research time; supports `pgvector` 0.8.2 and `pg_trgm`/full-text search natively. Single relational source of truth per `plan/01`. |
| Vector search | `pgvector` extension | 0.8.2 (RDS-supported) | Avoids standing up a separate vector database for the first 1–2 years of scale; HNSW index support included since 0.8.0. |
| Query layer | **Plain SQL — no ORM** | — | Explicit product decision: hand-written SQL over an ORM's abstraction. All queries are written as SQL strings executed through `postgres.js`'s tagged templates; there is no schema-as-code layer and no query builder. See `06-database-schema.md` §1 for the exact repository pattern this implies. |
| DB driver | `postgres` (postgres.js) | 3.x | Fast, pure-JS Postgres driver built around tagged-template SQL, which parameterizes every query automatically (immune to SQL injection by construction) and needs no separate query-builder dependency on top of it. |
| DB migration runner | `node-pg-migrate` | 7.x | Runs plain, hand-written `.sql` up/down migration files against Postgres and tracks applied migrations in a `pgmigrations` table — a migration tool with no schema-definition language of its own, matching the "just SQL" decision. Uses `pg` (node-postgres) internally at migration time only; the running application never depends on `pg`, only `postgres.js`. |
| Runtime row validation | Zod (already in the stack, §5) | 4.x | Every repository function parses the raw row(s) returned by `postgres.js` through the matching `@foundry/domain` Zod schema before returning a domain entity — this is what replaces an ORM's compile-time mapping with an explicit runtime guarantee that "what the code assumes is what the database actually returned." |
| Object storage | Amazon S3 | — | Source files, generated artifacts, exports. Signed PUT/GET URLs only; the app server never proxies large file bytes. |
| Cache / queue backend | Amazon ElastiCache **Serverless for Valkey** | Valkey 8.x (ElastiCache Serverless) | Cheapest managed Redis-protocol option (33% lower than Redis OSS pricing, 100 MB storage floor vs. 1 GB); used for BullMQ queues, pub/sub streaming fan-out, rate limiting, and short-lived caches. See `07-caching-queues-and-streaming.md`. |
| Background jobs | BullMQ | 5.x | Redis-backed, Node-native, mature, MIT-licensed; the default choice for Node.js background work when Redis is already required for streaming fan-out (avoids paying for a second job platform). |
| Full-text search | PostgreSQL `tsvector`/`pg_trgm` | built-in | Sufficient for first-release retrieval quality; do not add Elasticsearch/OpenSearch until `plan/09` evaluation data justifies it (cost discipline). |

## 8. Authentication

| Concern | Decision | Version | Why |
|---|---|---|---|
| Auth framework | Better Auth (`better-auth`) | 1.5.x | Framework-agnostic, TypeScript-native auth library with first-party Next.js, Google OAuth, API-key, and Expo plugins — covers every login path this app needs (§below) without us hand-rolling session/token logic. Owns its own internal schema/adapter (Kysely + `pg`), which is separate from — and does not reintroduce — the app's own no-ORM decision in §7: we never write Better Auth's internal queries, only call its documented API. |
| DB adapter | Better Auth's built-in `pg.Pool` (Kysely) adapter | matches Better Auth 1.5.x | Points at the same RDS Postgres instance and database as the app; Better Auth owns and migrates its own tables (`user`, `session`, `account`, `verification`, `apikey`) via its own CLI, kept as reviewed plain-SQL migration files per `06-database-schema.md` §2. Requires the `pg` package as a small, isolated dependency used only inside `lib/auth.ts` — the rest of the app never imports it. |
| Social provider | Google OAuth (`socialProviders.google`) | — | The only social login for real founder accounts in v1, per product decision. |
| Admin/test login | `@better-auth/api-key` plugin, `enableSessionForAPIKeys: true` | matches Better Auth 1.5.x | Lets a small, explicitly flagged set of admin/test accounts sign in with a static key (`x-api-key` header) instead of Google OAuth, for internal use and early testing before every founder-facing flow is wired up. Never offered on the public sign-in screen. See `09-authentication-and-security.md` §2a. |
| Mobile auth | `@better-auth/expo` server plugin + `expoClient` (`@better-auth/expo/client`) | matches Better Auth 1.5.x | First-party Expo integration: handles the OAuth browser round-trip, stores session cookies in `expo-secure-store`, and talks to the *same* Better Auth server routes the web app uses — no bespoke mobile access/refresh-token system to design, build, or audit. |
| Session strategy | Better Auth DB sessions with short-lived cookie cache | default | A session row per login, refreshed on activity, with a signed 5-minute cookie cache so most requests skip the DB round trip; simpler and better-audited than a hand-rolled JWT scheme, and it is what Better Auth is built and tested against. |
| Password hashing | Not used | — | No email/password credential provider in v1 — Google OAuth for founders, API keys for admin/test accounts. Removes an entire class of credential-handling risk. |
| MFA (later) | Better Auth's built-in `twoFactor` plugin | matches Better Auth 1.5.x | Deferred to the phase in `plan/10` where account-takeover risk increases (billing, payments); already framework-native so it is a config addition, not a new subsystem. |

## 9. Infrastructure, deployment, and CI/CD

| Concern | Decision | Version | Why |
|---|---|---|---|
| Compute | AWS ECS on **Fargate** (standard, not Express Mode) | — | The user's explicit target. AWS App Runner stops accepting new customers 30 Apr 2026 and AWS itself now points new workloads at ECS. Standard Fargate (not Express Mode) gives full control over networking/scaling and qualifies for Compute Savings Plans. |
| CPU architecture | ARM64 (AWS Graviton) | — | ~20% cheaper per vCPU-hour than x86 Fargate with equal or better performance for Node.js workloads; both `web` and `worker` build multi-arch or arm64-only images. |
| Container registry | Amazon ECR | — | Private registry, lifecycle-policy image cleanup, native IAM integration with ECS task execution roles. |
| Load balancing | Application Load Balancer (ALB) | — | Standard front door for the `web` ECS service; health checks, TLS termination via ACM. |
| CDN (from day one, minimal config) | Amazon CloudFront in front of the ALB | — | Caches static Next.js assets and serves TLS at the edge; deferring this later is more expensive to retrofit than configuring it up front. |
| Infrastructure as code | AWS CDK (TypeScript) | 2.x (latest) | AWS-only workload; TypeScript keeps the entire repository (app + infra) in one language, which materially reduces ambiguity for a coding agent. L2/L3 constructs (`ApplicationLoadBalancedFargateService`) remove hundreds of lines of boilerplate versus Terraform HCL. |
| CI/CD | GitHub Actions | — | Build → test → build Docker image → push to ECR → `cdk deploy` (or ECS rolling deployment) via OIDC-federated AWS role (no long-lived AWS keys stored in GitHub). |
| Secrets at runtime | AWS Secrets Manager + SSM Parameter Store | — | Provider API keys, DB credentials, `BETTER_AUTH_SECRET`, Google OAuth client secret; injected into ECS tasks as `secrets` (not `environment`) so they never appear in task definitions or logs. |

## 10. Testing

| Concern | Decision | Version | Why |
|---|---|---|---|
| Web/shared unit + component tests | Vitest + `@testing-library/react` | Vitest 4.x | Native ESM/TypeScript, ~4x faster than Jest, Vite-native browser mode for component tests; community and Next.js docs converged on this for 2026 greenfield projects. |
| Web E2E | Playwright | latest 1.5x | The only reliable way to test async Server Components and full auth/streaming flows — Vitest/Jest cannot render async RSCs. |
| Mobile unit tests | Jest + `@testing-library/react-native` for RN components; Vitest for pure `lib/` modules | Jest via `jest-expo` 57.x when component tests are added; Vitest 4.x for CI unit tests of header/auth helpers | Expo/React Native component tooling still assumes Jest; Milestone 7 ships Vitest for the non-RN `lib/` surface so `turbo test` stays Node-only. |
| Mobile E2E | Maestro | latest | YAML-based mobile flow testing, works against Expo/EAS builds without the Xcode/Gradle overhead of Detox. |
| API/integration tests | Vitest + a disposable Postgres/Redis via Docker Compose (CI service containers) | — | Cheapest reliable way to test raw SQL repository functions and tRPC procedures against a real database in CI, no paid test-DB service required. |
| Type checking | `tsc --noEmit` per package | TS 5.9.x | Run in CI as a dedicated Turborepo task; type errors fail the build before tests run. |
| Linting/formatting | ESLint 9 (flat config) + `@typescript-eslint` + Prettier | latest | See `13-coding-standards-and-conventions.md` for the exact ruleset. |

## 11. Observability

| Concern | Decision | Version | Why |
|---|---|---|---|
| Instrumentation | OpenTelemetry SDK (`@opentelemetry/*`) in every service | latest stable | Vendor-neutral from day one; switching backends later is a collector config change, not a code change. |
| Logs (MVP) | `awslogs` driver → CloudWatch Logs, JSON structured logs via `pino` | `pino` 9.x | No sidecar cost at MVP scale; strict retention policy keeps cost low (see `12-observability-and-cost-management.md`). |
| Metrics/traces (MVP) | CloudWatch Container Insights + OTel traces exported to AWS X-Ray | — | Zero extra infrastructure; upgrade path to a Grafana/Tempo/Prometheus stack (via an Alloy sidecar) is a config change once volume justifies the cost. |
| Error tracking | Sentry (or self-hosted GlitchTip if budget is tight) | latest SDK | Cheap, fast to wire into Next.js/Node/Expo; captures both client and server exceptions with source maps. |

## 12. Version-pinning policy

- Every `package.json` in the monorepo pins **exact** versions for direct dependencies used by more than one package (React, Next.js, AI SDK, Better Auth, Zod, tRPC) — no `^` ranges for these, to keep every workspace in lockstep.
- Renovate (or Dependabot) opens grouped upgrade PRs monthly; upgrades land through the normal CI gate, never as a manual `npm install <pkg>@latest` mid-feature.
- Re-run the research in §1–§11 before starting implementation if more than 60 days have passed since this document's date, since the AI SDK and Next.js both ship frequently.
