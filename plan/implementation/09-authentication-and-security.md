# Authentication and security

Implements `plan/08-security-privacy-and-governance.md` as concrete mechanisms. This document is the security specification the coding agent must follow exactly — do not weaken any control below without recording the change in `plan/11-decisions-and-open-questions.md`.

## 1. Identity providers

| Provider | Use case |
|---|---|
| Google OAuth | The only sign-in path for real founder accounts |
| API key (`x-api-key` header) | Admin/test accounts only — never offered on the public sign-in screen (§2a) |

Both are configured in `apps/web/lib/auth.ts` through **Better Auth** (`betterAuth()` + `socialProviders.google` + the `apiKey` plugin), not Auth.js. There is no email/password provider in v1 — removing password storage/hashing entirely removes a whole class of credential-handling risk, and Google OAuth covers the primary sign-up path. Do not add more OAuth providers in v1 — every provider is an ongoing support and security-review cost.

## 2. Web session strategy

- **Strategy:** Better Auth's default — a database session row (`sessions` table, §3) plus a short-lived signed cookie cache (5 minutes) so most requests avoid a DB round trip without the operational cost of hand-rolling and rotating our own JWTs. `apps/web`'s `middleware.ts` runs on the Node.js middleware runtime (stable since Next.js 15.5) specifically so it can call `auth.api.getSession` directly — there is no separate edge-safe/full config split to keep in sync, unlike the Auth.js `auth.config.ts` pattern this replaces.
- **Secret:** `BETTER_AUTH_SECRET`, a 32-byte random value, stored in AWS Secrets Manager, injected as an ECS task `secrets` entry (never `environment`). Rotate by issuing a new secret version through Better Auth's secret-rotation support (dual-secret verification for one deployment cycle).
- **Cookie flags:** `Secure`, `HttpOnly`, `SameSite=Lax` (Better Auth's default). No session token is ever readable from client-side JavaScript.
- **Google OAuth client secret:** stored in Secrets Manager alongside `BETTER_AUTH_SECRET`, never in `apps/web`'s environment variables in plaintext.

### 2a. Admin/test accounts: API-key sign-in

A small, explicitly flagged set of accounts (`users.role IN ('admin', 'test')`, `06-database-schema.md` §3) may authenticate with a static key instead of Google OAuth — useful for internal use and for testing flows before every founder-facing screen exists. Mechanics:

- Keys are created server-side only, via `auth.api.createApiKey({ body: { userId, ... } })` run from a maintenance script (`scripts/create-admin-key.ts`) — there is no self-service "create your own API key" UI, unlike a typical developer-facing API-key feature.
- The `apiKey` plugin (`@better-auth/api-key`) is configured with `enableSessionForAPIKeys: true`, `apiKeyHeaders: 'x-api-key'`, and a tight rate limit (`rateLimit: { enabled: true, timeWindow: 60_000, maxRequests: 30 }`) — a key behaves like a per-request credential, not a login that establishes a lasting session.
- `POST /api/auth/verify-access-key` (`05-api-and-backend-architecture.md` §8) is the only place a raw key is submitted over the wire for validation; the response never echoes the key back, and the client is expected to persist the key itself (secure cookie on web set by that route, `expo-secure-store` on mobile, `03-mobile-frontend-architecture.md` §5) and resend it as `x-api-key` on every subsequent request.
- `createContext` (`05-api-and-backend-architecture.md` §4) calls `auth.api.getSession({ headers })` with the incoming request's headers unmodified — Better Auth itself checks for a cookie session first and an `x-api-key` header second, so there is exactly one code path resolving "who is calling," regardless of which credential type is present.
- Every account with `role IN ('admin', 'test')` is excluded from normal workspace billing/plan limits and is labeled in the UI (a persistent banner) so it can never be mistaken for a real founder account during a demo or a support session.

## 3. Database tables owned by Better Auth

Better Auth is configured with `modelName` overrides so its own tables use this project's existing plural, snake_case naming (`06-database-schema.md` §3) instead of its singular defaults, which also sidesteps `user` being a reserved word in PostgreSQL:

```sql
-- Generated once via `npx @better-auth/cli generate`, then committed and reviewed like any other
-- migration (06-database-schema.md §10). users(...) itself is listed in 06-database-schema.md §3.

create table sessions (
  id            uuid primary key default gen_random_uuid(),
  user_id         uuid not null references users(id) on delete cascade,
  token             text not null unique,
  expires_at          timestamptz not null,
  ip_address            text,
  user_agent              text,
  created_at                timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);
create index sessions_user_idx on sessions(user_id);

create table accounts (
  id                     uuid primary key default gen_random_uuid(),
  user_id                  uuid not null references users(id) on delete cascade,
  provider_id                text not null,       -- 'google'
  account_id                    text not null,       -- Google's subject ID
  access_token_encrypted          text,
  refresh_token_encrypted            text,
  access_token_expires_at               timestamptz,
  created_at                              timestamptz not null default now(),
  updated_at                                timestamptz not null default now(),
  unique (provider_id, account_id)
);

create table verifications (
  id            uuid primary key default gen_random_uuid(),
  identifier      text not null,
  value             text not null,
  expires_at          timestamptz not null,
  created_at            timestamptz not null default now()
);

create table api_keys (
  id                uuid primary key default gen_random_uuid(),
  user_id             uuid not null references users(id) on delete cascade,
  key_hash              text not null unique,      -- Better Auth hashes the key; the raw value is shown once at creation, never stored
  name                    text,
  prefix                    text,                     -- e.g. 'sk_' — safe to log, unlike the key itself
  enabled                     boolean not null default true,
  rate_limit_json               jsonb,
  expires_at                       timestamptz,
  last_request_at                    timestamptz,
  created_at                            timestamptz not null default now()
);
create index api_keys_user_idx on api_keys(user_id);
```

OAuth refresh/access tokens are encrypted at rest using AWS KMS envelope encryption (a small helper in `@foundry/observability`'s sibling `@foundry/crypto` module — see §7) before being written to `accounts`; Better Auth's default plaintext behavior for those two columns is explicitly overridden via a custom `secondaryStorage`-adjacent hook in `lib/auth.ts` — see Better Auth's database hooks documentation for the exact extension point.

## 4. Mobile authentication (`@better-auth/expo`)

Mobile is **not** a separate auth backend with its own token issuance and rotation logic — it is another client of the exact same Better Auth server config in `apps/web/lib/auth.ts`, via Better Auth's official Expo plugin. This replaces what would otherwise be a bespoke access/refresh-JWT system (and the `mobile_refresh_tokens` table, breach-detection-on-reuse logic, etc. that such a system requires) with a config addition:

```ts
// apps/web/lib/auth.ts (excerpt)
import { expo } from '@better-auth/expo';

export const auth = betterAuth({
  // ...user/session/account/apiKey config from §1-3
  plugins: [expo(), apiKey({ enableSessionForAPIKeys: true, apiKeyHeaders: 'x-api-key' })],
  trustedOrigins: ['foundry://'], // the Expo app's deep-link scheme, required for the OAuth redirect back into the app
});
```

- **Google OAuth on mobile:** the Expo client (`03-mobile-frontend-architecture.md` §5) opens an in-app browser session via `expo-web-browser` (driven internally by `@better-auth/expo`), completes the same Google OAuth flow as web, and receives the resulting session cookie back into `expo-secure-store` through the deep-link redirect.
- **Admin/test accounts on mobile:** the same API-key mechanics as §2a — the key is stored directly in `expo-secure-store` and sent as `x-api-key` on every request; there is no session cookie for this path on any platform.
- **No custom token endpoints, no refresh rotation to implement or audit** — Better Auth's own session lifecycle (§2) is what both platforms rely on.

The tRPC `createContext` function calls `auth.api.getSession({ headers })` with the incoming request's headers, which may contain a Better Auth session cookie (web, or mobile OAuth users forwarding `authClient.getCookie()`) **or** an `x-api-key` header (admin/test accounts on either platform) — both resolve to the identical `Context.session` shape, and procedures never know or care which client type or credential type made the call.

## 5. Authorization model

`users.role` (§2a: `founder | admin | test`) and the workspace-membership roles below are two unrelated vocabularies that happen to share the word "admin" — the former gates *how someone signs in* (Google OAuth vs. API key), the latter gates *what a signed-in person can do inside a specific workspace*. A platform `admin` account still has an ordinary workspace-membership role like anyone else and is not implicitly a workspace `admin`.

Implements `plan/03-domain-model.md`'s `WorkspaceMembership`/`ProjectMembership` roles:

| Role (workspace) | Can |
|---|---|
| `owner` | Everything `admin` can, plus billing, workspace deletion, transferring ownership |
| `admin` | Manage members, provider connections, budgets, policies; everything `member` can |
| `member` | Create/run projects and sprints, approve/reject within assigned projects, upload evidence |
| `viewer` | Read-only across the workspace's projects |

Project-level `role_override` (from `06-database-schema.md` §3 `project_memberships`) lets a workspace `member` be scoped to specific projects only — used when a workspace has external collaborators (e.g., an advisor) who should not see every project.

Every tRPC procedure declares its minimum required role via the procedure builder chain (`05-api-and-backend-architecture.md` §4: `workspaceProcedure`, `projectProcedure`), and `PolicyService.can(actor, action, resource)` is the single function consulted for anything more granular than "is a member" (e.g., "can this actor approve a `side_effect` tool call for this specific sprint"). No route or component computes an authorization decision inline with ad hoc `if` statements — everything routes through `PolicyService`.

## 6. Tenant isolation

Defense in depth, matching `plan/08-security-privacy-and-governance.md` §2:

1. **Application layer:** every service method takes an `actor` and a `scope` and filters queries by `workspaceId`/`projectId` derived from that actor's memberships — never from a client-supplied ID alone.
2. **Database layer (Postgres RLS):** every tenant-scoped table (per `06-database-schema.md` §9) has a Row-Level Security policy:

```sql
alter table projects enable row level security;

create policy tenant_isolation on projects
  using (workspace_id::text = any (current_setting('app.current_workspace_ids', true)::text[]));
```

The API sets `SET LOCAL app.current_workspace_ids = '{...}'` at the start of every transaction, populated from the authenticated actor's memberships resolved in `createContext`. This means even a bug that forgets a `WHERE workspace_id = ...` clause cannot leak cross-tenant rows — RLS is the backstop, not the primary mechanism.
3. **Object storage layer:** S3 object keys are always prefixed `{workspaceId}/{projectId}/...`; presigned URLs are scoped to the exact key, never a prefix, and are generated only after the authorization check in step 1.

## 7. Secret management

| Secret class | Storage | Access pattern |
|---|---|---|
| Infra-level secrets (DB password, `BETTER_AUTH_SECRET`, Google OAuth client secret, Redis auth token) | AWS Secrets Manager | Injected as ECS task `secrets`, resolved by the ECS agent at container start; never in `environment`, never in a Docker image layer, never in application logs |
| User-provided BYOK model provider keys | Encrypted with AWS KMS (envelope encryption: a per-workspace data key wraps the credential, the data key itself is wrapped by a single KMS CMK), stored as `provider_connections.credential_ref_encrypted` | Decrypted only inside `packages/agent-runtime/src/providers/*` immediately before constructing a provider client (`08-agent-runtime-implementation.md` §2); never logged, never included in a trace span, never returned to any client |
| OAuth tokens for integrations | Same KMS envelope pattern as BYOK keys | Decrypted only inside the specific integration adapter at call time |

`packages/observability`'s logger has a redaction list (`password`, `token`, `secret`, `credential`, `apiKey`, case-insensitive substring match on log field names) applied to every structured log line as a second line of defense against accidental leakage.

## 7a. User-added MCP servers: trust boundary

Implements the MCP capability from `00-tech-stack-and-versions.md` §6a and `08-agent-runtime-implementation.md` §11. An MCP server a founder adds is treated as **fully untrusted third-party code**, on the same footing as an arbitrary internet URL — the platform does not vet, sandbox-test, or vouch for it in any way.

- **Storage:** `user_mcp_servers.headers_encrypted` (`06-database-schema.md` §7) uses the identical KMS envelope-encryption pattern as BYOK provider keys (§7 above) — decrypted only inside `mcp/mcp-bridge.ts` immediately before opening a connection, never logged, never returned to any client.
- **User-level, not workspace-level:** a server is visible and usable only for sprints the adding user personally triggers. This is a deliberate, narrower scope than workspace-shared resources like provider connections, chosen because an MCP server is executable third-party surface area — sharing it automatically to every workspace member would multiply the number of people who can unknowingly trigger calls to it.
- **SSRF guard:** before `mcpServer.add`, `mcpServer.testConnection`, and every run-time connection, the server's hostname is resolved and rejected if it falls in a private (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), link-local (`169.254.0.0/16`, including the `169.254.169.254` cloud metadata endpoint), or loopback range — an ECS task is inside a VPC, so an unguarded outbound connection to a user-supplied URL is a direct path to internal services and the instance metadata service. `redirect: 'error'` on the MCP HTTP transport (`08-agent-runtime-implementation.md` §11) additionally prevents a redirect from silently retargeting an already-validated URL to an internal address.
- **Risk classification is forced, not inherited:** every tool an MCP server exposes is classified `side_effect` regardless of the server's own tool metadata (`08-agent-runtime-implementation.md` §11), so every MCP tool call requires the same `ApprovalRequest` step as a built-in write tool. A founder can still be harmed by approving a malicious MCP tool call, but they cannot be harmed by an MCP tool executing *silently*.
- **No code-mode reachability:** because MCP tools are always `side_effect`-classified, they are automatically excluded from any code-mode-eligible tool manifest (§7 of `08-agent-runtime-implementation.md`'s existing rule) — no MCP-specific carve-out was needed to guarantee this.
- **Egress is not separately firewalled per MCP server in v1:** ECS tasks already egress through a NAT Gateway to the public internet for provider APIs and web research tools, so MCP connections use the same path (the SSRF guard above is the actual control, not network isolation). Revisit if a specific incident or compliance requirement justifies an egress allowlist per `10-aws-infrastructure-and-deployment.md` §6's cost-triggered upgrade pattern.
- **Auditable:** every MCP tool call is logged as an ordinary `tool_calls` row (§11 of `08-agent-runtime-implementation.md`) — there is no separate, less-visible logging path for MCP activity than for built-in tools.

## 8. Prompt injection and untrusted content defense

Implements `plan/08` §"prompt injection defense" concretely:

- Web-fetched content and uploaded documents are always wrapped in a labeled, non-instructable content block before being placed into a model context: `<untrusted_source id="{sourceId}">...</untrusted_source>`, and the system instruction for every research/extraction agent explicitly states that text inside `<untrusted_source>` tags is data to analyze, never an instruction to follow.
- Tools available while processing untrusted content are restricted to `read`/`compute`/`draft` risk classes only (enforced by `PolicyService.filterTools`, `08-agent-runtime-implementation.md` §8) — a document can never cause a `side_effect` tool call, regardless of what text it contains.
- `document-intelligence`'s extraction step strips/escapes any content that looks like it is trying to address the model directly (e.g., "ignore previous instructions") into a flagged, quoted form rather than raw text, and logs a `prompt_injection_suspected` domain event for the evaluation pipeline in `12-observability-and-cost-management.md`.

## 9. File and parser safety

Implements `plan/08` §"file/parser safety":

- Uploaded files are scanned by a virus/malware check (ClamAV running as a small sidecar or Lambda invoked from the ingestion worker) before parsing begins; a failed scan sets `sources.status = 'failed'` with reason `malware_detected` and the file is never opened by a parser.
- MIME type is verified by content sniffing (not trusted from the client-supplied `Content-Type` or filename extension) before selecting a parser.
- PDF/Office parsers run with strict size and page/cell limits (`13-coding-standards-and-conventions.md` §7 lists the exact numbers) and never execute embedded macros or scripts.
- Parsing happens only in `apps/worker`, never in `apps/web`'s request path, so a malicious file cannot affect the process serving live user traffic.

## 10. Network security

- VPC with private subnets for ECS tasks and RDS/ElastiCache; only the ALB (and CloudFront in front of it) sits in public subnets.
- Security groups are least-privilege: `web` SG can reach RDS SG on 5432 and ElastiCache SG on 6379; `worker` SG can reach the same; nothing else can reach RDS/ElastiCache directly.
- VPC endpoints (Gateway endpoint for S3, Interface endpoints for Secrets Manager, ECR, CloudWatch Logs, KMS) keep AWS-internal traffic off the public internet, which also reduces NAT Gateway data-transfer cost (`12-observability-and-cost-management.md` §6).
- TLS everywhere: ACM certificate on the ALB/CloudFront, RDS `sslmode=require`, ElastiCache in-transit encryption enabled.
- AWS WAF (a small managed rule set: SQL injection, common OWASP rules, rate-based rule) attached to CloudFront once traffic justifies the marginal cost — see `10-aws-infrastructure-and-deployment.md` §8 for the exact rollout trigger.

## 11. Compliance and audit posture

- Every mutation-capable tRPC procedure writes an audit trail entry (actor, action, target, correlation ID, result) to `domain_events` via the `audit` middleware (`05-api-and-backend-architecture.md` §2) — this is the same table used for product event projections, so audit logging has no separate infrastructure cost.
- India-aware baseline (per `plan/08` §"India-aware compliance"): data residency defaults to `ap-south-1` (Mumbai) for RDS/S3/ElastiCache in the primary deployment target; the provider-capability model (`08-agent-runtime-implementation.md` §2) surfaces each model provider's actual processing region so a workspace can enforce a residency policy.
- Data classification tags (`public`, `internal`, `confidential`, `restricted`) are stored per `Source`/`Document` and checked by `ProviderService` before a document's content is sent to any provider connection whose `allowed_data_classifications` does not include that tag.

## 12. Security checklist before any release

- [ ] No secret appears in `git log`, a Docker image layer, or a CloudWatch log line (verified by a pre-commit secret scanner, e.g. `gitleaks`, plus the redaction list in §7).
- [ ] Every new tRPC procedure has an explicit role/authorization check (verified by the ESLint rule in `13-coding-standards-and-conventions.md` §4 that forbids `publicProcedure` outside an explicit allowlist).
- [ ] Every new table with a tenant-scoping column has an RLS policy (verified by a migration-review checklist item, not just code review).
- [ ] Dependency vulnerability scan (`pnpm audit` / GitHub Dependabot alerts) has zero unresolved `high`/`critical` findings.
- [ ] Any new outbound integration (payment, email, messaging, storage) is behind an `ApprovalRequest` for its first side-effecting action per workspace, per `plan/02` §7 tool policy.
- [ ] Any code that connects to a user-supplied MCP server URL (add, test, or run) passes through the SSRF hostname guard in §7a before opening a connection.
