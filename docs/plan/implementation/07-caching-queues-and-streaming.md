# Caching, queues, and streaming

Implements the "Workflow layer" and "ephemeral coordination" pieces of `plan/01-system-architecture.md` §2 concretely on Redis (ElastiCache Serverless for Valkey) + BullMQ + Server-Sent Events. Read `00-tech-stack-and-versions.md` §7 for why this combination was chosen over Temporal/Inngest/SQS.

## 1. Why one Redis, three responsibilities

A single ElastiCache Serverless Valkey cache backs three responsibilities. This is a deliberate cost decision: standing up a second managed service for each responsibility would add fixed monthly cost for no reliability benefit at this scale.

| Responsibility | Redis feature used |
|---|---|
| Background job queues (sprints, ingestion, rendering, notifications) | BullMQ (lists + sorted sets) |
| Streaming fan-out (server → connected clients) | Redis Pub/Sub + a small replay buffer (sorted set) |
| Ephemeral coordination (rate limits, idempotency keys, locks) | Plain `SET`/`INCR`/`EXPIRE` |

If any one responsibility later needs isolation (e.g., queue traffic starts starving pub/sub), split into a second ElastiCache Serverless cache — this is a config change (new endpoint), not a code rewrite, because each responsibility already uses its own key namespace and its own `ioredis`/BullMQ connection instance.

## 2. Queue topology (BullMQ)

Defined in `apps/worker/src/queues/`, one BullMQ `Queue` + `Worker` pair per concern:

| Queue name | Producer | Consumer | Concurrency | Typical job duration |
|---|---|---|---|---|
| `sprint` | `SprintService.approvePlan` (in `apps/web`) | `sprint.worker.ts` | 4 per worker task | Minutes to tens of minutes |
| `ingestion` | `DocumentService.confirmUpload` / `registerUrl` | `ingestion.worker.ts` | 8 per worker task | Seconds to a few minutes |
| `render` | `ArtifactService.generate` | `render.worker.ts` | 4 per worker task | Seconds to a couple of minutes |
| `notification` | Domain event listeners (see §7) | `notification.worker.ts` | 20 per worker task | Sub-second |

```ts
// apps/worker/src/queues/sprint.worker.ts (shape)
export const sprintQueue = new Queue<SprintJobData>('sprint', { connection: redis });

export const sprintWorker = new Worker<SprintJobData>(
  'sprint',
  async (job) => runSprint(job.data, { onProgress: (evt) => job.updateProgress(evt) }),
  {
    connection: redis,
    concurrency: 4,
    lockDuration: 5 * 60_000,     // sprints run long; renew the BullMQ lock, do not let it starve
    autorun: true,
  },
);
```

### Job payload contract

Every job payload is a **snapshot reference**, not a live object, per `plan/01` §7 ("every mutation includes the pack version it was based on"):

```ts
type SprintJobData = {
  sprintId: SprintId;
  projectId: ProjectId;
  packRevisionId: PackRevisionId;    // exact revision the sprint was contracted against
  correlationId: string;
  attempt: number;
};
```

### Retry policy

| Queue | Attempts | Backoff | Dead-letter behavior |
|---|---|---|---|
| `sprint` | 1 (sprints self-manage retries of individual workers internally; a failed sprint job is a product-visible failure, not a silent retry) | — | Marks `sprints.status = 'failed'`, raises `sprint_failed` domain event |
| `ingestion` | 3 | Exponential, 5s base | After 3 failures, `sources.status = 'failed'`, founder sees a retry action in the UI |
| `render` | 3 | Exponential, 5s base | After 3 failures, `artifact_versions.status = 'failed'` |
| `notification` | 5 | Exponential, 2s base | After 5 failures, logged to `domain_events` as `notification_failed`, never blocks the triggering flow |

Every job handler is idempotent with respect to the `idempotencyKey`/`jobId` (BullMQ's own `jobId` is set to a deterministic value derived from the domain action, e.g. `render:${artifactVersionId}`) so a retried or manually re-run job cannot double-charge budget or double-send a notification.

## 3. Graceful shutdown (ECS deploys constantly)

`apps/worker/src/shutdown.ts` listens for `SIGTERM` (sent by ECS during a deployment or scale-in) and:

1. Stops accepting new jobs (`worker.pause(true)`).
2. Waits (bounded by ECS's `stopTimeout`, configured to 120s — see `10-aws-infrastructure-and-deployment.md` §5) for in-flight jobs to finish or checkpoint.
3. Calls `worker.close()` to release BullMQ locks cleanly so another task can immediately pick the job back up instead of waiting for the lock to expire.

This directly implements the `plan/01` §7 reliability rule that a worker may fail without corrupting the pack — a clean shutdown makes that the common case rather than the exception.

## 4. Streaming (SSE) architecture

The web/mobile clients need live updates while a sprint runs in `apps/worker` — a different process/container than the one serving the HTTP request. The stream endpoint therefore fans out through Redis Pub/Sub rather than holding worker-side state in the request process.

```
apps/worker (sprint.worker.ts)
   │  normalizes AI SDK stream parts + domain events into StreamEvent (plan/13 §5)
   ▼
Redis: PUBLISH stream:{projectId}  <StreamEvent JSON>
Redis: ZADD  stream-log:{projectId}  <seq>  <StreamEvent JSON>   -- replay buffer, capped + TTL'd
   │
   ▼
apps/web  app/api/stream/[projectId]/route.ts
   │  SUBSCRIBE stream:{projectId}; on connect, replay stream-log entries after Last-Event-ID
   ▼
Response: text/event-stream  → browser EventSource / react-native-sse
```

- The replay buffer (`stream-log:{projectId}`) is capped to the last 500 events or 30 minutes, whichever is smaller (`ZREMRANGEBYSCORE`/`ZREMRANGEBYRANK` on write), and TTL'd to 24 hours — this is a reconnect aid, not a durable log. The durable record is `sprint_progress_events` in Postgres (`06-database-schema.md` §6), which the client falls back to via `sprint.getActivity` if the Redis buffer has expired.
- The SSE route sets `Cache-Control: no-cache`, `Connection: keep-alive`, and a periodic comment-only keep-alive (`: ping\n\n` every 20s) so ALB/CloudFront idle-timeout settings do not silently drop the connection — see `10-aws-infrastructure-and-deployment.md` §5 for the matching ALB idle-timeout value.
- Authorization: the SSE route runs the same `requireProjectAccess` check as the tRPC middleware before subscribing to Redis — a stream is just another authorized read, not a separate trust boundary.

## 5. Rate limiting and idempotency (Redis key shapes)

| Purpose | Key pattern | Data structure | TTL |
|---|---|---|---|
| Rate limit | `rl:{actorId}:{procedureGroup}:{windowStart}` | `INCR` + `EXPIRE` (fixed window) | Window length (60s) |
| Idempotent mutation cache | `idem:{actorId}:{procedure}:{idempotencyKey}` | `SET` (JSON response) with `NX` | 24h |
| Distributed lock (e.g., single-flight pack revision acceptance) | `lock:pack:{projectId}` | `SET ... NX PX <ms>` (Redlock-style single-node lock; acceptable at this scale since we run one Redis) | 10s |
| Upload-intent single-use token | `upload-intent:{sourceId}` | `SET` with `NX` | 1h |

Rate limiting uses a fixed window rather than a sliding-window/token-bucket library to keep the implementation legible for a coding agent; revisit only if burst behavior at the window boundary becomes a measured problem.

## 6. Application-level caching (what gets cached, and how it is invalidated)

| Cached data | Store | Invalidation trigger |
|---|---|---|
| `project.getDeskSummary` read model | Redis, key `desk:{projectId}`, 30s TTL | Any `pack_revision`, `sprint`, or `approval` write for that project explicitly `DEL`s the key (belt-and-suspenders with the short TTL) |
| Rendered artifact preview (HTML) | S3 (not Redis) — artifacts are already immutable versioned objects, so "cache" is just "the object we already wrote" | New `render` job writes a new `artifact_versions` row and S3 key; nothing to invalidate |
| Provider capability probe result | Redis, key `provider-caps:{providerConnectionId}`, 6h TTL | Manual re-validation action, or on 24h background refresh job |
| Client-side TanStack Query cache | Browser/app memory (not Redis) | Procedure `invalidates` metadata, see `05-api-and-backend-architecture.md` §5 |

No cache in this system is ever the only copy of authoritative data — every cache entry is either a short-TTL projection of Postgres or an immutable pointer to an S3 object, matching the "canonical pack must be reconstructable from relational records" rule in `plan/01-system-architecture.md` §2.

## 7. Domain events → notification fan-out

`packages/observability`'s event bus (a thin wrapper that both writes to `domain_events` in Postgres and enqueues a `notification` BullMQ job when the event type is in a notify-worthy allowlist) implements `plan/06-web-and-mobile-experience.md`'s notification policy:

```ts
const NOTIFY_WORTHY: DomainEventType[] = [
  'approval_requested',
  'sprint_stalled',
  'sprint_closed',
  'artifact_ready',
  'budget_threshold_reached',
  'gate_evaluated',
];
```

`notification.worker.ts` reads the event, looks up the user's `notification_endpoints`, and dispatches through the matching channel (Expo push via `expo-server-sdk`, email via the transactional email provider, or an in-app row that the desk summary read model surfaces).

## 8. Local development

`docker-compose.yml` at the repo root runs Postgres 17 (with `vector` and `pg_trgm` extensions pre-installed via an init script) and a single-node Redis/Valkey container standing in for ElastiCache Serverless — application code talks to both through the same connection factory used in AWS, so there is no separate "local mode" code path to maintain.
