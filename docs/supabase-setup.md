# Supabase Setup (One-Brain Workflow)

This project keeps Supabase schema, policies, and setup steps in-repo so you can
apply changes from one place alongside your code.

## Required setup

1. Create a Supabase project.
2. Copy the Postgres connection string from the Supabase dashboard (Database > Connection string).
3. Set `SUPABASE_DB_URL` locally and apply the schema:

```bash
export SUPABASE_DB_URL="postgresql://..."
bash scripts/apply-supabase-schema.sh
```

4. Create the `walkthrough` storage bucket in Supabase Storage.
5. Apply storage policies for authenticated users (see your SQL notes or ask me to re-share).

## Runtime env vars

Set the runtime keys in `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
OPENAI_API_KEY=...
```

That’s it. The schema + policies now live in `supabase/schema.sql`, and the
application reads from the same source of truth.
