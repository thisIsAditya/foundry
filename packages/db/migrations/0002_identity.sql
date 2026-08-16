-- Up Migration

create table workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_user_id uuid not null references users (id),
  plan text not null default 'free',
  default_provider_policy jsonb not null default '{}',
  default_retention_policy jsonb not null default '{}',
  locale text not null default 'en-IN',
  timezone text not null default 'UTC',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table workspace_memberships (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  user_id uuid not null references users (id) on delete cascade,
  role text not null,
  invited_by uuid references users (id),
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);
create index workspace_memberships_user_idx on workspace_memberships (user_id);

create table projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  name text not null,
  description text,
  geography text,
  jurisdiction text,
  business_category text,
  founder_objective text not null default 'undecided',
  -- plan/00 §4 journey start; 06 §4's 'discovery' is not a JourneyPhase
  current_phase text not null default 'diagnose',
  current_pack_revision_id uuid,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index projects_workspace_idx on projects (workspace_id);

create table project_memberships (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  user_id uuid not null references users (id) on delete cascade,
  role_override text,
  created_at timestamptz not null default now(),
  unique (project_id, user_id)
);

create table notification_endpoints (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  workspace_id uuid not null references workspaces (id) on delete cascade,
  channel text not null,
  target text not null,
  consented_at timestamptz not null default now(),
  revoked_at timestamptz
);

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'foundry_app') then
    create role foundry_app nologin nosuperuser nobypassrls;
  end if;
  if not pg_has_role(current_user, 'foundry_app', 'member') then
    execute format('grant foundry_app to %I', current_user);
  end if;
end
$$;

grant usage on schema public to foundry_app;
grant select, insert, update, delete on all tables in schema public to foundry_app;
alter default privileges in schema public grant select, insert, update, delete on tables to foundry_app;

alter table workspaces enable row level security;
alter table workspaces force row level security;
create policy tenant_isolation on workspaces
  using (
    id::text = any (
      coalesce(nullif(current_setting('app.current_workspace_ids', true), ''), '{}')::text[]
    )
  );

alter table workspace_memberships enable row level security;
alter table workspace_memberships force row level security;
create policy tenant_isolation on workspace_memberships
  using (
    workspace_id::text = any (
      coalesce(nullif(current_setting('app.current_workspace_ids', true), ''), '{}')::text[]
    )
  );

alter table projects enable row level security;
alter table projects force row level security;
create policy tenant_isolation on projects
  using (
    workspace_id::text = any (
      coalesce(nullif(current_setting('app.current_workspace_ids', true), ''), '{}')::text[]
    )
  );

alter table project_memberships enable row level security;
alter table project_memberships force row level security;
create policy tenant_isolation on project_memberships
  using (
    exists (
      select 1
      from projects p
      where p.id = project_memberships.project_id
        and p.workspace_id::text = any (
          coalesce(nullif(current_setting('app.current_workspace_ids', true), ''), '{}')::text[]
        )
    )
  );

alter table notification_endpoints enable row level security;
alter table notification_endpoints force row level security;
create policy tenant_isolation on notification_endpoints
  using (
    workspace_id::text = any (
      coalesce(nullif(current_setting('app.current_workspace_ids', true), ''), '{}')::text[]
    )
  );

-- Down Migration

drop policy if exists tenant_isolation on notification_endpoints;
drop policy if exists tenant_isolation on project_memberships;
drop policy if exists tenant_isolation on projects;
drop policy if exists tenant_isolation on workspace_memberships;
drop policy if exists tenant_isolation on workspaces;

drop table if exists notification_endpoints;
drop table if exists project_memberships;
drop table if exists projects;
drop table if exists workspace_memberships;
drop table if exists workspaces;
