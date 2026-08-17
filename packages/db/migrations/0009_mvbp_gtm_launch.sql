-- Up Migration

create table metric_definitions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  name text not null,
  unit text not null,
  calculation_spec_json jsonb not null,
  created_at timestamptz not null default now()
);
create index metric_definitions_project_idx on metric_definitions (project_id, created_at desc);

create table metric_observations (
  id uuid primary key default gen_random_uuid(),
  metric_id uuid not null references metric_definitions (id) on delete cascade,
  value numeric(19, 4) not null,
  observed_at timestamptz not null default now()
);
create index metric_observations_metric_idx on metric_observations (metric_id, observed_at desc);

create table pack_sections (
  id uuid primary key default gen_random_uuid(),
  pack_revision_id uuid not null references pack_revisions (id) on delete cascade,
  section text not null,
  body_json jsonb not null,
  created_at timestamptz not null default now(),
  unique (pack_revision_id, section)
);

create table proposed_changes (
  id uuid primary key default gen_random_uuid(),
  agent_run_id uuid not null references agent_runs (id) on delete cascade,
  target_section text not null,
  change_json jsonb not null,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table decisions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  options_json jsonb not null,
  chosen_json jsonb not null,
  rationale text,
  evidence_refs_json jsonb,
  gate_id uuid references gates (id),
  sprint_id uuid references sprints (id),
  decided_by_user_id uuid references users (id),
  created_at timestamptz not null default now()
);
create index decisions_project_idx on decisions (project_id, created_at desc);

create table approval_requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  action_type text not null,
  payload_json jsonb not null,
  payload_hash text not null,
  status text not null default 'pending',
  requested_by text not null,
  decided_by_user_id uuid references users (id),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  unique (project_id, payload_hash, status)
);
create index approval_requests_project_idx on approval_requests (project_id, created_at desc);

create table policies (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces (id) on delete cascade,
  project_id uuid references projects (id) on delete cascade,
  policy_type text not null,
  rule_json jsonb not null,
  created_at timestamptz not null default now(),
  check ((workspace_id is not null) or (project_id is not null))
);

create table integration_connections (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces (id) on delete cascade,
  provider text not null,
  auth_ref_encrypted text not null,
  scope_json jsonb,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index integration_connections_workspace_idx on integration_connections (workspace_id);

create table tool_definitions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  version integer not null,
  risk_class text not null,
  input_schema_json jsonb not null,
  output_schema_json jsonb not null,
  created_at timestamptz not null default now(),
  unique (name, version)
);

create table tool_calls (
  id uuid primary key default gen_random_uuid(),
  agent_run_id uuid not null references agent_runs (id) on delete cascade,
  tool_definition_id uuid not null references tool_definitions (id),
  status text not null default 'proposed',
  input_json jsonb not null,
  output_json jsonb,
  approval_request_id uuid references approval_requests (id),
  idempotency_key text,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
create index tool_calls_agent_run_idx on tool_calls (agent_run_id);

insert into templates (artifact_type, version, definition_json)
values
  ('mvbp_prd', 1, '{"formats":["markdown","html","pdf"],"primary":"markdown"}'::jsonb),
  ('first_100_plan', 1, '{"formats":["markdown","html","pdf"],"primary":"markdown"}'::jsonb),
  ('launch_checklist', 1, '{"formats":["markdown","html","pdf"],"primary":"markdown"}'::jsonb),
  ('operating_playbook', 1, '{"formats":["markdown","html","pdf"],"primary":"markdown"}'::jsonb)
on conflict (artifact_type, version) do nothing;

insert into agent_definitions (name, version, instructions_text, capabilities_json, policy_defaults_json)
values
  (
    'prd_scoper',
    1,
    $prd$You are the PRD / MVBP Scoper. Scope one capability, a time box, a payment path, out-of-scope items, and kill lines. Instant-fail if the founder lists four or more features, has no payment path, or has no hypothesis. Never expand into a platform.$prd$,
    '{"modelProfile":"planner","toolAllowlist":["mvbp_scope_check","builder_prompt.generate"]}'::jsonb,
    '{"maxToolRiskClass":"compute"}'::jsonb
  ),
  (
    'build_prompt',
    1,
    $bp$You are the Build Prompt writer. Produce a paste-ready prompt for Lovable, Bolt, v0, or Cursor, or a concierge runbook. Do not recommend Kubernetes or a three-month platform. Cite the accepted pack and evidence.$bp$,
    '{"modelProfile":"planner","toolAllowlist":["builder_prompt.generate"]}'::jsonb,
    '{"maxToolRiskClass":"draft"}'::jsonb
  ),
  (
    'gtm_first_100',
    1,
    $gtm$You are the GTM First-100 planner. Name a repeatable path to the first 100 customers. Do not default to ads or "go viral." Bulk send, publish, and payment-link send require founder approval.$gtm$,
    '{"modelProfile":"planner","toolAllowlist":["landing.draft","email.draft","payment_link.draft"]}'::jsonb,
    '{"maxToolRiskClass":"draft"}'::jsonb
  ),
  (
    'org_cost',
    1,
    $org$You are the Org and Cost planner. List skills, stack options, monthly burn, and runway. Do not rewrite canonical MoneyRules. Default-alive, not default-dead.$org$,
    '{"modelProfile":"financialAnalyst","toolAllowlist":["unit_economics_calculator"]}'::jsonb,
    '{"maxToolRiskClass":"compute"}'::jsonb
  ),
  (
    'legal_guide',
    1,
    $lg$You are the India legal guide. Produce checklists for entity, SPICe, and professional handoff. Never file anything. Every output is a draft for a CA/CS. Watermark drafts as not a filing.$lg$,
    '{"modelProfile":"planner","toolAllowlist":["legal_checklist.draft"]}'::jsonb,
    '{"maxToolRiskClass":"draft"}'::jsonb
  ),
  (
    'ip_privacy',
    1,
    $ip$You are the IP and privacy drafter. Produce watermarked drafts of notices and assignment checklists. This is not a clearance opinion. Never file trademarks or submit government forms.$ip$,
    '{"modelProfile":"planner","toolAllowlist":["legal_checklist.draft"]}'::jsonb,
    '{"maxToolRiskClass":"draft"}'::jsonb
  ),
  (
    'compliance',
    1,
    $co$You are the GST/DPDP compliance guide. Ask questions and list dates to confirm with a professional. Never guarantee a tax position or file returns.$co$,
    '{"modelProfile":"planner","toolAllowlist":["legal_checklist.draft"]}'::jsonb,
    '{"maxToolRiskClass":"draft"}'::jsonb
  ),
  (
    'launch',
    1,
    $ln$You are the Launch checklist owner. Sequence legal review, MVBP, payment path, and first distribution. This is not a Product Hunt marketing plan. Side effects stay approval-gated.$ln$,
    '{"modelProfile":"planner","toolAllowlist":["calendar.draft","landing.draft"]}'::jsonb,
    '{"maxToolRiskClass":"draft"}'::jsonb
  ),
  (
    'ops_runtime',
    1,
    $ops$You are the operations runtime. Read only the accepted pack and current MoneyRules. Do not invent a second ICP or price. If MoneyRules change, propose a migration — never silently diverge. Growth spend is forbidden until Gate C unless the founder overrides.$ops$,
    '{"modelProfile":"planner","toolAllowlist":["invoice.draft","email.draft","ops.migration_proposal"]}'::jsonb,
    '{"maxToolRiskClass":"draft"}'::jsonb
  );

grant select, insert, update, delete on
  metric_definitions,
  metric_observations,
  pack_sections,
  proposed_changes,
  decisions,
  approval_requests,
  policies,
  integration_connections,
  tool_definitions,
  tool_calls
to foundry_app;

alter table metric_definitions enable row level security;
alter table metric_definitions force row level security;
create policy tenant_isolation on metric_definitions
  using (
    exists (
      select 1 from projects p
      where p.id = metric_definitions.project_id
        and foundry_in_current_workspaces(p.workspace_id)
    )
  );

alter table metric_observations enable row level security;
alter table metric_observations force row level security;
create policy tenant_isolation on metric_observations
  using (
    exists (
      select 1
      from metric_definitions d
      join projects p on p.id = d.project_id
      where d.id = metric_observations.metric_id
        and foundry_in_current_workspaces(p.workspace_id)
    )
  );

alter table pack_sections enable row level security;
alter table pack_sections force row level security;
create policy tenant_isolation on pack_sections
  using (
    exists (
      select 1
      from pack_revisions r
      join projects p on p.id = r.project_id
      where r.id = pack_sections.pack_revision_id
        and foundry_in_current_workspaces(p.workspace_id)
    )
  );

alter table proposed_changes enable row level security;
alter table proposed_changes force row level security;
create policy tenant_isolation on proposed_changes
  using (
    exists (
      select 1
      from agent_runs ar
      join sprints s on s.id = ar.sprint_id
      join projects p on p.id = s.project_id
      where ar.id = proposed_changes.agent_run_id
        and foundry_in_current_workspaces(p.workspace_id)
    )
  );

alter table decisions enable row level security;
alter table decisions force row level security;
create policy tenant_isolation on decisions
  using (
    exists (
      select 1 from projects p
      where p.id = decisions.project_id
        and foundry_in_current_workspaces(p.workspace_id)
    )
  );

alter table approval_requests enable row level security;
alter table approval_requests force row level security;
create policy tenant_isolation on approval_requests
  using (
    exists (
      select 1 from projects p
      where p.id = approval_requests.project_id
        and foundry_in_current_workspaces(p.workspace_id)
    )
  );

alter table policies enable row level security;
alter table policies force row level security;
create policy tenant_isolation on policies
  using (
    (
      policies.workspace_id is not null
      and foundry_in_current_workspaces(policies.workspace_id)
    )
    or exists (
      select 1 from projects p
      where p.id = policies.project_id
        and foundry_in_current_workspaces(p.workspace_id)
    )
  );

alter table integration_connections enable row level security;
alter table integration_connections force row level security;
create policy tenant_isolation on integration_connections
  using (foundry_in_current_workspaces(workspace_id));

alter table tool_definitions enable row level security;
alter table tool_definitions force row level security;
create policy tenant_isolation on tool_definitions using (true);

alter table tool_calls enable row level security;
alter table tool_calls force row level security;
create policy tenant_isolation on tool_calls
  using (
    exists (
      select 1
      from agent_runs ar
      join sprints s on s.id = ar.sprint_id
      join projects p on p.id = s.project_id
      where ar.id = tool_calls.agent_run_id
        and foundry_in_current_workspaces(p.workspace_id)
    )
  );

-- Down Migration

drop policy if exists tenant_isolation on tool_calls;
drop policy if exists tenant_isolation on tool_definitions;
drop policy if exists tenant_isolation on integration_connections;
drop policy if exists tenant_isolation on policies;
drop policy if exists tenant_isolation on approval_requests;
drop policy if exists tenant_isolation on decisions;
drop policy if exists tenant_isolation on proposed_changes;
drop policy if exists tenant_isolation on pack_sections;
drop policy if exists tenant_isolation on metric_observations;
drop policy if exists tenant_isolation on metric_definitions;

drop table if exists tool_calls;
drop table if exists tool_definitions;
drop table if exists integration_connections;
drop table if exists policies;
drop table if exists approval_requests;
drop table if exists decisions;
drop table if exists proposed_changes;
drop table if exists pack_sections;
drop table if exists metric_observations;
drop table if exists metric_definitions;

delete from templates where artifact_type in ('mvbp_prd', 'first_100_plan', 'launch_checklist', 'operating_playbook') and version = 1;
delete from agent_definitions where name in (
  'prd_scoper', 'build_prompt', 'gtm_first_100', 'org_cost', 'legal_guide',
  'ip_privacy', 'compliance', 'launch', 'ops_runtime'
) and version = 1;
