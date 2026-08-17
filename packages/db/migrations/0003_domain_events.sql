-- Up Migration

create table domain_events (
  id bigint generated always as identity primary key,
  event_type text not null,
  workspace_id uuid not null,
  project_id uuid,
  actor_type text not null,
  actor_id text,
  correlation_id uuid not null,
  causation_id uuid,
  schema_version integer not null default 1,
  payload_json jsonb not null,
  occurred_at timestamptz not null default now()
);
create index domain_events_workspace_idx on domain_events (workspace_id, occurred_at desc);
create index domain_events_project_idx on domain_events (project_id, occurred_at desc);
create index domain_events_correlation_idx on domain_events (correlation_id);

grant usage, select on all sequences in schema public to foundry_app;
alter default privileges in schema public grant usage, select on sequences to foundry_app;

alter table domain_events enable row level security;
alter table domain_events force row level security;
create policy tenant_isolation on domain_events
  using (
    workspace_id::text = any (
      coalesce(nullif(current_setting('app.current_workspace_ids', true), ''), '{}')::text[]
    )
  );

-- Down Migration

drop policy if exists tenant_isolation on domain_events;
drop table if exists domain_events;
