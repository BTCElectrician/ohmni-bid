# Pricing Update Flow

This pipeline replaces the legacy extractor with a deterministic, scriptable flow.

## 1) Extract from Excel

```bash
npm run pricing:extract
```

This reads the Excel workbook and writes `data/pricing_database.json` with stable `externalRef` values.

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

## Env vars used

- `EXCEL_PASSWORD`
- `PRICING_XLSX_PATH` (optional)
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PRICING_JSON_PATH` (optional)
