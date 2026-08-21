-- Up Migration

alter table user_mcp_servers add column if not exists read_only boolean not null default false;

-- Down Migration

alter table user_mcp_servers drop column if exists read_only;
