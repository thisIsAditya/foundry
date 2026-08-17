-- Up Migration

alter table sources add column if not exists source_category text
  check (source_category in ('web', 'company', 'academic', 'market_report', 'upload', 'interview_note'));
alter table sources add column if not exists geographic_scope text;
alter table sources add column if not exists reliability_notes text;

create table research_findings (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  job_id uuid not null references sprints (id) on delete cascade,
  claim text not null,
  citation_ids uuid[] not null default '{}',
  confidence_json jsonb not null,
  affected_section_keys text[] not null default '{}',
  conflicts_with_finding_ids uuid[] not null default '{}',
  stale_at timestamptz,
  extraction_method text not null
    check (extraction_method in ('web_search', 'web_fetch', 'company_profile', 'academic', 'market_report')),
  created_at timestamptz not null default now()
);
create index research_findings_project_idx on research_findings (project_id, created_at desc);
create index research_findings_job_idx on research_findings (job_id);

grant select, insert, update, delete on research_findings to foundry_app;

alter table research_findings enable row level security;
alter table research_findings force row level security;
create policy tenant_isolation on research_findings
  using (
    exists (
      select 1 from projects p
      where p.id = research_findings.project_id
        and foundry_in_current_workspaces(p.workspace_id)
    )
  );

-- Down Migration

drop policy if exists tenant_isolation on research_findings;
drop table if exists research_findings;

alter table sources drop column if exists reliability_notes;
alter table sources drop column if exists geographic_scope;
alter table sources drop column if exists source_category;
