-- Up Migration

alter table sprints add column if not exists job_kind text
  check (job_kind in ('research', 'draft', 'analysis', 'clarification', 'synthesis'))
  default 'analysis';
alter table sprints add column if not exists owner text
  check (owner in ('co_founder', 'ai', 'founder'))
  default 'ai';
alter table sprints add column if not exists parent_job_id uuid references sprints (id);

create index sprints_job_kind_idx on sprints (project_id, job_kind, status);

-- Down Migration

drop index if exists sprints_job_kind_idx;

alter table sprints drop column if exists parent_job_id;
alter table sprints drop column if exists owner;
alter table sprints drop column if exists job_kind;
