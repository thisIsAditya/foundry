-- Up Migration

create table money_rules (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  pack_revision_id uuid not null references pack_revisions (id),
  currency text not null default 'INR',
  unit_of_sale text not null,
  price numeric(19, 4) not null,
  billing_frequency text,
  cost_structure_json jsonb not null default '{}'::jsonb,
  is_current boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index money_rules_one_current_per_project
  on money_rules (project_id)
  where is_current;
create index money_rules_project_idx on money_rules (project_id, created_at desc);

create table market_models (
  id uuid primary key default gen_random_uuid(),
  pack_revision_id uuid not null references pack_revisions (id) on delete cascade,
  formula_spec_json jsonb not null,
  inputs_json jsonb not null,
  computed_result_json jsonb,
  created_at timestamptz not null default now()
);
create index market_models_pack_idx on market_models (pack_revision_id);

create table business_models (
  id uuid primary key default gen_random_uuid(),
  pack_revision_id uuid not null references pack_revisions (id) on delete cascade,
  money_rules_id uuid not null references money_rules (id),
  who_receives_value text not null,
  who_pays text not null,
  unit_of_sale text not null,
  delivery_mechanism text not null,
  revenue_pattern text not null,
  created_at timestamptz not null default now()
);

create table unit_economics_models (
  id uuid primary key default gen_random_uuid(),
  pack_revision_id uuid not null references pack_revisions (id) on delete cascade,
  money_rules_id uuid not null references money_rules (id),
  margin_json jsonb,
  cac numeric(19, 4),
  ltv numeric(19, 4),
  payback numeric(19, 4),
  sensitivity_json jsonb,
  created_at timestamptz not null default now()
);

create table offers (
  id uuid primary key default gen_random_uuid(),
  business_model_id uuid not null references business_models (id) on delete cascade,
  promise text not null,
  package_description text not null,
  price_json jsonb,
  created_at timestamptz not null default now()
);

create table experiments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  hypothesis text not null,
  method text not null,
  threshold_json jsonb not null,
  result_json jsonb,
  status text not null default 'planned',
  created_at timestamptz not null default now()
);
create index experiments_project_idx on experiments (project_id, created_at desc);

create table wtp_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  experiment_id uuid references experiments (id),
  offer_id uuid references offers (id),
  participant_class text not null,
  instrument text not null,
  amount numeric(19, 4),
  currency text,
  occurred_at timestamptz not null default now()
);
create index wtp_events_project_idx on wtp_events (project_id, occurred_at desc);

create table artifacts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  artifact_type text not null,
  current_version_id uuid,
  created_at timestamptz not null default now()
);
create unique index artifacts_one_type_per_project
  on artifacts (project_id, artifact_type);

create table artifact_versions (
  id uuid primary key default gen_random_uuid(),
  artifact_id uuid not null references artifacts (id) on delete cascade,
  version_number integer not null,
  pack_revision_id uuid not null references pack_revisions (id),
  template_id uuid,
  s3_key text not null,
  status text not null default 'generating',
  citations_json jsonb,
  created_at timestamptz not null default now(),
  unique (artifact_id, version_number)
);
create index artifact_versions_artifact_idx on artifact_versions (artifact_id, version_number desc);

alter table artifacts
  add constraint artifacts_current_version_fk
  foreign key (current_version_id) references artifact_versions (id);

insert into agent_definitions (name, version, instructions_text, capabilities_json, policy_defaults_json)
values
  (
    'business_model_analyst',
    1,
    $bm$You are the Business Model Analyst. Compare revenue patterns, define who receives value, who pays, the unit of sale, and draft MoneyRules. Do not invent evidence or silently change canonical MoneyRules. Propose structured MoneyRules; the MoneyRules service is authoritative.$bm$,
    '{"modelProfile":"financialAnalyst","toolAllowlist":["market_calculator","unit_economics_calculator"]}'::jsonb,
    '{"maxToolRiskClass":"compute"}'::jsonb
  ),
  (
    'pricing_analyst',
    1,
    $pr$You are the Pricing and Unit Economics Analyst. Propose pricing and packaging, then run code-backed economics and sensitivity analysis. Never compute LTV, CAC, margin, or payback in prose — call the calculator tools. Do not use waitlists as willingness-to-pay evidence.$pr$,
    '{"modelProfile":"financialAnalyst","toolAllowlist":["market_calculator","unit_economics_calculator","sensitivity_calculator","reconciliation_checker"]}'::jsonb,
    '{"maxToolRiskClass":"compute"}'::jsonb
  );

grant select, insert, update, delete on
  money_rules,
  market_models,
  business_models,
  unit_economics_models,
  offers,
  experiments,
  wtp_events,
  artifacts,
  artifact_versions
to foundry_app;

alter table money_rules enable row level security;
alter table money_rules force row level security;
create policy tenant_isolation on money_rules
  using (
    exists (
      select 1 from projects p
      where p.id = money_rules.project_id
        and foundry_in_current_workspaces(p.workspace_id)
    )
  );

alter table market_models enable row level security;
alter table market_models force row level security;
create policy tenant_isolation on market_models
  using (
    exists (
      select 1
      from pack_revisions r
      join projects p on p.id = r.project_id
      where r.id = market_models.pack_revision_id
        and foundry_in_current_workspaces(p.workspace_id)
    )
  );

alter table business_models enable row level security;
alter table business_models force row level security;
create policy tenant_isolation on business_models
  using (
    exists (
      select 1
      from pack_revisions r
      join projects p on p.id = r.project_id
      where r.id = business_models.pack_revision_id
        and foundry_in_current_workspaces(p.workspace_id)
    )
  );

alter table unit_economics_models enable row level security;
alter table unit_economics_models force row level security;
create policy tenant_isolation on unit_economics_models
  using (
    exists (
      select 1
      from pack_revisions r
      join projects p on p.id = r.project_id
      where r.id = unit_economics_models.pack_revision_id
        and foundry_in_current_workspaces(p.workspace_id)
    )
  );

alter table offers enable row level security;
alter table offers force row level security;
create policy tenant_isolation on offers
  using (
    exists (
      select 1
      from business_models bm
      join pack_revisions r on r.id = bm.pack_revision_id
      join projects p on p.id = r.project_id
      where bm.id = offers.business_model_id
        and foundry_in_current_workspaces(p.workspace_id)
    )
  );

alter table experiments enable row level security;
alter table experiments force row level security;
create policy tenant_isolation on experiments
  using (
    exists (
      select 1 from projects p
      where p.id = experiments.project_id
        and foundry_in_current_workspaces(p.workspace_id)
    )
  );

alter table wtp_events enable row level security;
alter table wtp_events force row level security;
create policy tenant_isolation on wtp_events
  using (
    exists (
      select 1 from projects p
      where p.id = wtp_events.project_id
        and foundry_in_current_workspaces(p.workspace_id)
    )
  );

alter table artifacts enable row level security;
alter table artifacts force row level security;
create policy tenant_isolation on artifacts
  using (
    exists (
      select 1 from projects p
      where p.id = artifacts.project_id
        and foundry_in_current_workspaces(p.workspace_id)
    )
  );

alter table artifact_versions enable row level security;
alter table artifact_versions force row level security;
create policy tenant_isolation on artifact_versions
  using (
    exists (
      select 1
      from artifacts a
      join projects p on p.id = a.project_id
      where a.id = artifact_versions.artifact_id
        and foundry_in_current_workspaces(p.workspace_id)
    )
  );

-- Down Migration

drop policy if exists tenant_isolation on artifact_versions;
drop policy if exists tenant_isolation on artifacts;
drop policy if exists tenant_isolation on wtp_events;
drop policy if exists tenant_isolation on experiments;
drop policy if exists tenant_isolation on offers;
drop policy if exists tenant_isolation on unit_economics_models;
drop policy if exists tenant_isolation on business_models;
drop policy if exists tenant_isolation on market_models;
drop policy if exists tenant_isolation on money_rules;

alter table artifacts drop constraint if exists artifacts_current_version_fk;

drop table if exists artifact_versions;
drop table if exists artifacts;
drop table if exists wtp_events;
drop table if exists experiments;
drop table if exists offers;
drop table if exists unit_economics_models;
drop table if exists business_models;
drop table if exists market_models;
drop table if exists money_rules;

delete from agent_definitions where name in ('business_model_analyst', 'pricing_analyst') and version = 1;
