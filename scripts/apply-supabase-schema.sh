#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${SUPABASE_DB_URL:-}" ]]; then
  echo "Missing SUPABASE_DB_URL. Copy the Postgres connection string from Supabase."
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "psql not found. Install Postgres client tools and retry."
  exit 1
fi

psql "$SUPABASE_DB_URL" -f supabase/schema.sql
