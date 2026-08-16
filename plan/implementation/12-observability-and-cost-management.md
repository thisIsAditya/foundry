# Observability and cost management

Implements the operational half of `plan/09-evaluation-and-observability.md` and the cost-effectiveness requirement running through this whole implementation plan. The guiding rule: **instrument with vendor-neutral OpenTelemetry from day one, but only pay for a managed observability backend once volume justifies it.**

## 1. Instrumentation

Every app (`apps/web`, `apps/worker`) calls `initObservability()` (from `@foundry/observability`, see `04-shared-packages-and-design-system.md` §6) as the first line of its entrypoint:

```ts
// apps/worker/src/main.ts (first lines)
import { initObservability } from '@foundry/observability';
initObservability({ serviceName: 'foundry-worker' });
// all other imports and app startup happen after this line
```

`initObservability` configures:

- An OTel `NodeSDK` with auto-instrumentation for `http`, `pg`/`postgres.js`, `ioredis`, and `undici`/`fetch` (covers provider API calls).
- A custom span wrapper around every `AgentDefinition` invocation and every BullMQ job, tagged with `agent.name`, `agent.version`, `provider.family`, `model.id`, `sprint.id`, `project.id` (never a raw credential or a full prompt/completion body — see §4).
- A `pino` logger bound to the active trace/span ID so every log line and every trace can be correlated in whichever backend is active.

## 2. MVP backend: CloudWatch-first, zero extra infrastructure

At launch, telemetry flows straight to AWS-native services with **no sidecar container and no third-party bill**:

| Signal | Destination | Mechanism |
|---|---|---|
| Logs | CloudWatch Logs | ECS `awslogs` driver, `pino` JSON output |
| Traces | AWS X-Ray | OTel SDK's AWS X-Ray exporter (`@opentelemetry/exporter-aws-xray` + the X-Ray ID generator), sent via the ADOT-compatible OTLP/X-Ray path |
| Metrics | CloudWatch Container Insights | Enabled at the ECS cluster level (`containerInsights: 'enabled'` in CDK); Fargate reports CPU/memory automatically |
| Custom business metrics (queue depth, sprint cost, gate pass rate) | CloudWatch custom metrics via EMF (Embedded Metric Format) | `@aws-sdk/... ` EMF helper or a tiny in-house `emit(metricName, value, dimensions)` helper — EMF avoids per-`PutMetricData`-call charges |
| Errors | Sentry (or self-hosted GlitchTip) | Sentry Node/Next.js/Expo SDKs, cheapest paid tier or free tier at launch scale |

This is "Path 3" from the research behind this plan: CloudWatch as the floor, no Grafana/Alloy sidecar cost until traffic or team size justifies it.

## 3. Upgrade path: Grafana/Alloy sidecar (deferred, pre-specified)

When justified (see triggers below), add a Grafana Alloy sidecar container to the `web` and `worker` task definitions:

```
Trigger to add the Alloy sidecar:
- More than ~20 concurrent replicas across services (connection/cardinality overhead starts to matter), OR
- The team wants cross-service trace correlation and dashboards richer than CloudWatch Dashboards support, OR
- CloudWatch Logs Insights query cost/latency becomes a measured pain point.
```

At that point: add an `alloy` container (`grafana/alloy` image) to each task definition, point the app's `OTEL_EXPORTER_OTLP_ENDPOINT` at `http://localhost:4318`, and configure Alloy to scrape ECS task metadata (`otelcol.receiver.awsecscontainermetrics`) and forward everything to Grafana Cloud (or a self-hosted Grafana/Tempo/Loki/Mimir stack). This is a config/CDK change to the task definition, not an application code change, because the app only ever talks to `localhost:4318` regardless of what is listening there.

## 4. What is never logged or traced

Enforced by the redaction list in `09-authentication-and-security.md` §7 plus explicit span-attribute allowlists in `agent-runtime`:

- Raw prompts/completions are **not** attached as span attributes or log fields by default (they can be large and may contain founder-confidential business data). Instead, spans carry token counts, latency, cost, and a content hash — full prompt/completion bodies are persisted only in `agent_runs`/`sprint_progress_events` in Postgres, which is access-controlled the same way the rest of the pack is.
- Provider credentials, BYOK keys, session tokens, and refresh tokens never appear in a span, log, or trace attribute.
- Founder-uploaded document content is never logged; only `sourceId`/`documentId` references appear in telemetry.
- A user-added MCP server's decrypted auth header is never logged or traced; spans for an MCP tool call carry the server name and tool name only (`08-agent-runtime-implementation.md` §11, `09-authentication-and-security.md` §7a).

## 5. Alarms

| Alarm | Condition | Action |
|---|---|---|
| `web` 5xx rate | > 2% of requests over 5 min | Page on-call (or, pre-team-scale, send to a Slack/email channel) |
| `web`/`worker` CPU | > 80% for 10 min sustained | Informational; auto-scaling should already be reacting |
| `worker` queue depth (`sprint`) | > 20 pending jobs for 15 min | Informational; check for a stuck provider or a runaway sprint |
| RDS free storage | < 20% | Warning, plan a storage increase |
| RDS CPU/connections | > 80% CPU or > 80% of max connections for 10 min | Warning; check for a missing index or a connection-pool leak |
| Budget alarm (AWS Budgets) | Monthly spend > 110% of the `10-aws-infrastructure-and-deployment.md` §11 estimate | Email/Slack notification, not an auto-shutdown — cost visibility, not a hard kill switch |
| Model provider spend (application-level, from `usage_records`) | Workspace approaching its `provider_connections.spend_limit_usd` | Product-level notification per `plan/02` §8, independent of AWS Budgets |

## 6. Cost management practices baked into the design

Cross-references to where each cost lever is already specified elsewhere in this folder, collected here as a checklist:

- ARM64/Graviton for all compute (`10-aws-infrastructure-and-deployment.md` §5).
- Fargate Spot for the retry-safe `worker` service (`10-aws-infrastructure-and-deployment.md` §5).
- Single shared ElastiCache Serverless cache for queues + streaming + ephemeral state instead of three separate managed services (`07-caching-queues-and-streaming.md` §1).
- VPC Interface/Gateway endpoints to cut NAT data-processing charges (`10-aws-infrastructure-and-deployment.md` §3, §11).
- CloudWatch Logs retention limits (30 days for `production`, 7 days for `dev`/`staging`), never "never expire," with an S3 export lifecycle rule for anything that must be kept longer for compliance.
- Postgres full-text/vector search instead of a separate search service until evaluation data (`plan/09-evaluation-and-observability.md`) proves it is insufficient (`00-tech-stack-and-versions.md` §7).
- No AWS WAF, no Grafana sidecar, no Multi-AZ RDS, no second AWS account, no MFA infrastructure until an explicit, pre-written trigger is hit (this document §3; `10-aws-infrastructure-and-deployment.md` §8; `09-authentication-and-security.md` §1 note on MFA) — the plan defers cost deliberately rather than accidentally.
- Model spend is metered and capped per `plan/02-orchestration-and-agent-contracts.md` §8, independent of AWS infrastructure cost — a runaway sprint cannot silently produce a large provider bill.

## 7. Dashboards

A single "Foundry Operations" CloudWatch Dashboard (defined in `ObservabilityStack`, `10-aws-infrastructure-and-deployment.md` §2) shows, on one screen: `web`/`worker` CPU & memory, ALB request count & 5xx rate, RDS CPU/connections/storage, BullMQ queue depths (via the EMF custom metric in §2), and current-month AWS spend (from AWS Budgets/Cost Explorer). This is the first thing checked during an incident and the first thing reviewed weekly — it must never require logging into a second vendor's UI to get a full picture at MVP scale.

## 8. Relationship to product-level evaluation

This document owns *infrastructure and application* observability. `plan/09-evaluation-and-observability.md` owns *agent output quality* observability (golden packs, evaluator reports, human review queues). They share the same trace/correlation ID scheme (every `agent_runs` row and every OTel span for that run carry the same `correlationId`), so a quality issue found in the product-level evaluation pipeline can be traced back to the exact infrastructure-level request/trace that produced it, and vice versa.
