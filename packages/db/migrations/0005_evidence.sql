-- Up Migration

create table sources (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  kind text not null,
  status text not null default 'pending',
  original_filename text,
  mime_type text,
  size_bytes bigint,
  s3_key text,
  source_url text,
  data_classification text not null default 'internal',
  failure_reason text,
  created_by_user_id uuid references users (id),
  created_at timestamptz not null default now()
);
create index sources_project_idx on sources (project_id);

create table source_snapshots (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references sources (id) on delete cascade,
  content_hash text not null,
  fetched_at timestamptz not null default now(),
  parser_metadata_json jsonb not null default '{}'
);

create table documents (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references sources (id) on delete cascade,
  latest_snapshot_id uuid references source_snapshots (id),
  title text,
  data_classification text not null default 'internal',
  created_at timestamptz not null default now()
);

create table content_blocks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents (id) on delete cascade,
  source_snapshot_id uuid not null references source_snapshots (id),
  block_type text not null,
  sequence_no integer not null,
  text_content text,
  structured_content_json jsonb,
  locator_json jsonb not null,
  search_vector tsvector generated always as (
    to_tsvector('english', coalesce(text_content, ''))
  ) stored,
  embedding vector(1536)
);
create index content_blocks_document_idx on content_blocks (document_id);
create index content_blocks_search_idx on content_blocks using gin (search_vector);

grant usage, select on all sequences in schema public to foundry_app;
grant select, insert, update, delete on sources, source_snapshots, documents, content_blocks to foundry_app;

alter table sources enable row level security;
alter table sources force row level security;
create policy tenant_isolation on sources
  using (
    exists (
      select 1
      from projects p
      where p.id = sources.project_id
        and p.workspace_id::text = any (
          coalesce(nullif(current_setting('app.current_workspace_ids', true), ''), '{}')::text[]
        )
    )
  );

alter table source_snapshots enable row level security;
alter table source_snapshots force row level security;
create policy tenant_isolation on source_snapshots
  using (
    exists (
      select 1
      from sources s
      join projects p on p.id = s.project_id
      where s.id = source_snapshots.source_id
        and p.workspace_id::text = any (
          coalesce(nullif(current_setting('app.current_workspace_ids', true), ''), '{}')::text[]
        )
    )
  );

alter table documents enable row level security;
alter table documents force row level security;
create policy tenant_isolation on documents
  using (
    exists (
      select 1
      from sources s
      join projects p on p.id = s.project_id
      where s.id = documents.source_id
        and p.workspace_id::text = any (
          coalesce(nullif(current_setting('app.current_workspace_ids', true), ''), '{}')::text[]
        )
    )
  );

alter table content_blocks enable row level security;
alter table content_blocks force row level security;
create policy tenant_isolation on content_blocks
  using (
    exists (
      select 1
      from documents d
      join sources s on s.id = d.source_id
      join projects p on p.id = s.project_id
      where d.id = content_blocks.document_id
        and p.workspace_id::text = any (
          coalesce(nullif(current_setting('app.current_workspace_ids', true), ''), '{}')::text[]
        )
    )
  );

-- Down Migration

drop policy if exists tenant_isolation on content_blocks;
drop policy if exists tenant_isolation on documents;
drop policy if exists tenant_isolation on source_snapshots;
drop policy if exists tenant_isolation on sources;
drop table if exists content_blocks;
drop table if exists documents;
drop table if exists source_snapshots;
drop table if exists sources;
