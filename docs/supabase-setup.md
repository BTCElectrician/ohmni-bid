# Supabase Setup (One-Brain Workflow)

This project keeps Supabase schema, policies, and setup steps in-repo so you can
apply changes from one place alongside your code.

## Required setup

1. Create a Supabase project.
2. Open Connect > Connection string in the Supabase dashboard. Keep Type = URI,
   Source = Primary Database, and choose Session Pooler if you are on an IPv4
   network.
3. Set `SUPABASE_DB_URL` locally and apply the schema:

```bash
export SUPABASE_DB_URL='postgresql://...'
npm run supabase:apply
```

4. The schema apply now creates the `walkthrough` storage bucket and its policies.

## Runtime env vars

Set the runtime keys in `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
OPENAI_API_KEY=...
```

Supabase labels the keys as publishable/secret in the dashboard. Use publishable
for `NEXT_PUBLIC_SUPABASE_ANON_KEY` and secret for `SUPABASE_SERVICE_ROLE_KEY`.

## CLI smoke test

With the dev server running, set `SMOKE_TEST_EMAIL` (or `DEV_LOGIN_EMAIL`) and run:

```bash
scripts/smoke/run_smoke_tests.sh
```

That’s it. The schema + policies now live in `supabase/schema.sql`, and the
application reads from the same source of truth.
