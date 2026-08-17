# Database schema delta

**Implements:** `02-domain-model-delta.md`; `docs/02-product-requirements/04-worker-backend-requirements.md` §2, §9.
**Package:** `@foundry/db` (`packages/db/migrations`). Continues the existing hand-written `node-pg-migrate` `.up.sql`/`.down.sql` convention from migration `0010` onward. No ORM is introduced. All new tables follow the existing conventions from `docs/plan/implementation/06-database-schema.md`: UUID PK via `gen_random_uuid()`, `timestamptz` UTC timestamps, tenant FK indexed, RLS added in the same migration that creates the table (matching the pattern already used in `0002_identity.sql`).

## 1. New migrations, in order

### `0010_conversation.sql`

```sql
create table conversation_messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id),
  actor text not null check (actor in ('founder','co_founder','system')),
  actor_user_id uuid references users(id),
  text_content text not null,
  blocks jsonb not null default '[]',
  references_json jsonb not null default '[]',
  visibility text not null default 'founder_visible' check (visibility in ('founder_visible','internal')),
  created_at timestamptz not null default now()
);
create index conversation_messages_project_idx on conversation_messages(project_id, created_at);

create table conversation_summaries (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id),
  summary_text text not null,
  covered_through_message_id uuid not null references conversation_messages(id),
  token_count integer not null,
  created_at timestamptz not null default now()
);
create index conversation_summaries_project_idx on conversation_summaries(project_id, created_at desc);

create table founder_preferences (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id),
  project_id uuid references projects(id),
  key text not null,
  value jsonb not null,
  source_message_id uuid references conversation_messages(id),
  confidence_json jsonb not null,
  founder_confirmed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (workspace_id is not null or project_id is not null)
);
create unique index founder_preferences_scope_key_idx
  on founder_preferences (coalesce(project_id::text, workspace_id::text), key);
```

Both tables get RLS following the `0002_identity.sql` pattern (`workspace_id`/derived-`project_id` scoped to `app.current_workspace_ids`).

### `0011_founder_tasks.sql`

```sql
create table founder_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id),
  title text not null,
  explanation text not null,
  linked_job_id uuid references sprints(id),
  linked_section_keys text[] not null default '{}',
  linked_score_dimensions text[] not null default '{}',
  preparation_json jsonb not null default '{}',
  evidence_schema_json jsonb not null default '{}',
  status text not null default 'proposed'
    check (status in ('proposed','active','completed','deferred','skipped')),
  due_or_suggested_at timestamptz,
  defer_or_skip_reason text,
  completion_evidence_ref jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index founder_tasks_project_idx on founder_tasks(project_id, status);
```

### `0012_research_findings.sql`

```sql
alter table sources add column if not exists source_category text
  check (source_category in ('web','company','academic','market_report','upload','interview_note'));
alter table sources add column if not exists geographic_scope text;
alter table sources add column if not exists reliability_notes text;

create table research_findings (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id),
  job_id uuid not null references sprints(id),
  claim text not null,
  citation_ids uuid[] not null default '{}',
  confidence_json jsonb not null,
  affected_section_keys text[] not null default '{}',
  conflicts_with_finding_ids uuid[] not null default '{}',
  stale_at timestamptz,
  extraction_method text not null
    check (extraction_method in ('web_search','web_fetch','company_profile','academic','market_report')),
  created_at timestamptz not null default now()
);
create index research_findings_project_idx on research_findings(project_id, created_at desc);
create index research_findings_job_idx on research_findings(job_id);
```

The `source_category` values map directly onto backend requirements §10's four source types plus the two existing kinds (`upload`, `interview_note`); this is additive, so existing rows default to `null` and are backfilled lazily by the ingestion worker on next read, not by a bulk migration.

### `0013_evidence_items_and_citations_backfill.sql`

Closes the gap identified in the codebase audit: `evidence-item.ts`, `citation.ts`, `assumption.ts`, `problem.ts` (partially — table exists per `0006`), `persona.ts`, `alternative.ts`, `competitor.ts`, and `wedge.ts` are Zod types in `@foundry/domain` with **no backing table**. These are required for the 17-section projection (§2 below) to be real, not placeholder text.

```sql
create table evidence_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id),
  summary text not null,
  provenance_json jsonb not null,
  created_at timestamptz not null default now()
);

create table evidence_item_citations (
  evidence_item_id uuid not null references evidence_items(id),
  citation_id uuid not null references citations(id),
  primary key (evidence_item_id, citation_id)
);

create table citations (
  id uuid primary key default gen_random_uuid(),
  source_snapshot_id uuid not null references source_snapshots(id),
  content_block_id uuid references content_blocks(id),
  locator_json jsonb not null,
  created_at timestamptz not null default now()
);

create table assumptions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id),
  statement text not null,
  status text not null default 'untested'
    check (status in ('untested','testing','supported','held','contradicted','killed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index assumptions_project_idx on assumptions(project_id, status);

create table personas (
  id uuid primary key default gen_random_uuid(),
  pack_revision_id uuid not null references pack_revisions(id),
  beachhead_id uuid not null references beachheads(id),
  profile_json jsonb not null,
  evidence_item_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

create table alternatives (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id),
  pack_revision_id uuid references pack_revisions(id),
  problem_id uuid,
  description text not null,
  created_at timestamptz not null default now()
);

create table competitors (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id),
  name text not null,
  source_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

create table wedges (
  id uuid primary key default gen_random_uuid(),
  pack_revision_id uuid not null references pack_revisions(id),
  statement text not null,
  alternative_ids uuid[] not null default '{}',
  evidence_item_ids uuid[] not null default '{}',
  assumption_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);
```

`citations` was previously referenced only conceptually (evidence-item.ts assumed it); the note that `content_blocks` already carries a `search_vector`/`embedding` means citations linking into it needs no new indexing — reuse existing GIN/HNSW indexes.

Note: `citations` must be created before `evidence_item_citations` in the actual `.up.sql` file ordering (shown out of dependency order above for readability only).

### `0014_plan_scores.sql`

```sql
create table plan_scores (
  id uuid primary key default gen_random_uuid(),
  pack_revision_id uuid not null references pack_revisions(id),
  overall numeric(5,2) not null,
  dimensions_json jsonb not null,
  rule_version text not null,
  reasons_json jsonb not null default '[]',
  top_actions_json jsonb not null default '[]',
  calculated_at timestamptz not null default now()
);
create index plan_scores_revision_idx on plan_scores(pack_revision_id, calculated_at desc);
```

Append-only, following the same historical-trend pattern as `agent_runs`/`gates` — this is what powers the score-trend requirement in web requirements §9 and mobile requirements §3 without a separate history table.

### `0015_ai_job_columns.sql`

```sql
alter table sprints add column if not exists job_kind text
  check (job_kind in ('research','draft','analysis','clarification','synthesis')) default 'analysis';
alter table sprints add column if not exists owner text
  check (owner in ('co_founder','ai','founder')) default 'ai';
alter table sprints add column if not exists parent_job_id uuid references sprints(id);
```

`objective`, `why_now`, and `role_label` stay inside the existing `contract_json` column (already unstructured JSON on `sprints`/`sprint_contract`-equivalent storage) — they do not need a dedicated column because they are read, not filtered/sorted, by any query. Only `job_kind`, `owner`, and `parent_job_id` need columns because the work board filters and groups by them (web requirements §6 board views).

## 2. The 17-section business model view is a projection, not a table (decision D11)

No migration creates a "business model sections" table with 17 rows of free text. Add a new service, `PlanSectionAggregatorService` (`apps/web/server/services/plan-section-aggregator.ts`, worker-callable via `@foundry/domain` types only), that maps each `BusinessModelSectionKey` to its backing table(s) and produces the uniform card shape web requirements §5 and mobile requirements §8 need (summary, status, score contribution, known facts, assumptions, citations, last update, next action).

| Section key | Backing table(s) | Existing repository |
|---|---|---|
| `context` | `projects` (geography, jurisdiction, founder_objective, business_category) | `projects` repo |
| `problem` | `problems` | `problems` repo (exists) |
| `beachhead` | `beachheads` | `beachheads` repo (exists) |
| `persona_dmu` | `personas` (new), `dmus` | `dmus` repo exists; add `personas` repo |
| `alternatives_competitors` | `alternatives` (new), `competitors` (new) | add both repos |
| `evidence_ledger` | `evidence_items` (new), `citations` (new), `sources`, `interviews`, `quotes` | add `evidence_items`/`citations` repos; rest exist |
| `assumptions_experiments` | `assumptions` (new), `experiments` | add `assumptions` repo; `experiments` exists |
| `market_model` | `market_models` | exists |
| `business_model_money_rules` | `business_models`, `money_rules` | add `business_models` repo (table exists, no repo per audit); `money_rules` exists |
| `pricing_unit_economics` | `unit_economics_models`, `offers` | `unit_economics` repo exists; add `offers` repo |
| `willingness_to_pay` | `wtp_events` | exists |
| `mvbp_kill_lines` | `pack_sections` (`section = 'mvbp'`), `metric_definitions` | exist |
| `gtm_first_100` | `pack_sections` (`section = 'gtm'`) | exists |
| `team_cost_runway` | `pack_sections` (`section = 'org_cost'`) | exists |
| `legal_compliance` | `pack_sections` (`section = 'legal'`) | exists |
| `launch_operate` | `pack_sections` (`section = 'launch'`) | exists |
| `gates_decisions_artifacts` | `gates`, `decisions`, `artifacts`, `plan_scores` (new) | mostly exist; add `plan_scores` repo |

`PlanSectionAggregatorService.getSection(projectId, key)` fans out to only the repositories that key needs (never all of them), matching the existing `pack.getSection` procedure's shape so `apps/web/server/routers/pack.ts` can add `getBusinessModelSection`/`listBusinessModelSections` procedures that call it, instead of any client learning about 12 different tables. See `04-backend-services-and-trpc-delta.md` §1.

## 3. New repositories required (`packages/db/src/repositories/`)

Straightforward one-file-per-table additions following the existing repository pattern exactly (hand-written parameterized SQL via `postgres`, no query builder): `conversation-messages.ts`, `conversation-summaries.ts`, `founder-preferences.ts`, `founder-tasks.ts`, `research-findings.ts`, `plan-scores.ts`, `evidence-items.ts`, `citations.ts`, `assumptions.ts`, `personas.ts`, `alternatives.ts`, `competitors.ts`, `wedges.ts`, `business-models.ts`, `offers.ts`.

`business-models.ts` and `offers.ts` close a gap that already existed before this plan (tables from `0007_money.sql` with no repository) — fixing this is in scope here because the business-model/pricing sections cannot be projected without them (rule 2 in `docs/plan/implementation-v2/00-README.md`: no orphaned code).

## 4. Indexing and RLS

Every new tenant-scoped table (`conversation_messages`, `founder_preferences`, `founder_tasks`, `research_findings`, `evidence_items`, `assumptions`, `alternatives`, `competitors`) gets RLS in the same migration that creates it, using the existing `app.current_workspace_ids` session variable and `foundry_app` role from `0002_identity.sql` — no new isolation mechanism. `plan_scores`, `citations`, `personas`, `wedges`, `business_models`, `offers` are scoped transitively through their parent (`pack_revision_id`/`project_id` join), consistent with how `content_blocks` is already scoped through `documents` → `sources` → `projects`.
