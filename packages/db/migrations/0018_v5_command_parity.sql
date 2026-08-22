-- Up Migration

-- V5 founder-complete stores: record support links, inspectable project memory,
-- interview import candidates, and operation-scoped capability tokens.

create table record_support_links (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  workspace_id uuid not null references workspaces (id) on delete cascade,
  record_item_id uuid not null references record_items (id) on delete cascade,
  target_kind text not null,
  target_id uuid not null,
  relation_type text not null,
  created_at timestamptz not null default now(),
  unique (record_item_id, target_kind, target_id, relation_type)
);
create index record_support_links_project_idx on record_support_links (project_id);
create index record_support_links_target_idx on record_support_links (target_kind, target_id);

create table project_memory_entries (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  workspace_id uuid not null references workspaces (id) on delete cascade,
  kind text not null,
  body text not null,
  source_kind text not null,
  source_ids jsonb not null default '[]'::jsonb,
  author_type text not null,
  author_id uuid,
  record_version_id uuid references business_record_versions (id) on delete set null,
  stale boolean not null default false,
  generated_at timestamptz not null default now(),
  superseded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index project_memory_entries_project_idx
  on project_memory_entries (project_id, superseded_at, created_at desc);

create table interview_import_batches (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  workspace_id uuid not null references workspaces (id) on delete cascade,
  source_id uuid not null references sources (id) on delete cascade,
  source_snapshot_id uuid references source_snapshots (id) on delete set null,
  classification text not null,
  status text not null,
  extractor_version text not null,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index interview_import_batches_project_idx
  on interview_import_batches (project_id, created_at desc);

create table interview_import_candidates (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references interview_import_batches (id) on delete cascade,
  project_id uuid not null references projects (id) on delete cascade,
  workspace_id uuid not null references workspaces (id) on delete cascade,
  position integer not null,
  label text not null,
  participant_type text not null,
  consent_given boolean not null default false,
  consent_unknown boolean not null default true,
  notes text not null default '',
  quotes jsonb not null default '[]'::jsonb,
  excerpt text not null default '',
  warnings jsonb not null default '[]'::jsonb,
  status text not null,
  founder_edits jsonb not null default '{}'::jsonb,
  accepted_interview_id uuid references interviews (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (batch_id, position)
);
create index interview_import_candidates_batch_idx on interview_import_candidates (batch_id);

create table capability_tokens (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  operation_id uuid not null references cofounder_operations (id) on delete cascade,
  project_id uuid not null references projects (id) on delete cascade,
  workspace_id uuid not null references workspaces (id) on delete cascade,
  actor_user_id uuid not null,
  allowed_capabilities text[] not null,
  max_invocations integer not null,
  invocation_count integer not null default 0,
  expires_at timestamptz not null,
  canceled boolean not null default false,
  created_at timestamptz not null default now()
);
create index capability_tokens_operation_idx on capability_tokens (operation_id);

grant select, insert, update, delete on
  record_support_links,
  project_memory_entries,
  interview_import_batches,
  interview_import_candidates,
  capability_tokens
to foundry_app;

alter table record_support_links enable row level security;
alter table record_support_links force row level security;
create policy tenant_isolation on record_support_links
  using (foundry_project_matches_workspace(project_id, workspace_id))
  with check (foundry_project_matches_workspace(project_id, workspace_id));

alter table project_memory_entries enable row level security;
alter table project_memory_entries force row level security;
create policy tenant_isolation on project_memory_entries
  using (foundry_project_matches_workspace(project_id, workspace_id))
  with check (foundry_project_matches_workspace(project_id, workspace_id));

alter table interview_import_batches enable row level security;
alter table interview_import_batches force row level security;
create policy tenant_isolation on interview_import_batches
  using (foundry_project_matches_workspace(project_id, workspace_id))
  with check (foundry_project_matches_workspace(project_id, workspace_id));

alter table interview_import_candidates enable row level security;
alter table interview_import_candidates force row level security;
create policy tenant_isolation on interview_import_candidates
  using (foundry_project_matches_workspace(project_id, workspace_id))
  with check (foundry_project_matches_workspace(project_id, workspace_id));

alter table capability_tokens enable row level security;
alter table capability_tokens force row level security;
create policy tenant_isolation on capability_tokens
  using (foundry_project_matches_workspace(project_id, workspace_id))
  with check (foundry_project_matches_workspace(project_id, workspace_id));

-- Down Migration

drop policy if exists tenant_isolation on capability_tokens;
drop policy if exists tenant_isolation on interview_import_candidates;
drop policy if exists tenant_isolation on interview_import_batches;
drop policy if exists tenant_isolation on project_memory_entries;
drop policy if exists tenant_isolation on record_support_links;

drop table if exists capability_tokens;
drop table if exists interview_import_candidates;
drop table if exists interview_import_batches;
drop table if exists project_memory_entries;
drop table if exists record_support_links;
