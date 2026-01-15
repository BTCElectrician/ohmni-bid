# Ohmni Bid (Next Stack)

Fresh implementation of the electrical estimating system with a tool-calling AI layer and a spreadsheet-grade UI.

## Stack

- Next.js 15 (App Router)
- Vercel AI SDK (tool-calling)
- Supabase (Postgres + pgvector + Auth/Storage)
- AG Grid (editable estimate spreadsheet UI)
- ExcelJS (export .xlsx snapshots)
- Inngest (background jobs)

## Quick start

1. Configure env vars in `.env.local` (see `docs/ENV.md`).
2. Run `npm install` and `npm run dev`.

## Legacy

The original codebase is preserved in `legacy/`.
