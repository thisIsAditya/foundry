-- Up Migration

create table templates (
  id uuid primary key default gen_random_uuid(),
  artifact_type text not null,
  version integer not null,
  definition_json jsonb not null,
  created_at timestamptz not null default now(),
  unique (artifact_type, version)
);

create table render_jobs (
  id uuid primary key default gen_random_uuid(),
  artifact_version_id uuid not null references artifact_versions (id) on delete cascade,
  status text not null default 'queued',
  error_message text,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
create index render_jobs_version_idx on render_jobs (artifact_version_id, created_at desc);

alter table artifact_versions
  add constraint artifact_versions_template_fk
  foreign key (template_id) references templates (id);

insert into templates (artifact_type, version, definition_json)
values
  (
    'company_pack',
    1,
    '{"formats":["markdown","html","pdf"],"primary":"markdown"}'::jsonb
  ),
  (
    'lean_canvas',
    1,
    '{"formats":["html","markdown","pdf"],"primary":"html"}'::jsonb
  ),
  (
    'business_model_canvas',
    1,
    '{"formats":["html","markdown","pdf"],"primary":"html"}'::jsonb
  ),
  (
    'evidence_report',
    1,
    '{"formats":["markdown","html","pdf"],"primary":"markdown"}'::jsonb
  ),
  (
    'one_page_brief',
    1,
    '{"formats":["pdf","markdown","html"],"primary":"pdf"}'::jsonb
  ),
  (
    'slide_outline',
    1,
    '{"formats":["markdown","html","pdf"],"primary":"markdown"}'::jsonb
  ),
  (
    'market_economics_workbook',
    1,
    '{"formats":["xlsx"],"primary":"xlsx"}'::jsonb
  );

grant select on templates to foundry_app;
grant select, insert, update, delete on render_jobs to foundry_app;

alter table render_jobs enable row level security;
alter table render_jobs force row level security;
create policy tenant_isolation on render_jobs
  using (
    exists (
      select 1
      from artifact_versions av
      join artifacts a on a.id = av.artifact_id
      join projects p on p.id = a.project_id
      where av.id = render_jobs.artifact_version_id
        and foundry_in_current_workspaces(p.workspace_id)
    )
  );

-- Down Migration

drop policy if exists tenant_isolation on render_jobs;
alter table artifact_versions drop constraint if exists artifact_versions_template_fk;
drop table if exists render_jobs;
drop table if exists templates;
