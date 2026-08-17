-- Up Migration

create table problems (
  id uuid primary key default gen_random_uuid(),
  pack_revision_id uuid not null references pack_revisions (id) on delete cascade,
  statement text not null,
  created_at timestamptz not null default now()
);
create index problems_pack_revision_idx on problems (pack_revision_id);

create table citations (
  id uuid primary key default gen_random_uuid(),
  source_snapshot_id uuid not null references source_snapshots (id) on delete cascade,
  content_block_id uuid references content_blocks (id),
  locator_json jsonb not null,
  created_at timestamptz not null default now()
);
create index citations_source_snapshot_idx on citations (source_snapshot_id);

create table evidence_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  summary text not null,
  provenance_json jsonb not null,
  created_at timestamptz not null default now()
);
create index evidence_items_project_idx on evidence_items (project_id, created_at desc);

create table evidence_item_citations (
  evidence_item_id uuid not null references evidence_items (id) on delete cascade,
  citation_id uuid not null references citations (id) on delete cascade,
  primary key (evidence_item_id, citation_id)
);

create table assumptions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  statement text not null,
  status text not null default 'untested'
    check (status in ('untested', 'testing', 'supported', 'held', 'contradicted', 'killed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index assumptions_project_idx on assumptions (project_id, status);

create table personas (
  id uuid primary key default gen_random_uuid(),
  pack_revision_id uuid not null references pack_revisions (id) on delete cascade,
  beachhead_id uuid not null references beachheads (id) on delete cascade,
  profile text not null,
  evidence_item_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);
create index personas_pack_revision_idx on personas (pack_revision_id);

create table alternatives (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  pack_revision_id uuid references pack_revisions (id) on delete cascade,
  problem_id uuid references problems (id),
  description text not null,
  created_at timestamptz not null default now()
);
create index alternatives_project_idx on alternatives (project_id, created_at desc);

create table competitors (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  name text not null,
  source_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);
create index competitors_project_idx on competitors (project_id, created_at desc);

create table wedges (
  id uuid primary key default gen_random_uuid(),
  pack_revision_id uuid not null references pack_revisions (id) on delete cascade,
  statement text not null,
  alternative_ids uuid[] not null default '{}',
  evidence_item_ids uuid[] not null default '{}',
  assumption_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);
create index wedges_pack_revision_idx on wedges (pack_revision_id);

grant select, insert, update, delete on
  problems,
  citations,
  evidence_items,
  evidence_item_citations,
  assumptions,
  personas,
  alternatives,
  competitors,
  wedges
to foundry_app;

alter table problems enable row level security;
alter table problems force row level security;
create policy tenant_isolation on problems
  using (
    exists (
      select 1
      from pack_revisions r
      join projects p on p.id = r.project_id
      where r.id = problems.pack_revision_id
        and foundry_in_current_workspaces(p.workspace_id)
    )
  );

alter table citations enable row level security;
alter table citations force row level security;
create policy tenant_isolation on citations
  using (
    exists (
      select 1
      from source_snapshots ss
      join sources s on s.id = ss.source_id
      join projects p on p.id = s.project_id
      where ss.id = citations.source_snapshot_id
        and foundry_in_current_workspaces(p.workspace_id)
    )
  );

alter table evidence_items enable row level security;
alter table evidence_items force row level security;
create policy tenant_isolation on evidence_items
  using (
    exists (
      select 1 from projects p
      where p.id = evidence_items.project_id
        and foundry_in_current_workspaces(p.workspace_id)
    )
  );

alter table evidence_item_citations enable row level security;
alter table evidence_item_citations force row level security;
create policy tenant_isolation on evidence_item_citations
  using (
    exists (
      select 1
      from evidence_items ei
      join projects p on p.id = ei.project_id
      where ei.id = evidence_item_citations.evidence_item_id
        and foundry_in_current_workspaces(p.workspace_id)
    )
  );

alter table assumptions enable row level security;
alter table assumptions force row level security;
create policy tenant_isolation on assumptions
  using (
    exists (
      select 1 from projects p
      where p.id = assumptions.project_id
        and foundry_in_current_workspaces(p.workspace_id)
    )
  );

alter table personas enable row level security;
alter table personas force row level security;
create policy tenant_isolation on personas
  using (
    exists (
      select 1
      from pack_revisions r
      join projects p on p.id = r.project_id
      where r.id = personas.pack_revision_id
        and foundry_in_current_workspaces(p.workspace_id)
    )
  );

alter table alternatives enable row level security;
alter table alternatives force row level security;
create policy tenant_isolation on alternatives
  using (
    exists (
      select 1 from projects p
      where p.id = alternatives.project_id
        and foundry_in_current_workspaces(p.workspace_id)
    )
  );

alter table competitors enable row level security;
alter table competitors force row level security;
create policy tenant_isolation on competitors
  using (
    exists (
      select 1 from projects p
      where p.id = competitors.project_id
        and foundry_in_current_workspaces(p.workspace_id)
    )
  );

alter table wedges enable row level security;
alter table wedges force row level security;
create policy tenant_isolation on wedges
  using (
    exists (
      select 1
      from pack_revisions r
      join projects p on p.id = r.project_id
      where r.id = wedges.pack_revision_id
        and foundry_in_current_workspaces(p.workspace_id)
    )
  );

-- Down Migration

drop policy if exists tenant_isolation on wedges;
drop policy if exists tenant_isolation on competitors;
drop policy if exists tenant_isolation on alternatives;
drop policy if exists tenant_isolation on personas;
drop policy if exists tenant_isolation on assumptions;
drop policy if exists tenant_isolation on evidence_item_citations;
drop policy if exists tenant_isolation on evidence_items;
drop policy if exists tenant_isolation on citations;
drop policy if exists tenant_isolation on problems;

drop table if exists wedges;
drop table if exists competitors;
drop table if exists alternatives;
drop table if exists personas;
drop table if exists assumptions;
drop table if exists evidence_item_citations;
drop table if exists evidence_items;
drop table if exists citations;
drop table if exists problems;
