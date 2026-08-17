# Monorepo and project structure

## 1. Repository shape

Single pnpm + Turborepo monorepo. Three deployable apps, one infra app, and a set of shared packages that encode the boundaries from `plan/13-contracts-and-boundaries.md`.

```
foundry/
├── apps/
│   ├── web/                # Next.js 16 app (founder desk, API/BFF, tRPC host, Better Auth)
│   ├── mobile/              # Expo SDK 57 app (React Native client)
│   └── worker/               # Node long-running worker service (sprints, ingestion, rendering, notifications)
├── infra/
│   └── cdk/                # AWS CDK app (ECS, RDS, ElastiCache, S3, CloudFront, CI role)
├── packages/
│   ├── domain/              # Shared domain types, value objects, status vocab, zod schemas (plan/03, plan/13 §3)
│   ├── db/                  # Plain-SQL migrations, postgres.js client factory, repository modules (plan/06 of this folder)
│   ├── api-contracts/       # tRPC router *type* exports + REST contract types shared by clients
│   ├── ui/                  # Cross-platform design tokens + web (Radix/Tailwind) primitives
│   ├── ui-native/            # Mobile-only component primitives (NativeWind) sharing tokens from `ui`
│   ├── agent-runtime/         # Agent definitions, orchestrator, AI SDK wiring (plan/02, plan/05)
│   ├── tools/                # Tool registry + tool implementations (plan/07 §7)
│   ├── document-intelligence/ # Parsers, extraction, retrieval (plan/04)
│   ├── artifacts/             # Artifact templates + renderers (plan/07 §1-6)
│   ├── policy/                # Approval/gate/budget/permission policy engine (plan/02 §6-8, plan/08)
│   ├── observability/         # Shared OTel setup, logger factory, error taxonomy
│   └── config/                 # Shared tsconfig, eslint config, tailwind preset, vitest config
├── scripts/                   # One-off maintenance scripts (seed db, generate types, rotate secrets locally)
├── .github/workflows/          # CI/CD pipelines
├── docker/                     # Dockerfiles for web/worker, docker-compose for local dev
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json
└── .nvmrc
```

The `apps/`, `infra/`, and `packages/` subtrees above are expanded fully in §2–§6.

## 2. `apps/web`

```
apps/web/
├── app/
│   ├── (marketing)/                # Public, unauthenticated pages (landing, pricing, legal)
│   │   └── page.tsx
│   ├── (app)/                      # Authenticated app shell, behind middleware auth check
│   │   ├── layout.tsx               # Workspace/project shell, nav, notification bell
│   │   ├── page.tsx                 # Redirect to last active project or workspace picker
│   │   ├── w/[workspaceId]/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx             # Workspace dashboard: project list
│   │   │   └── settings/            # Workspace settings: members, providers, budgets, policies
│   │   └── p/[projectId]/
│   │       ├── layout.tsx           # Project shell: phase header, next-action banner
│   │       ├── page.tsx             # Founder Desk (see plan/06-web-and-mobile-experience.md)
│   │       ├── sprint/[sprintId]/page.tsx
│   │       ├── pack/[section]/page.tsx
│   │       ├── evidence/page.tsx
│   │       ├── artifacts/[artifactId]/page.tsx
│   │       ├── approvals/page.tsx
│   │       └── decisions/page.tsx
│   ├── api/
│   │   ├── trpc/[trpc]/route.ts     # tRPC fetch adapter (web cookie + mobile bearer)
│   │   ├── auth/[...all]/route.ts   # Better Auth catch-all handler (web + mobile/Expo + Google OAuth + api-key)
│   │   ├── stream/[projectId]/route.ts   # SSE endpoint, see 07-caching-queues-and-streaming.md
│   │   ├── uploads/intent/route.ts # Signed S3 PUT URL issuance
│   │   ├── webhooks/[provider]/route.ts  # Payment/OAuth/provider webhooks (REST, not tRPC)
│   │   └── health/route.ts
│   └── middleware.ts                # Better Auth session check, Node.js middleware runtime (`export const config = { runtime: 'nodejs' }`), route protection
├── components/                      # Web-only composite components (import from packages/ui for primitives)
├── lib/
│   ├── trpc/
│   │   ├── client.ts                # Browser tRPC + TanStack Query client
│   │   ├── server.ts                # RSC-side tRPC caller
│   │   └── context.ts               # tRPC context builder (auth, db, services)
│   ├── auth.ts                      # Better Auth server config: `pg.Pool` adapter, Google OAuth, `apiKey` plugin, `expo` plugin
│   └── env.ts                       # Typed/validated environment access (zod-parsed at boot)
├── public/
├── next.config.ts
├── tailwind.config.ts
├── Dockerfile -> ../../docker/web.Dockerfile (symlinked reference; real file lives in /docker)
└── package.json
```

`apps/web` hosts the tRPC router, Better Auth, and all read/write API surface. It does **not** run BullMQ workers, code-mode sandboxes, or document parsers in the request path — those are invoked by enqueuing a job that `apps/worker` picks up.

## 3. `apps/mobile`

```
apps/mobile/
├── app/                             # Expo Router file-based routes
│   ├── (auth)/
│   │   └── sign-in.tsx              # Google OAuth + "use an access key instead" (admin/test)
│   ├── (app)/
│   │   ├── _layout.tsx              # Tab navigator: Desk, Evidence, Approvals, Pack, More
│   │   ├── desk.tsx
│   │   ├── evidence.tsx
│   │   ├── approvals.tsx
│   │   ├── pack/[section].tsx
│   │   ├── sprint/[sprintId].tsx
│   │   └── artifact/[artifactId].tsx
│   └── _layout.tsx                  # Root layout: providers (tRPC, auth, theme)
├── components/
├── lib/
│   ├── trpc.ts                      # Mobile tRPC client (Bearer token link)
│   ├── auth.ts                      # Better Auth Expo client (`@better-auth/expo/client`) wired to `expo-secure-store`
│   └── push.ts                      # Expo push token registration
├── app.config.ts                    # Expo config (bundle IDs, permissions, EAS project ID)
├── eas.json                         # EAS Build/Submit profiles (dev, preview, production)
└── package.json
```

## 4. `apps/worker`

```
apps/worker/
├── src/
│   ├── main.ts                      # Boots BullMQ workers + OTel + health server
│   ├── queues/
│   │   ├── sprint.worker.ts         # Runs conference sprints (packages/agent-runtime)
│   │   ├── ingestion.worker.ts      # Document ingestion pipeline (packages/document-intelligence)
│   │   ├── render.worker.ts         # Artifact rendering (packages/artifacts)
│   │   └── notification.worker.ts  # Email/push/digest delivery
│   ├── health.ts                    # `/healthz` and `/readyz` HTTP endpoints for ECS health checks
│   └── shutdown.ts                  # Graceful drain on SIGTERM (see 07-caching-queues-and-streaming.md §6)
├── Dockerfile -> ../../docker/worker.Dockerfile
└── package.json
```

`apps/worker` is a plain Node process (no HTTP framework beyond a tiny health server). It is the only place BullMQ job processors, the code-mode sandbox, and long-running document parsing run.

## 5. `infra/cdk`

```
infra/cdk/
├── bin/
│   └── foundry.ts                  # CDK app entrypoint; instantiates stacks per environment
├── lib/
│   ├── network-stack.ts            # VPC, subnets, security groups, VPC endpoints
│   ├── data-stack.ts               # RDS Postgres, ElastiCache Serverless, S3 buckets
│   ├── ecr-stack.ts                # ECR repositories (web, worker)
│   ├── ecs-stack.ts                # ECS cluster, ALB, CloudFront, web + worker Fargate services
│   ├── ci-stack.ts                 # GitHub OIDC provider + deploy role
│   └── observability-stack.ts      # Log groups, retention, alarms, dashboards
├── config/
│   ├── dev.ts
│   ├── staging.ts
│   └── production.ts
├── cdk.json
└── package.json
```

See `10-aws-infrastructure-and-deployment.md` for what each stack provisions.

## 6. `packages/*`

| Package | Exports | Consumers |
|---|---|---|
| `@foundry/domain` | Entities, value objects, status enums, Zod schemas for domain objects (mirrors `plan/03` §2–4) | every app and package |
| `@foundry/db` | Plain `.sql` migration files, `node-pg-migrate` config, `postgres.js` client factory, one repository module per aggregate | `apps/web`, `apps/worker`, `packages/policy` |
| `@foundry/api-contracts` | tRPC `AppRouter` type export, REST DTO types, stream event types (mirrors `plan/13` §5) | `apps/web` (implements), `apps/mobile` (consumes types only) |
| `@foundry/ui` | Design tokens, Tailwind preset, Radix-based web components | `apps/web` |
| `@foundry/ui-native` | Same tokens, NativeWind/React Native components | `apps/mobile` |
| `@foundry/agent-runtime` | `Orchestrator`, `AgentDefinition` registry, `SprintRunner`, AI SDK provider factory, user-level MCP client bridge (`08-agent-runtime-implementation.md` §11) | `apps/worker` (executes), `apps/web` (interactive single-turn calls only) |
| `@foundry/tools` | Tool registry, per-tool Zod schemas, tool executors, MCP-tool adapter used by the agent-runtime bridge | `@foundry/agent-runtime` |
| `@foundry/document-intelligence` | Parsers, extractors, indexers, retrieval query builder | `apps/worker`, `@foundry/agent-runtime` |
| `@foundry/artifacts` | Artifact templates, render pipeline, dependency graph | `apps/worker` |
| `@foundry/policy` | Gate evaluation, approval policy, budget policy, permission checks | `apps/web`, `apps/worker`, `@foundry/agent-runtime` |
| `@foundry/observability` | OTel bootstrap, `pino` logger factory, error classes | every app |
| `@foundry/config` | `tsconfig.base.json` extension points, ESLint flat config, Tailwind preset, Vitest base config | every package (dev dependency only) |

## 7. Dependency direction rules

These rules are enforced by ESLint's `import/no-restricted-paths` (see `13-coding-standards-and-conventions.md`) so a coding agent cannot accidentally violate the architecture:

1. `packages/domain` imports nothing else in the monorepo. It has zero knowledge of `postgres.js`, tRPC, AI SDK, or React.
2. `packages/db` may import `packages/domain` only.
3. `packages/agent-runtime`, `packages/tools`, `packages/document-intelligence`, `packages/artifacts` may import `packages/domain` and `packages/policy`, and may call `packages/db` **only through a service class**, never with raw queries scattered across the package.
4. `apps/web` and `apps/mobile` never import `packages/db`, `packages/agent-runtime`, `packages/tools`, or any provider SDK directly. They import `packages/api-contracts` (types only) and call the network.
5. `apps/worker` is the only app allowed to import `packages/agent-runtime`, `packages/tools`, and `packages/document-intelligence` directly, alongside `packages/db`.
6. `infra/cdk` imports nothing from `apps/*` or `packages/*` except shared constants (e.g., port numbers, queue names) from a tiny `packages/config` export — infra code must never import application logic.

## 8. Environments

| Environment | Purpose | AWS account/region strategy |
|---|---|---|
| `local` | Docker Compose Postgres + Valkey; `.env.local` with test provider keys | No AWS dependency required for day-to-day feature work |
| `dev` | Shared integration environment, auto-deployed on merge to `main` | Single low-cost AWS account/region, `db.t4g.micro`, single Fargate task per service |
| `staging` | Pre-production, deployed on release-branch tag | Mirrors production topology at smaller scale, used for load/security testing |
| `production` | Live environment | Multi-AZ RDS, ECS service auto-scaling 2–6 tasks, CloudFront + WAF |

Environment-specific values live in `infra/cdk/config/*.ts` as typed objects — never as ad hoc conditionals scattered through stack code.

## 9. Root configuration files

| File | Purpose |
|---|---|
| `pnpm-workspace.yaml` | Declares `apps/*`, `packages/*`, `infra/cdk` as workspaces |
| `turbo.json` | Task graph: `build`, `dev`, `lint`, `typecheck`, `test`, `test:e2e`, with correct `dependsOn` so `packages/domain` builds before anything that imports it |
| `tsconfig.base.json` | Strict compiler options shared by every package (see `13-coding-standards-and-conventions.md` §2) |
| `.env.example` | Every environment variable the system uses, with comments, no real values |
| `docker-compose.yml` | Local Postgres 17 + pgvector, Valkey, and a Mailpit instance for local email testing |

## 10. Naming conventions for this codename

- npm scope: `@foundry/*`
- Database name: `foundry`
- S3 buckets: `foundry-<env>-uploads`, `foundry-<env>-artifacts`
- ECR repositories: `foundry-web`, `foundry-worker`
- ECS cluster: `foundry-<env>`
- Domain (placeholder): `app.foundry.example`

Rename all of the above in one pass (grep for `foundry`) once a real product name is chosen; nothing in the architecture depends on the specific string.
