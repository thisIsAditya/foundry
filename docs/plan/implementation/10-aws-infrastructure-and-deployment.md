# AWS infrastructure and deployment (ECS Fargate)

The user's explicit deployment target. This document is the build spec for `infra/cdk` (see `01-monorepo-and-project-structure.md` §5). Standard ECS Fargate was chosen over AWS App Runner (closed to new customers 30 Apr 2026) and over ECS Express Mode (simplified but less control, no Fargate Spot / Compute Savings Plan clarity) — see `12-observability-and-cost-management.md` for the full cost comparison.

## 1. Region and account strategy

- Primary region: `ap-south-1` (Mumbai), matching the India-aware data-residency default in `09-authentication-and-security.md` §11. All stacks are region-parameterized so a second region can be added later without a rewrite.
- Single AWS account for `dev`/`staging`, a separate account for `production` once the team can afford the operational overhead of multi-account (AWS Organizations) — until then, strict IAM boundaries and tagging (`Environment=dev|staging|production`) substitute for account-level isolation. This is a conscious early-stage cost/complexity trade-off, revisit in `plan/10-delivery-roadmap.md`'s later phases.

## 2. CDK stack breakdown

Matches `01-monorepo-and-project-structure.md` §5 file tree.

| Stack | Provisions |
|---|---|
| `NetworkStack` | VPC (2 AZs, 1 public + 1 private subnet per AZ for `dev`; 1 public + 1 private + 1 isolated subnet per AZ for `production`), NAT Gateway (single NAT for `dev`/`staging`, one-per-AZ for `production`), security groups, S3 Gateway endpoint, Interface endpoints (Secrets Manager, ECR, CloudWatch Logs, KMS) |
| `DataStack` | RDS PostgreSQL 17 instance, ElastiCache Serverless (Valkey) cache, two S3 buckets (`uploads`, `artifacts`) with lifecycle rules |
| `EcrStack` | Two ECR repositories (`foundry-web`, `foundry-worker`) with lifecycle policy (keep last 20 images, expire untagged after 7 days) |
| `EcsStack` | ECS cluster, ALB, CloudFront distribution, `web` Fargate service + task definition, `worker` Fargate service + task definition, target-tracking auto-scaling policies |
| `CiStack` | GitHub OIDC identity provider, a deploy IAM role scoped to exactly the resources CI needs to touch |
| `ObservabilityStack` | CloudWatch log groups (with retention), CloudWatch alarms (CPU, memory, 5xx rate, queue depth), a cost/budget CloudWatch alarm |

## 3. Networking detail

```
VPC (10.20.0.0/16)
├── public-subnet-a / public-subnet-b        # ALB, CloudFront origin, NAT Gateway
├── private-subnet-a / private-subnet-b      # ECS tasks (web, worker)
└── isolated-subnet-a / isolated-subnet-b     # RDS, ElastiCache (production only; dev/staging can reuse private subnets)
```

Security groups:

| SG | Inbound | Outbound |
|---|---|---|
| `alb-sg` | 443 from `0.0.0.0/0` (or from CloudFront's managed prefix list only, once CloudFront is mandatory) | 3210 to `web-task-sg` |
| `web-task-sg` | 3210 from `alb-sg` | 5432 to `db-sg`, 6379 to `cache-sg`, 443 to internet (via NAT, for provider API calls) |
| `worker-task-sg` | none (no inbound HTTP except the internal health-check port) | 5432 to `db-sg`, 6379 to `cache-sg`, 443 to internet |
| `db-sg` | 5432 from `web-task-sg`, `worker-task-sg` | — |
| `cache-sg` | 6379 from `web-task-sg`, `worker-task-sg` | — |

## 4. Container images

```
docker/
├── web.Dockerfile
└── worker.Dockerfile
```

Both are multi-stage builds targeting `linux/arm64` (Graviton):

```dockerfile
# docker/web.Dockerfile (shape)
FROM --platform=linux/arm64 node:24-bookworm-slim AS deps
WORKDIR /repo
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
RUN corepack enable && pnpm fetch

FROM deps AS build
COPY . .
RUN pnpm install --offline && pnpm turbo run build --filter=@foundry/web...

FROM --platform=linux/arm64 node:24-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /repo/apps/web/.next/standalone ./
COPY --from=build /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /repo/apps/web/public ./apps/web/public
EXPOSE 3210
USER node
CMD ["node", "apps/web/server.js"]
```

`worker.Dockerfile` follows the same shape, targeting `apps/worker`'s compiled output and exposing only an internal health-check port (no ALB target).

Images are built once per commit in CI, tagged with the Git SHA, and pushed to ECR; the same image is promoted from `dev` → `staging` → `production` (never rebuilt per environment) so what is tested is exactly what ships.

## 5. ECS task and service sizing (cost-conscious defaults)

| Service | vCPU / Memory | Architecture | Min / Max tasks (autoscale) | Capacity provider |
|---|---|---|---|---|
| `web` (dev/staging) | 0.25 vCPU / 512 MB | ARM64 | 1 / 1 | `FARGATE` |
| `web` (production) | 0.5 vCPU / 1024 MB | ARM64 | 2 / 6, target-tracking on ALB request count per target and CPU 60% | `FARGATE` (baseline) |
| `worker` (dev/staging) | 0.25 vCPU / 512 MB | ARM64 | 1 / 1 | `FARGATE` |
| `worker` (production) | 0.5 vCPU / 1024 MB | ARM64 | 1 / 4, target-tracking on BullMQ queue depth (custom CloudWatch metric published by the worker) | `FARGATE_SPOT` preferred, `FARGATE` as the guaranteed fallback via a mixed capacity-provider strategy (e.g., 70% Spot / 30% on-demand) — safe because every job is retried/resumable per `07-caching-queues-and-streaming.md` §2 |

- ECS health check: `web` uses the `/api/ready` route (`05-api-and-backend-architecture.md` §8) as the ALB target-group health check; container-level health check (`HEALTHCHECK` in the Dockerfile or ECS `healthCheck` in the task definition) hits `/api/health`.
- `stopTimeout`: 120s for `worker` (to allow graceful BullMQ drain, `07-caching-queues-and-streaming.md` §3), 30s for `web`.
- ALB idle timeout: 130s (must exceed the SSE keep-alive interval from `07-caching-queues-and-streaming.md` §4 by a safe margin, and must exceed `stopTimeout`).

## 6. Load balancing and CDN

```
Internet
   │
CloudFront (TLS, caches /_next/static/*, /public/*; passes everything else through with no caching)
   │
ALB (TLS terminates here too, for direct-to-ALB health checks and defense in depth)
   │
web Fargate service (target group, port 3210)
```

CloudFront cache behavior:

| Path pattern | TTL | Notes |
|---|---|---|
| `/_next/static/*` | 1 year, immutable | Content-hashed filenames make this safe |
| `/public/*` | 1 day | |
| `/api/stream/*` | 0 (no caching), pass through | SSE must never be cached or buffered by the CDN |
| everything else (`/`, `/api/trpc/*`, `/api/*`) | 0 (no caching) | Authenticated/dynamic content |

`worker` has no ALB target and no public entry point at all — it is reachable only for its internal health endpoint via ECS Service Connect (a lightweight internal DNS/health mechanism), not through the public ALB.

## 7. Database migration on deploy

Migrations run as a one-off ECS task (`RunTask`, same task definition family as `web` but with a different container `command` override: `pnpm --filter @foundry/db migrate up`, i.e. `node-pg-migrate up` against `DATABASE_URL`), triggered by the CI/CD pipeline **before** the new `web`/`worker` service deployment starts. The first deploy to a fresh environment additionally applies the one-time, hand-reviewed Better Auth migration (`06-database-schema.md` §3) through the same mechanism — it is just another file in `packages/db/migrations/`, not a separate step.

```
CI pipeline:
1. Build & push image (tag = git sha)
2. Run migration task against the target environment's RDS instance, wait for success
3. Update ECS service task definitions to the new image tag (rolling deployment, minimumHealthyPercent=100, maximumPercent=200)
4. Wait for ECS deployment to stabilize (CircuitBreaker enabled: auto-rollback on failed health checks)
5. Smoke-test the /api/ready endpoint through the public URL
```

This guarantees the database schema a task expects is always in place before that task's code runs, and ECS's built-in deployment circuit breaker automatically rolls back a bad deploy without a human paging in at 2am.

## 8. WAF and DDoS posture

- AWS Shield Standard is automatic and free on CloudFront/ALB — no action needed.
- AWS WAF is **not** attached at launch (it has a small fixed monthly cost per Web ACL); it is added once either (a) production traffic is public-facing at meaningful scale, or (b) a real abuse incident occurs. The trigger and the exact managed rule groups to enable (`AWSManagedRulesCommonRuleSet`, `AWSManagedRulesSQLiRuleSet`, a rate-based rule) are pre-specified here so adding it later is a CDK change, not a design decision made under pressure.

## 9. CI/CD pipeline (GitHub Actions)

```
.github/workflows/
├── ci.yml            # On every PR: install, typecheck, lint, unit tests, build all apps
├── deploy-dev.yml      # On merge to main: build images, push to ECR, migrate, deploy to `dev`
├── deploy-staging.yml   # On a `release/*` tag: promote the exact dev-tested image to `staging`
└── deploy-prod.yml       # Manual approval gate (GitHub Environments protection rule) -> promote to `production`
```

- Authentication to AWS uses GitHub's OIDC provider + the IAM role from `CiStack` (§2) — no long-lived AWS access keys stored as GitHub secrets.
- The deploy role is scoped by resource ARN/tag condition to exactly: push to the two named ECR repos, update the two named ECS services, run the one named migration task definition, and read/write the specific S3 buckets used for build artifacts if any. It cannot create/delete arbitrary infrastructure — infrastructure changes go through a separate, human-reviewed `cdk deploy` run with broader (but still scoped) permissions.

## 10. Rollback

- Application rollback: re-run `deploy-*.yml` with the previous known-good image tag (ECR retains the last 20 images per repo, §2), or rely on ECS's automatic circuit-breaker rollback during the deploy itself.
- Database rollback: because migrations are additive-first (`06-database-schema.md` §10 discipline of never hand-editing an applied migration), a bad migration is fixed forward with a new corrective migration rather than a destructive rollback; a manual RDS snapshot is taken automatically before any migration tagged as `destructive` in its filename (a small CI check greps the migration diff for `DROP`/`ALTER ... DROP` and requires this tag).

## 11. Estimated baseline monthly cost (production, low-traffic launch)

Order-of-magnitude only, `ap-south-1` on-demand pricing, meant to validate the "cost effective" requirement, not as a billing guarantee:

| Resource | Approx. monthly cost |
|---|---|
| ECS Fargate `web` (2× 0.5 vCPU/1GB ARM64, on-demand) | ~US$25–30 |
| ECS Fargate `worker` (1–2× 0.5 vCPU/1GB ARM64, mixed Spot/on-demand) | ~US$10–20 |
| RDS PostgreSQL (`db.t4g.micro`, single-AZ at launch, Multi-AZ later) | ~US$15–25 |
| ElastiCache Serverless (Valkey, low steady usage) | ~US$5–15 |
| ALB | ~US$18 (fixed) + minimal LCU usage |
| CloudFront | ~US$1–5 at low traffic (pay-per-use) |
| S3 (uploads + artifacts, low volume) | ~US$1–5 |
| NAT Gateway (single, dev/staging shared) | ~US$35 (fixed) + data processing — the single biggest avoidable fixed cost; consider VPC endpoints (already planned, §1) to minimize NAT data-processing charges |
| CloudWatch Logs (with retention limits from `12-observability-and-cost-management.md`) | ~US$5–10 |
| **Infrastructure subtotal** | **~US$115–165/month** |
| Model provider usage (Anthropic/OpenAI/Bedrock) | Variable, governed by `plan/02` §8 budget policy; not an infrastructure cost |

This is intentionally a "single small production environment" estimate. Compute Savings Plans (1-year, no upfront) can be purchased once `dev`+`staging`+`production` baseline usage is stable, typically cutting the Fargate line items by 20–30%.
