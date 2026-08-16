# API and backend architecture

Implements the "Application/API layer" and "Domain layer" from `plan/01-system-architecture.md` §2, and the API surface from `plan/13-contracts-and-boundaries.md` §4, as concrete tRPC routers, REST routes, and service classes.

## 1. Why tRPC as the primary internal API

Both clients (`apps/web`, `apps/mobile`) are TypeScript applications we own end to end. tRPC gives full request/response type inference from the router straight into both clients with zero code generation and zero drift between server and client types — which directly serves the requirement that "the agent which is going to write the code must not think much and still make no mistake." REST + hand-written types (or REST + OpenAPI codegen) would add a translation layer that is a recurring source of subtle bugs.

REST is used only at the edges where the caller is not a TypeScript client we control:

| REST route | Caller | Reason it is not tRPC |
|---|---|---|
| `/api/auth/[...all]` | Browser redirect flows, Expo OAuth callback | Better Auth owns this catch-all route shape (Google OAuth, session, `apiKey` plugin endpoints) |
| `/api/auth/verify-access-key` | Web/mobile sign-in screen, admin/test accounts only | One-shot key validation + display name lookup before the client starts sending `x-api-key`; deliberately outside Better Auth's own catch-all so it can return the minimal, UI-specific shape described in §8 |
| `/api/webhooks/[provider]` | Payment/OAuth/third-party providers | External services POST fixed payload shapes we do not control |
| `/api/uploads/intent` (also available as a tRPC procedure) | S3 presigned URL issuance | Kept as a thin REST alias only if a non-tRPC caller (e.g., an EAS build hook) ever needs it; otherwise this is just `evidence.createUploadIntent` |
| `/api/stream/[projectId]` | Web `EventSource` / mobile `react-native-sse` | SSE is not a tRPC transport concern; kept as a plain Route Handler (see `07-caching-queues-and-streaming.md`) |
| `/api/health`, `/api/webhooks` internal probes | ALB/ECS health checks | Must respond without any auth/DB dependency for liveness |

## 2. tRPC router layout

```
apps/web/server/
├── trpc.ts                # initTRPC, context type, base procedure, middleware composition
├── context.ts              # createContext(req): { db, session, actorType, correlationId, services }
├── middleware/
│   ├── auth.ts              # requireSession, requireWorkspaceRole, requireProjectAccess
│   ├── rate-limit.ts        # Redis token-bucket per user/IP (see 07-caching-queues-and-streaming.md §5)
│   ├── idempotency.ts       # dedupe mutations by (actor, idempotencyKey) via Redis SETNX
│   └── audit.ts             # writes an audit event for every mutation on success/failure
└── routers/
    ├── _app.ts              # merges all sub-routers into `AppRouter`
    ├── workspace.ts
    ├── project.ts
    ├── pack.ts
    ├── sprint.ts
    ├── evidence.ts
    ├── approval.ts
    ├── decision.ts
    ├── artifact.ts
    ├── provider.ts           # provider connections + model profile policy
    ├── mcpServer.ts          # user-level MCP server connections (§3, 08-agent-runtime-implementation.md §11)
    ├── budget.ts
    └── member.ts
```

`routers/_app.ts` is the single file exported as the `AppRouter` type consumed by `@foundry/api-contracts`.

## 3. Procedure catalogue

This table is the authoritative list of every tRPC procedure in v1. It mirrors `plan/13-contracts-and-boundaries.md` §4 and the screen mapping in `02-web-frontend-architecture.md` §3 — the three documents must stay in sync.

| Router | Procedure | Type | Input (key fields) | Notes |
|---|---|---|---|---|
| `workspace` | `create` | mutation | `name` | Creates workspace + owner membership |
| `workspace` | `list` | query | — | Workspaces for the current user |
| `workspace` | `getSettings` | query | `workspaceId` | Policy, retention, plan |
| `workspace` | `updateSettings` | mutation | `workspaceId`, `patch`, `expectedVersion` | Optimistic-concurrency guarded |
| `project` | `create` | mutation | `workspaceId`, `name`, `geography`, `objective` | |
| `project` | `list` | query | `workspaceId` | |
| `project` | `getDeskSummary` | query | `projectId` | Backs Founder Desk; denormalized read model |
| `project` | `answerClarification` | mutation | `projectId`, `questionId`, `answer` | Feeds orchestrator, may enqueue a sprint |
| `pack` | `getSection` | query | `projectId`, `section` | |
| `pack` | `getDiff` | query | `projectId`, `fromRevision`, `toRevision` | |
| `pack` | `acceptRevision` | mutation | `projectId`, `revisionId`, `expectedRevision` | |
| `pack` | `rejectRevision` | mutation | `projectId`, `revisionId`, `reason` | |
| `pack` | `addFounderAssertion` | mutation | `projectId`, `section`, `claim`, `provenance: 'founder_asserted'` | |
| `pack` | `export` | mutation | `projectId`, `format` | Returns a signed download URL |
| `sprint` | `preview` | mutation | `projectId`, `objectiveHint?` | Returns a draft `SprintContract` for founder approval, no spend yet |
| `sprint` | `approvePlan` | mutation | `sprintId`, `expectedContractHash` | Enqueues the sprint job in BullMQ |
| `sprint` | `getContract` | query | `sprintId` | |
| `sprint` | `getActivity` | query | `sprintId`, `cursor?` | Paged ledger read, also backs SSE replay |
| `sprint` | `pause` / `resume` / `stop` | mutation | `sprintId` | Publishes a control signal the worker polls between steps |
| `evidence` | `createUploadIntent` | mutation | `projectId`, `filename`, `mimeType`, `sizeBytes` | Returns presigned S3 PUT URL + `sourceId` |
| `evidence` | `confirmUpload` | mutation | `sourceId` | Enqueues `ingestion` job |
| `evidence` | `registerUrl` | mutation | `projectId`, `url` | Enqueues `ingestion` job with a fetch step |
| `evidence` | `list` / `search` | query | `projectId`, filters | |
| `evidence` | `getCitation` | query | `citationId` | |
| `evidence` | `deleteSource` | mutation | `sourceId` | Tombstone if referenced (`plan/03` §1 rule 10) |
| `approval` | `list` | query | `projectId`, `status?` | |
| `approval` | `getPayload` | query | `approvalId` | |
| `approval` | `approve` / `reject` | mutation | `approvalId`, `expectedPayloadHash` | |
| `decision` | `record` | mutation | `projectId`, `options`, `chosen`, `rationale`, `evidenceRefs` | |
| `decision` | `list` | query | `projectId` | |
| `artifact` | `list` | query | `projectId` | |
| `artifact` | `generate` / `regenerate` | mutation | `projectId`, `artifactType`, `templateVersion?` | Enqueues `render` job |
| `artifact` | `getVersion` | query | `artifactId`, `version?` | |
| `artifact` | `export` | mutation | `artifactId`, `version`, `format` | |
| `provider` | `listConnections` | query | `workspaceId` | Never returns raw credentials |
| `provider` | `connect` | mutation | `workspaceId`, `family`, `authMode`, `credentialRef` | Validates with a low-risk capability test before saving |
| `provider` | `setModelProfilePolicy` | mutation | `workspaceId`, `profile`, `policy` | |
| `provider` | `setPrivacyMode` | mutation | `projectId`, `mode` | |
| `mcpServer` | `list` | query | — | The current user's own MCP servers only — never another user's, even within the same workspace |
| `mcpServer` | `add` | mutation | `name`, `transport`, `url`, `headerSecret?` | Runs a `listTools()` probe before saving; rejects the URL if it resolves to a private/link-local IP range (SSRF guard, `09-authentication-and-security.md` §7a) |
| `mcpServer` | `remove` / `toggle` | mutation | `mcpServerId` | Toggling off immediately excludes the server's tools from any new run's tool manifest |
| `mcpServer` | `testConnection` | mutation | `mcpServerId` | Re-runs the `listTools()` probe on demand; returns tool names/descriptions and a health status, never executes a tool |
| `budget` | `getSummary` | query | `scopeType`, `scopeId` | Workspace, project, or sprint scope |
| `member` | `list` / `invite` / `updateRole` / `remove` | query/mutation | `workspaceId`, … | |

Every mutation input includes `idempotencyKey: string` (UUID) except pure read queries. Every mutation that edits a versioned aggregate (`pack`, `workspace` settings, `approval`) includes an `expected*` version/hash field so the domain layer can reject stale writes per `plan/01` §7.

## 4. Context and middleware composition

```ts
// server/trpc.ts (shape, not full implementation)
export type Context = {
  sql: SqlClient; // packages/db's postgres.js client factory output
  actor: { type: 'user' | 'system'; userId?: UserId };
  session: AuthSession | null; // from auth.api.getSession({ headers }) — cookie session or x-api-key
  correlationId: string;
  services: ServiceContainer; // see §6
};

const t = initTRPC.context<Context>().create({
  transformer: superjson, // preserves Date, Decimal, Map across the wire
  errorFormatter: mapDomainErrorToTrpcError, // maps plan/13 §7 vocabulary to TRPCError
});

export const publicProcedure = t.procedure.use(rateLimit).use(audit);
export const protectedProcedure = publicProcedure.use(requireSession);
export const workspaceProcedure = protectedProcedure.use(requireWorkspaceRole('member'));
export const projectProcedure = protectedProcedure.use(requireProjectAccess);
```

Every router builds its procedures from `workspaceProcedure` or `projectProcedure`, never from `publicProcedure` directly (except `workspace.create`), so authorization is structurally impossible to skip.

## 5. Read-model invalidation contract

Every mutation declares which query keys it invalidates, as metadata attached to the procedure (not left to client-side guessing):

```ts
export const acceptRevision = projectProcedure
  .meta({ invalidates: ['pack.getSection', 'pack.getDiff', 'project.getDeskSummary'] })
  .input(AcceptRevisionInput)
  .mutation(async ({ ctx, input }) => { /* ... */ });
```

`lib/trpc/client.ts` reads this metadata in a shared `onSuccess` handler and calls `queryClient.invalidateQueries` for the declared keys automatically — feature code never hand-writes cache invalidation, removing an entire class of "forgot to invalidate" bugs.

## 6. Service container and domain services

The tRPC context exposes a `services` object; **procedures call services, they never call `db` directly for anything beyond a single trivial read.** This enforces the boundary from `plan/01` §2 ("An agent may propose a change. The domain layer validates and applies it.") down to the API layer too.

```ts
type ServiceContainer = {
  projectService: ProjectService;
  packService: PackService;
  evidenceService: EvidenceService;
  assumptionService: AssumptionService;
  gateService: GateService;
  moneyRulesService: MoneyRulesService;
  experimentService: ExperimentService;
  sprintService: SprintService;      // enqueues BullMQ jobs, does not run them
  approvalService: ApprovalService;
  policyService: PolicyService;
  artifactService: ArtifactService;  // enqueues render jobs
  documentService: DocumentService;  // issues upload intents, enqueues ingestion jobs
  providerService: ProviderService;
  toolRegistryService: ToolRegistryService;
  mcpServerService: McpServerService;  // §3, 08-agent-runtime-implementation.md §11
  budgetService: BudgetService;
  notificationService: NotificationService;
};
```

This is the exact list from `plan/03-domain-model.md` §8, plus `mcpServerService`. Each service class lives in its owning package (`packages/policy`, `packages/artifacts`, `packages/document-intelligence`, `packages/agent-runtime` for `mcpServerService`, or a new `packages/domain-services` if a service does not fit an existing package — see `13-coding-standards-and-conventions.md` §6 for the rule on adding a new package) and is constructed once per request with the request-scoped `sql` client and `actor`.

Rule for every service method: **accept and return domain types from `@foundry/domain`, never a raw `postgres.js` row.** The mapping from SQL row → domain entity happens inside the `packages/db` repository function that the service calls, which parses the row through the matching `@foundry/domain` Zod schema (`06-database-schema.md` §1).

## 7. File upload/download flow

Implements `plan/01` §2 "signed upload/download URLs" concretely:

1. `evidence.createUploadIntent` validates size/MIME allowlist, creates a `Source` row in state `pending`, and returns `{ sourceId, uploadUrl, uploadFields, expiresAt }` from `S3Client.createPresignedPost` (or `PutObjectCommand` + `getSignedUrl` for simple PUT).
2. Client uploads directly to S3.
3. Client calls `evidence.confirmUpload({ sourceId })`, which enqueues an `ingestion` BullMQ job and marks the `Source` as `uploaded`.
4. `apps/worker`'s ingestion processor downloads via an S3 `GetObject` (server-side, never proxied through `apps/web`), runs the pipeline in `plan/04-document-intelligence.md`, and updates the `Source`/`Document` rows through `DocumentService`.
5. Downloads (artifact export, pack export) follow the mirror path: `artifact.export` returns a short-lived signed `GetObject` URL rather than streaming bytes through the Next.js server.

This keeps `apps/web`'s request handlers fast and cheap (no large-body proxying), which matters directly for ECS task sizing/cost (`10-aws-infrastructure-and-deployment.md`).

## 8. REST route contracts

### `POST /api/auth/verify-access-key`

Admin/test sign-in only (§1). Request: `{ key: string }`. Calls `auth.api.verifyApiKey({ key })` server-side; on success returns `{ valid: true; displayName: string }`, on failure `401` with the standard error shape. Does **not** set a cookie or return a session — the client persists the raw key and sends it back as `x-api-key` on every future request; Better Auth's `apiKey` plugin (`enableSessionForAPIKeys: true`) verifies that header on each request independently (`09-authentication-and-security.md` §2a). Rate-limited more aggressively than any other unauthenticated route (5/minute/IP) since it is a credential-guessing surface.

### `POST /api/webhooks/[provider]`

Verifies a provider-specific signature header before touching the body, enqueues a `notification` or domain-specific job, and returns `200` immediately — webhook handlers never do synchronous heavy work.

### `GET /api/health`, `GET /api/ready`

`health` returns `200` if the process is up (used for ECS container health check). `ready` additionally checks a DB `SELECT 1` and a Redis `PING` with a short timeout (used for ALB target-group health check) — see `10-aws-infrastructure-and-deployment.md` §5.

## 9. Error handling contract

Every thrown domain error extends `AppError` (from `@foundry/observability`) with a `code` from the `plan/13` §7 vocabulary. `errorFormatter` in `trpc.ts` maps:

| `AppError.code` | `TRPCError.code` | HTTP status |
|---|---|---|
| `unauthorized` | `UNAUTHORIZED` | 401 |
| `not_found` | `NOT_FOUND` | 404 |
| `stale_revision` | `CONFLICT` | 409 |
| `invalid_input` | `BAD_REQUEST` | 400 |
| `missing_evidence`, `gate_blocked`, `policy_forbidden` | `FORBIDDEN` | 403 |
| `approval_required` | `PRECONDITION_FAILED` | 412 |
| `budget_exceeded` | `PAYMENT_REQUIRED` | 402 |
| `rate_limited` | `TOO_MANY_REQUESTS` | 429 |
| `provider_unavailable`, `capability_unsupported`, `artifact_render_failed`, `workflow_failed` | `INTERNAL_SERVER_ERROR` | 500 (with `retryable: true` where applicable) |

The client never needs a `switch` on HTTP status; it switches on `AppError.code`, which is preserved end to end through tRPC's error `data` payload.

## 10. Rate limiting and idempotency

- Rate limiting: Redis-backed token bucket, keyed by `(actorId, procedureGroup)`, default 60 requests/minute for read procedures and 20/minute for mutation procedures, configurable per workspace plan. Implemented as tRPC middleware (`middleware/rate-limit.ts`) — see `07-caching-queues-and-streaming.md` §5 for the Redis data shape.
- Idempotency: mutation middleware computes a Redis key `idem:{actorId}:{procedureName}:{idempotencyKey}`, `SETNX` with a 24h TTL storing the eventual response; a repeated call with the same key returns the cached response without re-executing the mutation. This directly satisfies `plan/01` §7 ("Resuming a sprint must not duplicate payment, email, publishing, or other side effects").
