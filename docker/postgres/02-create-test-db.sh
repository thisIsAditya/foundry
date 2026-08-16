#!/bin/sh
set -e

if ! psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres -tAc \
  "select 1 from pg_database where datname = 'foundry_test'" | grep -q 1; then
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres \
    -c "create database foundry_test"
fi

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname foundry_test <<'SQL'
create extension if not exists pgcrypto;
create extension if not exists vector;
create extension if not exists pg_trgm;
SQL
