-- Up Migration

create or replace function foundry_in_current_workspaces(p_workspace_id uuid)
returns boolean
language sql
stable
as $$
  select p_workspace_id::text = any (
    coalesce(nullif(current_setting('app.current_workspace_ids', true), ''), '{}')::text[]
  );
$$;

create table pack_revisions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  revision_number integer not null,
  parent_revision_id uuid references pack_revisions (id),
  actor_type text not null,
  actor_id text,
  source_sprint_id uuid,
  status text not null default 'draft',
  proposed_changes jsonb not null,
  accepted_changes jsonb,
  validation_results jsonb,
  gate_results jsonb,
  dependency_invalidations jsonb,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  unique (project_id, revision_number)
);
create index pack_revisions_project_idx on pack_revisions (project_id, revision_number desc);

alter table projects
  add constraint projects_current_pack_fk
  foreign key (current_pack_revision_id) references pack_revisions (id);

create table beachheads (
  id uuid primary key default gen_random_uuid(),
  pack_revision_id uuid not null references pack_revisions (id) on delete cascade,
  segment_definition text not null,
  persona_id uuid,
  dmu_id uuid,
  created_at timestamptz not null default now()
);

create table dmus (
  id uuid primary key default gen_random_uuid(),
  pack_revision_id uuid not null references pack_revisions (id) on delete cascade,
  beachhead_id uuid not null references beachheads (id) on delete cascade,
  "user" text,
  champion text,
  buyer text,
  approver text,
  veto text,
  procurement text,
  created_at timestamptz not null default now()
);

create table interviews (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  participant_type text not null,
  consent_json jsonb not null,
  conducted_at timestamptz,
  created_at timestamptz not null default now()
);

create table quotes (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid references interviews (id) on delete cascade,
  source_snapshot_id uuid references source_snapshots (id),
  text_content text not null,
  created_at timestamptz not null default now()
);

create table sprints (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  status text not null default 'draft',
  contract_json jsonb not null,
  budget_reserved_usd numeric(19, 4) not null default 0,
  budget_used_usd numeric(19, 4) not null default 0,
  closed_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index sprints_project_idx on sprints (project_id, created_at desc);

create table sprint_progress_events (
  id uuid primary key default gen_random_uuid(),
  sprint_id uuid not null references sprints (id) on delete cascade,
  sequence_no bigint not null,
  event_type text not null,
  payload_json jsonb not null,
  created_at timestamptz not null default now(),
  unique (sprint_id, sequence_no)
);
create index sprint_progress_sprint_idx on sprint_progress_events (sprint_id, sequence_no);

create table agent_definitions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  version integer not null,
  instructions_text text not null,
  capabilities_json jsonb not null,
  policy_defaults_json jsonb not null,
  created_at timestamptz not null default now(),
  unique (name, version)
);

create table agent_runs (
  id uuid primary key default gen_random_uuid(),
  sprint_id uuid references sprints (id) on delete cascade,
  agent_definition_id uuid not null references agent_definitions (id),
  model_profile text not null,
  provider text not null,
  model_id text not null,
  input_tokens integer,
  output_tokens integer,
  cost_usd numeric(19, 6),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running'
);
create index agent_runs_sprint_idx on agent_runs (sprint_id);

create table gates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  gate_type text not null,
  rule_version integer not null,
  inputs_json jsonb not null,
  result text not null,
  evaluated_at timestamptz not null default now()
);
create index gates_project_idx on gates (project_id, gate_type);

create table usage_records (
  id uuid primary key default gen_random_uuid(),
  agent_run_id uuid references agent_runs (id),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  provider text not null,
  resource_type text not null,
  quantity numeric(19, 6) not null,
  cost_usd numeric(19, 6) not null,
  created_at timestamptz not null default now()
);

create table provider_connections (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces (id) on delete cascade,
  user_id uuid references users (id) on delete cascade,
  provider_family text not null,
  auth_mode text not null,
  credential_ref_encrypted text,
  endpoint_or_region text,
  allowed_models jsonb,
  allowed_data_classifications jsonb,
  fallback_policy_json jsonb,
  spend_limit_usd numeric(19, 4),
  health_status text not null default 'unknown',
  last_validated_at timestamptz,
  created_at timestamptz not null default now(),
  check ((workspace_id is not null) or (user_id is not null))
);

create table user_mcp_servers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  name text not null,
  transport text not null,
  url text not null,
  headers_encrypted text,
  enabled boolean not null default true,
  health_status text not null default 'unknown',
  last_tool_count integer,
  last_validated_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, url)
);
create index user_mcp_servers_user_idx on user_mcp_servers (user_id) where enabled;

insert into agent_definitions (name, version, instructions_text, capabilities_json, policy_defaults_json)
values
  (
    'orchestrator',
    1,
    $orch$You are the founder-facing orchestrator. Diagnose the current phase, ask only questions that can change the next task, and never impersonate the founder or invent evidence. If the founder has only supplied an idea, clarify the problem — do not generate market size or a business plan.$orch$,
    '{"modelProfile":"coordinator"}'::jsonb,
    '{"maxToolRiskClass":"compute"}'::jsonb
  ),
  (
    'critic',
    1,
    $critic$You are an independent critic. Evaluate the proposed result against the pack snapshot, contract, cited evidence, and rubric. You must not write the plan you are grading or hide defects to finish the sprint. Simulated or friend interviews cannot satisfy Gate A. Return GO, PIVOT, or KILL with instant-fail flags.$critic$,
    '{"modelProfile":"critic"}'::jsonb,
    '{}'::jsonb
  ),
  (
    'mock_worker',
    1,
    $mock$You are a bounded research worker. Stay inside the sprint contract. Do not negotiate with other workers. Return findings with evidence references.$mock$,
    '{"modelProfile":"researchWorker"}'::jsonb,
    '{}'::jsonb
  );

grant select, insert, update, delete on
  pack_revisions,
  beachheads,
  dmus,
  interviews,
  quotes,
  sprints,
  sprint_progress_events,
  agent_definitions,
  agent_runs,
  gates,
  usage_records,
  provider_connections,
  user_mcp_servers
to foundry_app;

alter table pack_revisions enable row level security;
alter table pack_revisions force row level security;
create policy tenant_isolation on pack_revisions
  using (
    exists (
      select 1 from projects p
      where p.id = pack_revisions.project_id
        and foundry_in_current_workspaces(p.workspace_id)
    )
  );

alter table beachheads enable row level security;
alter table beachheads force row level security;
create policy tenant_isolation on beachheads
  using (
    exists (
      select 1
      from pack_revisions r
      join projects p on p.id = r.project_id
      where r.id = beachheads.pack_revision_id
        and foundry_in_current_workspaces(p.workspace_id)
    )
  );

alter table dmus enable row level security;
alter table dmus force row level security;
create policy tenant_isolation on dmus
  using (
    exists (
      select 1
      from pack_revisions r
      join projects p on p.id = r.project_id
      where r.id = dmus.pack_revision_id
        and foundry_in_current_workspaces(p.workspace_id)
    )
  );

alter table interviews enable row level security;
alter table interviews force row level security;
create policy tenant_isolation on interviews
  using (
    exists (
      select 1 from projects p
      where p.id = interviews.project_id
        and foundry_in_current_workspaces(p.workspace_id)
    )
  );

alter table quotes enable row level security;
alter table quotes force row level security;
create policy tenant_isolation on quotes
  using (
    (
      quotes.interview_id is not null
      and exists (
        select 1
        from interviews i
        join projects p on p.id = i.project_id
        where i.id = quotes.interview_id
          and foundry_in_current_workspaces(p.workspace_id)
      )
    )
    or (
      quotes.source_snapshot_id is not null
      and exists (
        select 1
        from source_snapshots ss
        join sources s on s.id = ss.source_id
        join projects p on p.id = s.project_id
        where ss.id = quotes.source_snapshot_id
          and foundry_in_current_workspaces(p.workspace_id)
      )
    )
  );

alter table sprints enable row level security;
alter table sprints force row level security;
create policy tenant_isolation on sprints
  using (
    exists (
      select 1 from projects p
      where p.id = sprints.project_id
        and foundry_in_current_workspaces(p.workspace_id)
    )
  );

alter table sprint_progress_events enable row level security;
alter table sprint_progress_events force row level security;
create policy tenant_isolation on sprint_progress_events
  using (
    exists (
      select 1
      from sprints sp
      join projects p on p.id = sp.project_id
      where sp.id = sprint_progress_events.sprint_id
        and foundry_in_current_workspaces(p.workspace_id)
    )
  );

alter table agent_runs enable row level security;
alter table agent_runs force row level security;
create policy tenant_isolation on agent_runs
  using (
    agent_runs.sprint_id is null
    or exists (
      select 1
      from sprints sp
      join projects p on p.id = sp.project_id
      where sp.id = agent_runs.sprint_id
        and foundry_in_current_workspaces(p.workspace_id)
    )
  );

alter table gates enable row level security;
alter table gates force row level security;
create policy tenant_isolation on gates
  using (
    exists (
      select 1 from projects p
      where p.id = gates.project_id
        and foundry_in_current_workspaces(p.workspace_id)
    )
  );

alter table usage_records enable row level security;
alter table usage_records force row level security;
create policy tenant_isolation on usage_records
  using (foundry_in_current_workspaces(usage_records.workspace_id));

alter table provider_connections enable row level security;
alter table provider_connections force row level security;
create policy tenant_isolation on provider_connections
  using (
    (
      provider_connections.workspace_id is not null
      and foundry_in_current_workspaces(provider_connections.workspace_id)
    )
    or (
      provider_connections.user_id is not null
      and provider_connections.user_id::text = current_setting('app.current_user_id', true)
    )
  );

alter table user_mcp_servers enable row level security;
alter table user_mcp_servers force row level security;
create policy tenant_isolation on user_mcp_servers
  using (user_id::text = current_setting('app.current_user_id', true));

-- Down Migration

drop policy if exists tenant_isolation on user_mcp_servers;
drop policy if exists tenant_isolation on provider_connections;
drop policy if exists tenant_isolation on usage_records;
drop policy if exists tenant_isolation on gates;
drop policy if exists tenant_isolation on agent_runs;
drop policy if exists tenant_isolation on sprint_progress_events;
drop policy if exists tenant_isolation on sprints;
drop policy if exists tenant_isolation on quotes;
drop policy if exists tenant_isolation on interviews;
drop policy if exists tenant_isolation on dmus;
drop policy if exists tenant_isolation on beachheads;
drop policy if exists tenant_isolation on pack_revisions;

alter table projects drop constraint if exists projects_current_pack_fk;

drop table if exists user_mcp_servers;
drop table if exists provider_connections;
drop table if exists usage_records;
drop table if exists gates;
drop table if exists agent_runs;
drop table if exists agent_definitions;
drop table if exists sprint_progress_events;
drop table if exists sprints;
drop table if exists quotes;
drop table if exists interviews;
drop table if exists dmus;
drop table if exists beachheads;
drop table if exists pack_revisions;

drop function if exists foundry_in_current_workspaces(uuid);
