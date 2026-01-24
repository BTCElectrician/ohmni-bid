# Environment Variables

## Supabase

- `NEXT_PUBLIC_SUPABASE_URL` (format: `https://<project-ref>.supabase.co`)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Supabase "publishable" key)
- `SUPABASE_SERVICE_ROLE_KEY` (Supabase "secret" key; server-only)
- `SUPABASE_DB_URL` (copy from Connect > Connection string; use Session Pooler on IPv4; only needed for `npm run supabase:apply`)
- `PRICING_JSON_PATH` (optional override for pricing import)
- `PRICING_BATCH_SIZE` (default: 500)

If your DB password includes `$`, wrap `SUPABASE_DB_URL` in single quotes when
exporting it in a shell.

## Pricing Extraction

- `EXCEL_PASSWORD` (password for the pricing workbook)
- `PRICING_XLSX_PATH` (optional override for the Excel workbook path)

## Pricing Monitor Email

- `EMAIL_USER` (Gmail address used to send alerts)
- `EMAIL_PASS` (Gmail app password)
- `EMAIL_TO` (recipient address)

## OpenAI

- `OPENAI_API_KEY`
- `OPENAI_CHAT_MODEL` (default: gpt-4.1-mini)
- `OPENAI_EMBEDDINGS_MODEL` (default: text-embedding-3-small)
- `OPENAI_TRANSCRIBE_MODEL` (default: gpt-4o-mini-transcribe)
- `OPENAI_VISION_MODEL` (default: gpt-4o-mini)
- `EMBEDDINGS_BATCH_SIZE` (default: 40)
- `EMBEDDINGS_DRY_RUN` (set `1` to skip updates)

## Walkthrough Storage

- `WALKTHROUGH_BUCKET` (default: walkthrough)

## Local Auth Bypass (Dev)

- `DEV_LOGIN_EMAIL` (optional; used by `/api/auth/dev-login` if no email is provided)
