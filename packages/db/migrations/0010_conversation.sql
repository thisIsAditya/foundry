-- Up Migration

create table conversation_messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  actor text not null check (actor in ('founder', 'co_founder', 'system')),
  actor_user_id uuid references users (id),
  text_content text not null,
  blocks jsonb not null default '[]'::jsonb,
  references_json jsonb not null default '[]'::jsonb,
  visibility text not null default 'founder_visible'
    check (visibility in ('founder_visible', 'internal')),
  created_at timestamptz not null default now()
);
create index conversation_messages_project_idx on conversation_messages (project_id, created_at);

create table conversation_summaries (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  summary_text text not null,
  covered_through_message_id uuid not null references conversation_messages (id),
  token_count integer not null,
  created_at timestamptz not null default now()
);
create index conversation_summaries_project_idx on conversation_summaries (project_id, created_at desc);

create table founder_preferences (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces (id) on delete cascade,
  project_id uuid references projects (id) on delete cascade,
  key text not null,
  value jsonb not null,
  source_message_id uuid references conversation_messages (id),
  confidence_json jsonb not null,
  founder_confirmed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (workspace_id is not null or project_id is not null)
);
create unique index founder_preferences_scope_key_idx
  on founder_preferences (coalesce(project_id::text, workspace_id::text), key);

grant select, insert, update, delete on conversation_messages, conversation_summaries, founder_preferences
to foundry_app;

alter table conversation_messages enable row level security;
alter table conversation_messages force row level security;
create policy tenant_isolation on conversation_messages
  using (
    exists (
      select 1 from projects p
      where p.id = conversation_messages.project_id
        and foundry_in_current_workspaces(p.workspace_id)
    )
  );

alter table conversation_summaries enable row level security;
alter table conversation_summaries force row level security;
create policy tenant_isolation on conversation_summaries
  using (
    exists (
      select 1 from projects p
      where p.id = conversation_summaries.project_id
        and foundry_in_current_workspaces(p.workspace_id)
    )
  );

alter table founder_preferences enable row level security;
alter table founder_preferences force row level security;
create policy tenant_isolation on founder_preferences
  using (
    (
      founder_preferences.workspace_id is not null
      and foundry_in_current_workspaces(founder_preferences.workspace_id)
    )
    or (
      founder_preferences.project_id is not null
      and exists (
        select 1 from projects p
        where p.id = founder_preferences.project_id
          and foundry_in_current_workspaces(p.workspace_id)
      )
    )
  );

-- Down Migration

drop policy if exists tenant_isolation on founder_preferences;
drop policy if exists tenant_isolation on conversation_summaries;
drop policy if exists tenant_isolation on conversation_messages;

drop table if exists founder_preferences;
drop table if exists conversation_summaries;
drop table if exists conversation_messages;
