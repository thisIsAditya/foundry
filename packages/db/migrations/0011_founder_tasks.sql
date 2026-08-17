-- Up Migration

create table founder_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  title text not null,
  explanation text not null,
  linked_job_id uuid references sprints (id),
  linked_section_keys text[] not null default '{}',
  linked_score_dimensions text[] not null default '{}',
  preparation_json jsonb not null default '{}'::jsonb,
  evidence_schema_json jsonb not null default '{}'::jsonb,
  status text not null default 'proposed'
    check (status in ('proposed', 'active', 'completed', 'deferred', 'skipped')),
  due_or_suggested_at timestamptz,
  defer_or_skip_reason text,
  completion_evidence_ref jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index founder_tasks_project_idx on founder_tasks (project_id, status);

grant select, insert, update, delete on founder_tasks to foundry_app;

alter table founder_tasks enable row level security;
alter table founder_tasks force row level security;
create policy tenant_isolation on founder_tasks
  using (
    exists (
      select 1 from projects p
      where p.id = founder_tasks.project_id
        and foundry_in_current_workspaces(p.workspace_id)
    )
  );

-- Down Migration

drop policy if exists tenant_isolation on founder_tasks;
drop table if exists founder_tasks;
