-- Up Migration
-- Generated from scripts/better-auth.config.ts (`npx auth@1.5.6 generate`), then hand-reviewed.
-- Extra adapter columns (id_token, scope, password, api_keys.config_id, …) stay so Better Auth 1.5 can write rows.
-- access_token/refresh_token keep adapter names; encrypt-at-rest is a Milestone 2 hook (09 §3/§7).

create extension if not exists pgcrypto;

create table users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  email_verified boolean not null default false,
  image text,
  role text not null default 'founder',
  timezone text not null default 'UTC',
  locale text not null default 'en-IN',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index users_role_idx on users (role) where role <> 'founder';

create table sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  token text not null unique,
  expires_at timestamptz not null,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index sessions_user_idx on sessions (user_id);

create table accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  provider_id text not null,
  account_id text not null,
  access_token text,
  refresh_token text,
  access_token_expires_at timestamptz,
  refresh_token_expires_at timestamptz,
  id_token text,
  scope text,
  password text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider_id, account_id)
);
create index accounts_user_idx on accounts (user_id);

create table verifications (
  id uuid primary key default gen_random_uuid(),
  identifier text not null,
  value text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index verifications_identifier_idx on verifications (identifier);

create table api_keys (
  id uuid primary key default gen_random_uuid(),
  config_id text not null default 'default',
  user_id uuid not null references users (id) on delete cascade,
  key_hash text not null unique,
  name text,
  start text,
  prefix text,
  enabled boolean not null default true,
  rate_limit_enabled boolean,
  rate_limit_time_window integer,
  rate_limit_max integer,
  request_count integer not null default 0,
  remaining integer,
  last_refill_at timestamptz,
  refill_interval integer,
  refill_amount integer,
  expires_at timestamptz,
  last_request_at timestamptz,
  permissions text,
  metadata text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index api_keys_user_idx on api_keys (user_id);
create index api_keys_config_id_idx on api_keys (config_id);

-- Down Migration

drop table if exists api_keys;
drop table if exists verifications;
drop table if exists accounts;
drop table if exists sessions;
drop table if exists users;
