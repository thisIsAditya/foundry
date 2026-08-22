-- Up Migration

-- V4 founder-journey stores. Additive only; historical 0001–0016 files stay untouched.
-- Disposition: new tables are the target journey/record/proposal path. Existing pack,
-- sprint, and score tables remain migration sources until a later cleanup release.

create or replace function foundry_project_matches_workspace(p_project_id uuid, p_workspace_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from projects p
    where p.id = p_project_id
      and p.workspace_id = p_workspace_id
      and foundry_in_current_workspaces(p.workspace_id)
  );
$$;

create table journeys (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references projects (id) on delete cascade,
  workspace_id uuid not null references workspaces (id) on delete cascade,
  current_stage text not null,
  current_objective text not null,
  accepted_record_version_id uuid,
  revision integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index journeys_workspace_idx on journeys (workspace_id);

create table journey_stage_states (
  id uuid primary key default gen_random_uuid(),
  journey_id uuid not null references journeys (id) on delete cascade,
  workspace_id uuid not null references workspaces (id) on delete cascade,
  stage text not null,
  status text not null,
  goal text,
  outcome text,
  completion_reason text,
  defer_reason text,
  block_reason text,
  latest_record_version_id uuid,
  updated_at timestamptz not null default now(),
  unique (journey_id, stage)
);
create index journey_stage_states_journey_idx on journey_stage_states (journey_id);

create table journey_steps (
  id uuid primary key default gen_random_uuid(),
  journey_id uuid not null references journeys (id) on delete cascade,
  workspace_id uuid not null references workspaces (id) on delete cascade,
  stage text not null,
  objective text not null,
  why_now text not null,
  expected_effort text,
  expected_minutes integer,
  cofounder_will_do text,
  expected_outcome text,
  status text not null,
  source_proposal_id uuid,
  input_evidence jsonb not null default '[]'::jsonb,
  completion_evidence jsonb not null default '[]'::jsonb,
  defer_reason text,
  skip_reason text,
  recommended boolean not null default false,
  revision integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index journey_steps_journey_idx on journey_steps (journey_id, created_at desc);
create index journey_steps_status_idx on journey_steps (workspace_id, status);

create table journey_transitions (
  id uuid primary key default gen_random_uuid(),
  journey_id uuid not null references journeys (id) on delete cascade,
  workspace_id uuid not null references workspaces (id) on delete cascade,
  actor_type text not null,
  actor_id text,
  cause text not null,
  from_state jsonb not null,
  to_state jsonb not null,
  command text,
  correlation_id uuid,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index journey_transitions_journey_idx on journey_transitions (journey_id, created_at desc);

create table business_record_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  workspace_id uuid not null references workspaces (id) on delete cascade,
  version_number integer not null,
  accepted_by text,
  accepted_at timestamptz not null default now(),
  source_proposal_ids uuid[] not null default '{}',
  export_metadata jsonb not null default '{}'::jsonb,
  compatibility_source_ref text,
  unique (project_id, version_number)
);
create index business_record_versions_project_idx on business_record_versions (project_id, version_number desc);

alter table journeys
  add constraint journeys_accepted_version_fk
  foreign key (accepted_record_version_id) references business_record_versions (id);

alter table journey_stage_states
  add constraint journey_stage_states_version_fk
  foreign key (latest_record_version_id) references business_record_versions (id);

create table record_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  workspace_id uuid not null references workspaces (id) on delete cascade,
  section text not null,
  item_key text not null,
  title text not null,
  body jsonb not null default '{"summary":"","fields":{}}'::jsonb,
  status text not null,
  provenance text not null,
  current_version_id uuid references business_record_versions (id),
  revision integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, section, item_key)
);
create index record_items_project_idx on record_items (project_id, section);

create table record_item_relations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  workspace_id uuid not null references workspaces (id) on delete cascade,
  source_item_id uuid not null references record_items (id) on delete cascade,
  target_item_id uuid not null references record_items (id) on delete cascade,
  relation_type text not null,
  created_at timestamptz not null default now()
);
create index record_item_relations_project_idx on record_item_relations (project_id);

create table record_item_staleness (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  workspace_id uuid not null references workspaces (id) on delete cascade,
  source_item_id uuid not null references record_items (id) on delete cascade,
  affected_item_id uuid not null references record_items (id) on delete cascade,
  reason text not null,
  detected_at timestamptz not null default now(),
  resolved_by_version_id uuid references business_record_versions (id)
);
create index record_item_staleness_affected_idx on record_item_staleness (affected_item_id);

create table proposals_v4 (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  workspace_id uuid not null references workspaces (id) on delete cascade,
  author_type text not null,
  author_id text,
  status text not null,
  rationale text not null,
  uncertainty text,
  interaction_type text,
  context_references jsonb not null default '[]'::jsonb,
  expires_at timestamptz,
  correlation_id uuid,
  revision integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index proposals_v4_project_idx on proposals_v4 (project_id, created_at desc);
create index proposals_v4_status_idx on proposals_v4 (workspace_id, status);

create table proposal_changes_v4 (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references proposals_v4 (id) on delete cascade,
  project_id uuid not null references projects (id) on delete cascade,
  workspace_id uuid not null references workspaces (id) on delete cascade,
  record_item_id uuid references record_items (id),
  section text not null,
  item_key text,
  before_payload jsonb,
  after_payload jsonb not null,
  evidence_refs jsonb not null default '[]'::jsonb,
  selected_outcome text,
  conflict_revision integer,
  created_at timestamptz not null default now()
);
create index proposal_changes_v4_proposal_idx on proposal_changes_v4 (proposal_id);

alter table journey_steps
  add constraint journey_steps_source_proposal_fk
  foreign key (source_proposal_id) references proposals_v4 (id);

create table cofounder_operations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  workspace_id uuid not null references workspaces (id) on delete cascade,
  actor_user_id uuid not null references users (id),
  runtime_kind text not null,
  state text not null,
  input_ref jsonb,
  timeout_ms integer,
  canceled_at timestamptz,
  idempotency_key uuid not null,
  correlation_id uuid,
  usage_json jsonb not null default '{}'::jsonb,
  recovery_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, idempotency_key)
);
create index cofounder_operations_project_idx on cofounder_operations (project_id, created_at desc);

create table capability_invocations (
  id uuid primary key default gen_random_uuid(),
  operation_id uuid not null references cofounder_operations (id) on delete cascade,
  project_id uuid not null references projects (id) on delete cascade,
  workspace_id uuid not null references workspaces (id) on delete cascade,
  capability_name text not null,
  capability_version text not null,
  risk_class text not null,
  actor_user_id uuid not null,
  idempotency_key uuid,
  duration_ms integer,
  safe_error text,
  safe_result_summary text,
  created_at timestamptz not null default now()
);
create index capability_invocations_operation_idx on capability_invocations (operation_id);

create table activity_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  workspace_id uuid not null references workspaces (id) on delete cascade,
  event_type text not null,
  actor_type text not null,
  actor_id text,
  payload_json jsonb not null default '{}'::jsonb,
  journey_id uuid references journeys (id) on delete set null,
  step_id uuid references journey_steps (id) on delete set null,
  proposal_id uuid references proposals_v4 (id) on delete set null,
  version_id uuid references business_record_versions (id) on delete set null,
  created_at timestamptz not null default now()
);
create index activity_events_project_idx on activity_events (project_id, created_at desc);

create table command_receipts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  project_id uuid references projects (id) on delete cascade,
  actor_id text not null,
  command text not null,
  idempotency_key uuid not null,
  result_json jsonb not null,
  created_at timestamptz not null default now(),
  unique (actor_id, command, idempotency_key)
);
create index command_receipts_project_idx on command_receipts (project_id);

create table command_outbox (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  project_id uuid references projects (id) on delete cascade,
  topic text not null,
  payload_json jsonb not null,
  available_at timestamptz not null default now(),
  claimed_at timestamptz,
  claimed_by text,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);
create index command_outbox_available_idx on command_outbox (available_at) where processed_at is null;

-- Backfill one journey, seven stage rows, twelve record items, and one recommended step.
insert into journeys (project_id, workspace_id, current_stage, current_objective, revision)
select
  p.id,
  p.workspace_id,
  case p.current_phase
    when 'diagnose' then 'idea'
    when 'problem' then 'problem'
    when 'evidence' then 'evidence'
    when 'market_and_competition' then 'opportunity'
    when 'model_and_pricing' then 'offer'
    when 'willingness_to_pay' then 'validation_next_step'
    when 'product' then 'validation_next_step'
    when 'build_and_launch' then 'validation_next_step'
    when 'operate' then 'validation_next_step'
    else 'idea'
  end,
  case p.current_phase
    when 'diagnose' then 'Capture the idea in the founder''s own words.'
    when 'problem' then 'State a specific recurring problem before describing a solution.'
    when 'evidence' then 'Separate observations from beliefs and record the riskiest assumption.'
    when 'market_and_competition' then 'Map current alternatives and the differentiation that would matter.'
    when 'model_and_pricing' then 'Shape a candidate offer, pricing hypothesis, and constraints.'
    else 'Choose one founder-controlled validation experiment.'
  end,
  1
from projects p
where not exists (select 1 from journeys j where j.project_id = p.id);

insert into journey_stage_states (journey_id, workspace_id, stage, status, defer_reason)
select
  j.id,
  j.workspace_id,
  stage.stage,
  case
    when stage.stage = j.current_stage then 'in_progress'
    when stage.ord < (
      case j.current_stage
        when 'idea' then 0
        when 'problem' then 1
        when 'customer' then 2
        when 'evidence' then 3
        when 'opportunity' then 4
        when 'offer' then 5
        else 6
      end
    ) then 'revisited'
    else 'not_started'
  end,
  case
    when j.current_stage = 'validation_next_step' and stage.stage in ('idea', 'problem') then
      'Migrated from a legacy phase; not treated as a completed core stage.'
    else null
  end
from journeys j
cross join (
  values
    ('idea', 0),
    ('problem', 1),
    ('customer', 2),
    ('evidence', 3),
    ('opportunity', 4),
    ('offer', 5),
    ('validation_next_step', 6)
) as stage(stage, ord);

insert into record_items (project_id, workspace_id, section, item_key, title, status, provenance)
select
  j.project_id,
  j.workspace_id,
  section.section,
  section.item_key,
  section.title,
  'empty',
  'unverified'
from journeys j
cross join (
  values
    ('idea_founder_context', 'idea', 'Idea and founder context'),
    ('problem', 'problem', 'Problem'),
    ('beachhead_customer', 'beachhead', 'Beachhead customer'),
    ('current_alternatives', 'alternatives', 'Current alternatives'),
    ('evidence_and_learning', 'evidence', 'Evidence and learning'),
    ('assumptions_and_questions', 'assumptions', 'Assumptions and open questions'),
    ('opportunity_and_differentiation', 'opportunity', 'Opportunity and differentiation'),
    ('value_proposition', 'value_proposition', 'Value proposition'),
    ('offer_pricing_model', 'offer', 'Offer, pricing, and business model'),
    ('economics_and_constraints', 'economics', 'Economics and constraints'),
    ('decisions_and_changes', 'decisions', 'Decisions and changes'),
    ('next_validation_experiment', 'experiment', 'Next validation experiment')
) as section(section, item_key, title);

insert into journey_steps (
  journey_id,
  workspace_id,
  stage,
  objective,
  why_now,
  expected_effort,
  expected_minutes,
  cofounder_will_do,
  expected_outcome,
  status,
  recommended
)
select
  j.id,
  j.workspace_id,
  j.current_stage,
  j.current_objective,
  'Continue from the migrated journey state. This is a recommended step, not a lock.',
  'About 15 minutes',
  15,
  'Explain the current record and the smallest useful next action.',
  'A founder-controlled update to the current stage, with honest empty sections left empty.',
  'ready',
  true
from journeys j;

grant select, insert, update, delete on
  journeys,
  journey_stage_states,
  journey_steps,
  journey_transitions,
  business_record_versions,
  record_items,
  record_item_relations,
  record_item_staleness,
  proposals_v4,
  proposal_changes_v4,
  cofounder_operations,
  capability_invocations,
  activity_events,
  command_receipts,
  command_outbox
to foundry_app;

alter table journeys enable row level security;
alter table journeys force row level security;
create policy tenant_isolation on journeys
  using (foundry_project_matches_workspace(project_id, workspace_id))
  with check (foundry_project_matches_workspace(project_id, workspace_id));

alter table journey_stage_states enable row level security;
alter table journey_stage_states force row level security;
create policy tenant_isolation on journey_stage_states
  using (foundry_in_current_workspaces(workspace_id))
  with check (foundry_in_current_workspaces(workspace_id));

alter table journey_steps enable row level security;
alter table journey_steps force row level security;
create policy tenant_isolation on journey_steps
  using (foundry_in_current_workspaces(workspace_id))
  with check (foundry_in_current_workspaces(workspace_id));

alter table journey_transitions enable row level security;
alter table journey_transitions force row level security;
create policy tenant_isolation on journey_transitions
  using (foundry_in_current_workspaces(workspace_id))
  with check (foundry_in_current_workspaces(workspace_id));

alter table business_record_versions enable row level security;
alter table business_record_versions force row level security;
create policy tenant_isolation on business_record_versions
  using (foundry_project_matches_workspace(project_id, workspace_id))
  with check (foundry_project_matches_workspace(project_id, workspace_id));

alter table record_items enable row level security;
alter table record_items force row level security;
create policy tenant_isolation on record_items
  using (foundry_project_matches_workspace(project_id, workspace_id))
  with check (foundry_project_matches_workspace(project_id, workspace_id));

alter table record_item_relations enable row level security;
alter table record_item_relations force row level security;
create policy tenant_isolation on record_item_relations
  using (foundry_project_matches_workspace(project_id, workspace_id))
  with check (foundry_project_matches_workspace(project_id, workspace_id));

alter table record_item_staleness enable row level security;
alter table record_item_staleness force row level security;
create policy tenant_isolation on record_item_staleness
  using (foundry_project_matches_workspace(project_id, workspace_id))
  with check (foundry_project_matches_workspace(project_id, workspace_id));

alter table proposals_v4 enable row level security;
alter table proposals_v4 force row level security;
create policy tenant_isolation on proposals_v4
  using (foundry_project_matches_workspace(project_id, workspace_id))
  with check (foundry_project_matches_workspace(project_id, workspace_id));

alter table proposal_changes_v4 enable row level security;
alter table proposal_changes_v4 force row level security;
create policy tenant_isolation on proposal_changes_v4
  using (foundry_project_matches_workspace(project_id, workspace_id))
  with check (foundry_project_matches_workspace(project_id, workspace_id));

alter table cofounder_operations enable row level security;
alter table cofounder_operations force row level security;
create policy tenant_isolation on cofounder_operations
  using (foundry_project_matches_workspace(project_id, workspace_id))
  with check (foundry_project_matches_workspace(project_id, workspace_id));

alter table capability_invocations enable row level security;
alter table capability_invocations force row level security;
create policy tenant_isolation on capability_invocations
  using (foundry_project_matches_workspace(project_id, workspace_id))
  with check (foundry_project_matches_workspace(project_id, workspace_id));

alter table activity_events enable row level security;
alter table activity_events force row level security;
create policy tenant_isolation on activity_events
  using (foundry_project_matches_workspace(project_id, workspace_id))
  with check (foundry_project_matches_workspace(project_id, workspace_id));

alter table command_receipts enable row level security;
alter table command_receipts force row level security;
create policy tenant_isolation on command_receipts
  using (foundry_in_current_workspaces(workspace_id))
  with check (foundry_in_current_workspaces(workspace_id));

alter table command_outbox enable row level security;
alter table command_outbox force row level security;
create policy tenant_isolation on command_outbox
  using (foundry_in_current_workspaces(workspace_id))
  with check (foundry_in_current_workspaces(workspace_id));

-- Down Migration

drop policy if exists tenant_isolation on command_outbox;
drop policy if exists tenant_isolation on command_receipts;
drop policy if exists tenant_isolation on activity_events;
drop policy if exists tenant_isolation on capability_invocations;
drop policy if exists tenant_isolation on cofounder_operations;
drop policy if exists tenant_isolation on proposal_changes_v4;
drop policy if exists tenant_isolation on proposals_v4;
drop policy if exists tenant_isolation on record_item_staleness;
drop policy if exists tenant_isolation on record_item_relations;
drop policy if exists tenant_isolation on record_items;
drop policy if exists tenant_isolation on business_record_versions;
drop policy if exists tenant_isolation on journey_transitions;
drop policy if exists tenant_isolation on journey_steps;
drop policy if exists tenant_isolation on journey_stage_states;
drop policy if exists tenant_isolation on journeys;

alter table journeys drop constraint if exists journeys_accepted_version_fk;
alter table journey_stage_states drop constraint if exists journey_stage_states_version_fk;
alter table journey_steps drop constraint if exists journey_steps_source_proposal_fk;

drop table if exists command_outbox;
drop table if exists command_receipts;
drop table if exists activity_events;
drop table if exists capability_invocations;
drop table if exists cofounder_operations;
drop table if exists proposal_changes_v4;
drop table if exists proposals_v4;
drop table if exists record_item_staleness;
drop table if exists record_item_relations;
drop table if exists record_items;
drop table if exists business_record_versions;
drop table if exists journey_transitions;
drop table if exists journey_steps;
drop table if exists journey_stage_states;
drop table if exists journeys;

drop function if exists foundry_project_matches_workspace(uuid, uuid);
