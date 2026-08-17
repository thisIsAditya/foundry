-- Up Migration

create table plan_scores (
  id uuid primary key default gen_random_uuid(),
  pack_revision_id uuid not null references pack_revisions (id) on delete cascade,
  overall numeric(5, 2) not null,
  dimensions_json jsonb not null,
  rule_version text not null,
  reasons_json jsonb not null default '[]'::jsonb,
  top_actions_json jsonb not null default '[]'::jsonb,
  calculated_at timestamptz not null default now()
);
create index plan_scores_revision_idx on plan_scores (pack_revision_id, calculated_at desc);

grant select, insert, update, delete on plan_scores to foundry_app;

alter table plan_scores enable row level security;
alter table plan_scores force row level security;
create policy tenant_isolation on plan_scores
  using (
    exists (
      select 1
      from pack_revisions r
      join projects p on p.id = r.project_id
      where r.id = plan_scores.pack_revision_id
        and foundry_in_current_workspaces(p.workspace_id)
    )
  );

-- Down Migration

drop policy if exists tenant_isolation on plan_scores;
drop table if exists plan_scores;
