# Pricing Update Flow

This pipeline replaces the legacy extractor with a deterministic, scriptable flow.

## 1) Extract from Excel

```bash
npm run pricing:extract
```

This reads the Excel workbook and writes `data/pricing_database.json` with stable `externalRef` values.

## Quick sync (one command)

```bash
scripts/pricing/run_full_sync.sh
```

Runs extract, import, embeddings backfill, and marks the Excel hash as synced.

## 2) Import into Supabase

```bash
npm run pricing:import
```

This upserts into `pricing_items` using `external_ref`, so IDs remain stable.

## 3) Refresh embeddings

```bash
npm run embeddings:backfill
```

This keeps semantic search aligned with the latest pricing text.

## Optional: Monitor Excel changes

```bash
python3 scripts/pricing/price_sync_monitor.py
```

This records checks in `data/sync_history.json` so you can see if the master Excel
changed since the last sync.

## Optional: Email the monitor summary

```bash
python3 scripts/pricing/price_sync_email.py
```

This sends a summary email using `EMAIL_USER`, `EMAIL_PASS`, and `EMAIL_TO`.

## Env vars used

- `EXCEL_PASSWORD`
- `PRICING_XLSX_PATH` (optional)
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PRICING_JSON_PATH` (optional)
