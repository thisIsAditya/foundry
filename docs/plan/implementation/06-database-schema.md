# Database schema

Implements `plan/03-domain-model.md` as PostgreSQL 17 tables, managed as hand-written SQL — **no ORM**. Read `00-tech-stack-and-versions.md` §7 for the reasoning; this document is the DDL itself, not a schema-definition-language translation of it, so what is written below is (nearly) what actually gets committed to `packages/db/migrations/`.

## 1. Query layer conventions

- The DDL in this document lives, one migration file per logical change, in `packages/db/migrations/*.sql` (see §10). There is no separate TypeScript schema file that generates this SQL — this **is** the schema.
- `packages/db/src/repositories/*.ts` holds one module per aggregate/entity group (mirroring `plan/03` §3's groupings: identity, journey, evidence, execution, output). Each exported function: (1) runs one parameterized query via the shared `postgres.js` `sql` tagged template, (2) parses every returned row through the matching Zod schema from `@foundry/domain`, and (3) returns the resulting domain type — never a raw row. This parse step is the load-bearing safety net an ORM's compile-time mapping would otherwise provide.
- Every table has: `id` (UUID, `default gen_random_uuid()`), `created_at`/`updated_at` (`timestamptz`, UTC — per `plan/03` §1 rule 9), and a `workspace_id` or derivable tenant scope for row-level isolation (see `09-authentication-and-security.md` §6 for RLS policy).
- Money values use PostgreSQL `numeric(19,4)`. `postgres.js` returns `numeric` columns as JavaScript strings by default (it never silently widens them to `number`, which would lose precision); the repository layer parses that string into the `MoneyAmount` value object from `@foundry/domain` — **never** JavaScript `number` for money, at any layer.
- Append-only tables (events, usage, tool calls, audit) have no `updated_at` and the repository layer never issues an `UPDATE` against them — only `INSERT`.
- Versioned aggregates (`CompanyPack`, `Approval` payloads) never `UPDATE` the row that represents a specific version; a "current" pointer table references the latest immutable version row.
- Every multi-statement write that must be atomic (e.g., accepting a pack revision and updating the project's `current_pack_revision_id`) is wrapped in a single `postgres.js` transaction (`sql.begin(async (tx) => { ... })`) inside the repository function — transactions are never opened and left open across a service-method boundary.

## 2. Extensions

```sql
create extension if not exists pgcrypto;   -- gen_random_uuid()
create extension if not exists vector;      -- pgvector 0.8.2, for embeddings
create extension if not exists pg_trgm;      -- fuzzy/full-text search support
```

## 3. Identity and collaboration

```sql
create table users (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,               -- Better Auth's standard field name
  email             text not null unique,
  email_verified     boolean not null default false,
  image               text,
  role                 text not null default 'founder', -- founder | admin | test — gates the API-key sign-in path, 09-authentication-and-security.md §2a
  timezone              text not null default 'UTC',
  locale                  text not null default 'en-IN',
  created_at                timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);
create index users_role_idx on users(role) where role <> 'founder';

create table workspaces (
  id                     uuid primary key default gen_random_uuid(),
  name                   text not null,
  owner_user_id          uuid not null references users(id),
  plan                   text not null default 'free',            -- free | pro | enterprise
  default_provider_policy jsonb not null default '{}',
  default_retention_policy jsonb not null default '{}',
  locale                 text not null default 'en-IN',
  timezone               text not null default 'UTC',
  status                 text not null default 'active',           -- active | suspended | closed
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create table workspace_memberships (
  id             uuid primary key default gen_random_uuid(),
  workspace_id   uuid not null references workspaces(id) on delete cascade,
  user_id        uuid not null references users(id) on delete cascade,
  role           text not null,                 -- owner | admin | member | viewer
  invited_by     uuid references users(id),
  created_at     timestamptz not null default now(),
  unique (workspace_id, user_id)
);
create index workspace_memberships_user_idx on workspace_memberships(user_id);

create table project_memberships (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references projects(id) on delete cascade,
  user_id      uuid not null references users(id) on delete cascade,
  role_override text,                            -- null = inherit workspace role
  created_at   timestamptz not null default now(),
  unique (project_id, user_id)
);

create table notification_endpoints (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references users(id) on delete cascade,
  workspace_id  uuid not null references workspaces(id) on delete cascade,
  channel       text not null,                    -- push | email | in_app
  target        text not null,                    -- expo push token, email address, etc.
  consented_at  timestamptz not null default now(),
  revoked_at    timestamptz
);
```

Better Auth's own tables (session, OAuth account, email-verification token, API key) are configured with `modelName` to fit this document's existing naming convention exactly, rather than accepting Better Auth's own default singular names (which would otherwise collide with the SQL reserved word `user` and force every foreign key in this document to be quoted):

```ts
// apps/web/lib/auth.ts (shape, not full config)
betterAuth({
  user: { modelName: 'users', additionalFields: { role: { type: 'string', defaultValue: 'founder' }, timezone: { type: 'string' }, locale: { type: 'string' } } },
  session: { modelName: 'sessions' },
  account: { modelName: 'accounts' },
  verification: { modelName: 'verifications' },
  plugins: [apiKey({ modelName: 'api_keys' })],
});
```

With that config, `users` **is** Better Auth's user table — there is no separate identity table to keep in sync. Its DDL (below) is generated once via `npx @better-auth/cli generate --output packages/db/migrations/0001_better_auth.sql`, hand-reviewed, and committed exactly like any other migration in this document (§10); `sessions`, `accounts`, `verifications`, and `api_keys` follow the same generate-once-then-commit path and are omitted here for brevity — see `09-authentication-and-security.md` §3 for their exact columns.

## 4. Journey and business model

```sql
create table projects (
  id                     uuid primary key default gen_random_uuid(),
  workspace_id           uuid not null references workspaces(id) on delete cascade,
  name                   text not null,
  description            text,
  geography              text,
  jurisdiction           text,
  business_category       text,
  founder_objective        text not null default 'undecided', -- bootstrap | venture | grant | loan | lifestyle | undecided
  current_phase           text not null default 'discovery',
  current_pack_revision_id uuid,                                 -- FK added after pack_revisions exists
  archived_at              timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
create index projects_workspace_idx on projects(workspace_id);

create table pack_revisions (
  id                uuid primary key default gen_random_uuid(),
  project_id         uuid not null references projects(id) on delete cascade,
  revision_number     integer not null,
  parent_revision_id   uuid references pack_revisions(id),
  actor_type           text not null,           -- founder | agent | system
  actor_id             text,
  source_sprint_id      uuid,
  status               text not null default 'draft', -- draft | accepted | rejected | superseded
  proposed_changes      jsonb not null,
  accepted_changes       jsonb,
  validation_results     jsonb,
  gate_results           jsonb,
  dependency_invalidations jsonb,
  created_at             timestamptz not null default now(),
  accepted_at             timestamptz,
  unique (project_id, revision_number)
);
create index pack_revisions_project_idx on pack_revisions(project_id, revision_number desc);

alter table projects
  add constraint projects_current_pack_fk
  foreign key (current_pack_revision_id) references pack_revisions(id);

-- Structured pack sections are their own tables so agents/domain services can
-- write/query them directly instead of patching a single JSON blob (plan/03 §1 rule "no unvalidated JSON blob").

create table problems (
  id            uuid primary key default gen_random_uuid(),
  pack_revision_id uuid not null references pack_revisions(id) on delete cascade,
  statement      text not null,
  created_at      timestamptz not null default now()
);

create table beachheads (
  id             uuid primary key default gen_random_uuid(),
  pack_revision_id uuid not null references pack_revisions(id) on delete cascade,
  segment_definition text not null,
  persona_id       uuid,
  dmu_id            uuid,
  created_at        timestamptz not null default now()
);

create table money_rules (
  id               uuid primary key default gen_random_uuid(),
  project_id        uuid not null references projects(id) on delete cascade,
  pack_revision_id   uuid not null references pack_revisions(id),
  currency           text not null default 'INR',
  unit_of_sale        text not null,
  price               numeric(19,4) not null,
  billing_frequency     text,
  cost_structure_json    jsonb not null default '{}',
  is_current            boolean not null default true,
  created_at             timestamptz not null default now()
);
create unique index money_rules_one_current_per_project
  on money_rules(project_id) where is_current;

create table market_models (
  id               uuid primary key default gen_random_uuid(),
  pack_revision_id   uuid not null references pack_revisions(id) on delete cascade,
  formula_spec_json    jsonb not null,
  inputs_json           jsonb not null,
  computed_result_json   jsonb,
  created_at             timestamptz not null default now()
);
```

`business_models`, `unit_economics_models`, `offers`, `personas`, `dmus`, `alternatives`, `competitors`, `wedges` follow the identical shape (`id`, `pack_revision_id` FK, entity-specific columns, `created_at`) and are omitted here for brevity — implement them from the field lists in `plan/03-domain-model.md` §3 "Journey and business model" using the same pattern.

## 5. Evidence and learning

```sql
create table sources (
  id            uuid primary key default gen_random_uuid(),
  project_id     uuid not null references projects(id) on delete cascade,
  kind            text not null,           -- upload | url | interview_note
  status          text not null default 'pending', -- pending | uploaded | processing | ready | failed | tombstoned
  original_filename text,
  mime_type        text,
  size_bytes        bigint,
  s3_key             text,
  source_url          text,
  created_by_user_id   uuid references users(id),
  created_at            timestamptz not null default now()
);
create index sources_project_idx on sources(project_id);

create table source_snapshots (
  id           uuid primary key default gen_random_uuid(),
  source_id     uuid not null references sources(id) on delete cascade,
  content_hash   text not null,
  fetched_at      timestamptz not null default now(),
  parser_metadata_json jsonb not null default '{}'
);

create table documents (
  id                uuid primary key default gen_random_uuid(),
  source_id          uuid not null references sources(id) on delete cascade,
  latest_snapshot_id  uuid references source_snapshots(id),
  title                text,
  created_at            timestamptz not null default now()
);

create table content_blocks (
  id                 uuid primary key default gen_random_uuid(),
  document_id          uuid not null references documents(id) on delete cascade,
  source_snapshot_id     uuid not null references source_snapshots(id),
  block_type             text not null,        -- text | table | image | structured
  sequence_no             integer not null,
  text_content             text,
  structured_content_json  jsonb,
  locator_json              jsonb not null,     -- page/paragraph/table/cell/url-fragment/char-range
  search_vector             tsvector generated always as (to_tsvector('english', coalesce(text_content, ''))) stored,
  embedding                 vector(1536)         -- dimension depends on chosen embedding model; see 04-document-intelligence.md
);
create index content_blocks_document_idx on content_blocks(document_id);
create index content_blocks_search_idx on content_blocks using gin(search_vector);
create index content_blocks_embedding_idx on content_blocks using hnsw (embedding vector_cosine_ops);

create table citations (
  id                uuid primary key default gen_random_uuid(),
  source_snapshot_id  uuid not null references source_snapshots(id),
  content_block_id      uuid references content_blocks(id),
  locator_json           jsonb not null,
  created_at              timestamptz not null default now()
);

create table evidence_items (
  id             uuid primary key default gen_random_uuid(),
  project_id      uuid not null references projects(id) on delete cascade,
  summary          text not null,
  provenance_json    jsonb not null,          -- Provenance value object
  created_at         timestamptz not null default now()
);

create table evidence_item_citations (
  evidence_item_id uuid not null references evidence_items(id) on delete cascade,
  citation_id       uuid not null references citations(id) on delete cascade,
  primary key (evidence_item_id, citation_id)
);

create table interviews (
  id            uuid primary key default gen_random_uuid(),
  project_id     uuid not null references projects(id) on delete cascade,
  participant_type text not null,             -- non_friend | friend | known_contact
  consent_json     jsonb not null,
  conducted_at      timestamptz,
  created_at         timestamptz not null default now()
);

create table quotes (
  id            uuid primary key default gen_random_uuid(),
  interview_id    uuid references interviews(id) on delete cascade,
  source_snapshot_id uuid references source_snapshots(id),
  text_content       text not null,
  created_at           timestamptz not null default now()
);

create table assumptions (
  id            uuid primary key default gen_random_uuid(),
  project_id     uuid not null references projects(id) on delete cascade,
  statement       text not null,
  status           text not null default 'untested', -- untested|testing|supported|held|contradicted|killed
  created_at        timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index assumptions_project_idx on assumptions(project_id);

create table experiments (
  id            uuid primary key default gen_random_uuid(),
  project_id     uuid not null references projects(id) on delete cascade,
  hypothesis      text not null,
  method           text not null,
  threshold_json     jsonb not null,
  result_json         jsonb,
  status               text not null default 'planned',
  created_at            timestamptz not null default now()
);

create table assumption_experiments (
  assumption_id uuid not null references assumptions(id) on delete cascade,
  experiment_id  uuid not null references experiments(id) on delete cascade,
  primary key (assumption_id, experiment_id)
);

create table wtp_events (
  id             uuid primary key default gen_random_uuid(),
  experiment_id    uuid references experiments(id),
  offer_id           uuid,
  participant_class    text not null,          -- friend | known_contact | independent_prospect
  instrument            text not null,          -- paid_pilot | invoice | deposit | loi | concierge
  amount                numeric(19,4),
  currency               text,
  occurred_at              timestamptz not null default now()
);

create table metric_definitions (
  id           uuid primary key default gen_random_uuid(),
  project_id     uuid not null references projects(id) on delete cascade,
  name             text not null,
  unit              text not null,
  calculation_spec_json jsonb not null,
  created_at         timestamptz not null default now()
);

create table metric_observations (
  id           uuid primary key default gen_random_uuid(),
  metric_id      uuid not null references metric_definitions(id) on delete cascade,
  value            numeric(19,4) not null,
  observed_at        timestamptz not null default now()
);
```

## 6. Execution and governance

```sql
create table sprints (
  id             uuid primary key default gen_random_uuid(),
  project_id       uuid not null references projects(id) on delete cascade,
  status            text not null default 'draft', -- draft|contracted|running|paused|stalled|closed|failed
  contract_json       jsonb not null,
  budget_reserved_usd  numeric(19,4) not null default 0,
  budget_used_usd       numeric(19,4) not null default 0,
  closed_reason          text,
  created_at              timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
create index sprints_project_idx on sprints(project_id, created_at desc);

create table sprint_progress_events (
  id           uuid primary key default gen_random_uuid(),
  sprint_id      uuid not null references sprints(id) on delete cascade,
  sequence_no      bigint not null,
  event_type         text not null,        -- matches plan/01 §6 event categories, sprint-scoped subset
  payload_json         jsonb not null,
  created_at             timestamptz not null default now(),
  unique (sprint_id, sequence_no)
);
create index sprint_progress_sprint_idx on sprint_progress_events(sprint_id, sequence_no);

create table agent_definitions (
  id           uuid primary key default gen_random_uuid(),
  name           text not null,               -- 'orchestrator' | 'evidence_librarian' | 'critic' | ...
  version         integer not null,
  instructions_text text not null,
  capabilities_json  jsonb not null,
  policy_defaults_json jsonb not null,
  created_at          timestamptz not null default now(),
  unique (name, version)
);

create table agent_runs (
  id             uuid primary key default gen_random_uuid(),
  sprint_id        uuid not null references sprints(id) on delete cascade,
  agent_definition_id uuid not null references agent_definitions(id),
  model_profile      text not null,
  provider             text not null,
  model_id              text not null,
  input_tokens            integer,
  output_tokens             integer,
  cost_usd                   numeric(19,6),
  started_at                   timestamptz not null default now(),
  finished_at                   timestamptz,
  status                          text not null default 'running' -- running|completed|failed
);
create index agent_runs_sprint_idx on agent_runs(sprint_id);

create table proposed_changes (
  id           uuid primary key default gen_random_uuid(),
  agent_run_id   uuid not null references agent_runs(id) on delete cascade,
  target_section   text not null,
  change_json        jsonb not null,
  status               text not null default 'pending', -- pending|accepted|rejected
  created_at             timestamptz not null default now()
);

create table decisions (
  id           uuid primary key default gen_random_uuid(),
  project_id     uuid not null references projects(id) on delete cascade,
  options_json     jsonb not null,
  chosen_json        jsonb not null,
  rationale            text,
  evidence_refs_json     jsonb,
  gate_id                  uuid,
  sprint_id                 uuid references sprints(id),
  decided_by_user_id          uuid references users(id),
  created_at                   timestamptz not null default now()
);

create table gates (
  id           uuid primary key default gen_random_uuid(),
  project_id     uuid not null references projects(id) on delete cascade,
  gate_type       text not null,             -- gate_a | gate_b | gate_c
  rule_version      integer not null,
  inputs_json         jsonb not null,
  result               text not null,          -- passed|failed|waived|deferred
  evaluated_at            timestamptz not null default now()
);
create index gates_project_idx on gates(project_id, gate_type);

create table approval_requests (
  id                 uuid primary key default gen_random_uuid(),
  project_id           uuid not null references projects(id) on delete cascade,
  action_type            text not null,
  payload_json             jsonb not null,
  payload_hash               text not null,
  status                       text not null default 'pending', -- pending|approved|rejected|expired|execution_failed
  requested_by                  text not null,     -- agent run id or user id
  decided_by_user_id                uuid references users(id),
  expires_at                          timestamptz not null,
  created_at                           timestamptz not null default now(),
  decided_at                             timestamptz,
  unique (project_id, payload_hash, status)
);

create table policies (
  id           uuid primary key default gen_random_uuid(),
  workspace_id   uuid references workspaces(id) on delete cascade,
  project_id       uuid references projects(id) on delete cascade,
  policy_type        text not null,
  rule_json            jsonb not null,
  created_at             timestamptz not null default now(),
  check ((workspace_id is not null) or (project_id is not null))
);

create table budget_ledger_entries (
  id           uuid primary key default gen_random_uuid(),
  workspace_id   uuid not null references workspaces(id) on delete cascade,
  project_id       uuid references projects(id),
  sprint_id          uuid references sprints(id),
  entry_type           text not null,        -- reservation|usage|refund
  amount_usd             numeric(19,6) not null,
  created_at               timestamptz not null default now()
);
create index budget_ledger_workspace_idx on budget_ledger_entries(workspace_id, created_at desc);

create table usage_records (
  id            uuid primary key default gen_random_uuid(),
  agent_run_id    uuid references agent_runs(id),
  workspace_id      uuid not null references workspaces(id),
  provider            text not null,
  resource_type         text not null,       -- model | tool | storage | rendering
  quantity                numeric(19,6) not null,
  cost_usd                  numeric(19,6) not null,
  created_at                  timestamptz not null default now()
);
```

## 7. Output and integration

```sql
create table artifacts (
  id           uuid primary key default gen_random_uuid(),
  project_id     uuid not null references projects(id) on delete cascade,
  artifact_type    text not null,
  current_version_id uuid,
  created_at         timestamptz not null default now()
);

create table artifact_versions (
  id             uuid primary key default gen_random_uuid(),
  artifact_id      uuid not null references artifacts(id) on delete cascade,
  version_number     integer not null,
  pack_revision_id     uuid not null references pack_revisions(id),
  template_id            uuid,
  s3_key                   text not null,
  status                     text not null default 'generating', -- generating|current|stale|superseded|failed
  citations_json               jsonb,
  created_at                     timestamptz not null default now(),
  unique (artifact_id, version_number)
);
create index artifact_versions_artifact_idx on artifact_versions(artifact_id, version_number desc);

alter table artifacts
  add constraint artifacts_current_version_fk
  foreign key (current_version_id) references artifact_versions(id);

create table render_jobs (
  id                 uuid primary key default gen_random_uuid(),
  artifact_version_id  uuid not null references artifact_versions(id) on delete cascade,
  status                 text not null default 'queued', -- queued|running|succeeded|failed
  error_message            text,
  created_at                 timestamptz not null default now(),
  finished_at                  timestamptz
);

create table templates (
  id           uuid primary key default gen_random_uuid(),
  artifact_type  text not null,
  version          integer not null,
  definition_json    jsonb not null,
  created_at           timestamptz not null default now(),
  unique (artifact_type, version)
);

create table provider_connections (
  id                uuid primary key default gen_random_uuid(),
  workspace_id        uuid references workspaces(id) on delete cascade,
  user_id               uuid references users(id) on delete cascade,
  provider_family         text not null,       -- ai_gateway|anthropic|openai|bedrock|openai_compatible|ollama
  auth_mode                 text not null,
  credential_ref_encrypted    text,             -- Secrets Manager ARN or KMS-encrypted blob, never plaintext
  endpoint_or_region            text,
  allowed_models                  jsonb,
  allowed_data_classifications      jsonb,
  fallback_policy_json                jsonb,
  spend_limit_usd                       numeric(19,4),
  health_status                           text not null default 'unknown',
  last_validated_at                          timestamptz,
  created_at                                   timestamptz not null default now(),
  check ((workspace_id is not null) or (user_id is not null))
);

create table integration_connections (
  id           uuid primary key default gen_random_uuid(),
  workspace_id   uuid not null references workspaces(id) on delete cascade,
  provider         text not null,             -- calendar|email|whatsapp|storage|payment|crm|accounting
  auth_ref_encrypted text not null,
  scope_json           jsonb,
  revoked_at             timestamptz,
  created_at               timestamptz not null default now()
);

-- User-level MCP (Model Context Protocol) server connections — 00-tech-stack-and-versions.md §6a,
-- 08-agent-runtime-implementation.md §11. Deliberately keyed by user_id, not workspace_id: a server
-- one founder adds is never automatically available to a teammate.
create table user_mcp_servers (
  id                uuid primary key default gen_random_uuid(),
  user_id             uuid not null references users(id) on delete cascade,
  name                  text not null,
  transport               text not null,           -- http | sse
  url                       text not null,
  headers_encrypted           text,                 -- KMS-encrypted bearer/API-key header the server itself requires, never plaintext
  enabled                       boolean not null default true,
  health_status                   text not null default 'unknown', -- unknown|ok|unreachable|auth_failed
  last_tool_count                    integer,
  last_validated_at                     timestamptz,
  created_at                               timestamptz not null default now(),
  unique (user_id, url)
);
create index user_mcp_servers_user_idx on user_mcp_servers(user_id) where enabled;

create table tool_definitions (
  id           uuid primary key default gen_random_uuid(),
  name           text not null,
  version          integer not null,
  risk_class         text not null,           -- read|compute|draft|side_effect
  input_schema_json    jsonb not null,
  output_schema_json     jsonb not null,
  created_at               timestamptz not null default now(),
  unique (name, version)
);

create table tool_calls (
  id             uuid primary key default gen_random_uuid(),
  agent_run_id     uuid not null references agent_runs(id) on delete cascade,
  tool_definition_id uuid not null references tool_definitions(id),
  status               text not null default 'proposed', -- proposed|approved|executed|blocked|failed
  input_json              jsonb not null,
  output_json               jsonb,
  approval_request_id         uuid references approval_requests(id),
  idempotency_key                text,
  created_at                       timestamptz not null default now(),
  finished_at                        timestamptz
);
create index tool_calls_agent_run_idx on tool_calls(agent_run_id);
```

## 8. Domain events (append-only audit/projection log)

```sql
create table domain_events (
  id             bigint generated always as identity primary key,
  event_type       text not null,
  workspace_id       uuid not null,
  project_id           uuid,
  actor_type             text not null,
  actor_id                 text,
  correlation_id             uuid not null,
  causation_id                  uuid,
  schema_version                  integer not null default 1,
  payload_json                       jsonb not null,
  occurred_at                           timestamptz not null default now()
);
create index domain_events_workspace_idx on domain_events(workspace_id, occurred_at desc);
create index domain_events_project_idx on domain_events(project_id, occurred_at desc);
create index domain_events_correlation_idx on domain_events(correlation_id);
```

`domain_events` is the implementation of `plan/01-system-architecture.md` §6 — every event category listed there is a `event_type` value here. This table is never queried for primary UI reads (read models are served by the specific entity tables above); it exists for audit, replay, and building future projections.

## 9. Row-level tenancy

Every table above reachable from a `project_id` or `workspace_id` gets a Postgres Row-Level Security policy in production, in addition to application-level checks, as defense in depth — see `09-authentication-and-security.md` §6 for the exact `USING` clauses and the session-variable (`app.current_workspace_ids`) mechanism the API sets per request.

## 10. Migration workflow

There is no schema-definition language and no `generate` step from code — every migration is a plain, hand-written `.sql` file (the one exception is the one-time Better Auth migration, §3 above, which is generated once by Better Auth's own CLI and then treated identically to a hand-written one from that point on).

1. Write `packages/db/migrations/<timestamp>_<description>.up.sql` (and a matching `.down.sql`) by hand, following the DDL conventions in §1.
2. Run it locally with `pnpm --filter @foundry/db migrate up` (`node-pg-migrate`, pointed at the local Docker Compose Postgres) and confirm it applies cleanly to a copy of the current schema.
3. Commit the migration file(s) alongside the application code change in the same PR — a reviewer reads the actual SQL, not a diff of a schema DSL.
4. CI runs `node-pg-migrate up` against a throwaway Postgres service container as part of the integration test job (`11-testing-strategy.md` §5).
5. Deployment runs `node-pg-migrate up` against the real database as a one-off ECS task **before** the new `web`/`worker` task definition receives traffic (`10-aws-infrastructure-and-deployment.md` §7) — migrations are never run from inside a request handler or on container boot race conditions. `node-pg-migrate` tracks applied migrations in its own `pgmigrations` table, so this step is idempotent.

Never hand-edit a committed migration file after it has been applied to any shared environment (`dev`/`staging`/`production`); create a new migration instead.
