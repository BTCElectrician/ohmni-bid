# Ohmni Bid Final Review

## Purpose
Provide a concrete, code-referenced snapshot of the migrated Next.js + Supabase scaffold so ChatGPT 5.2 Pro can review architecture, logic, schema, and gaps before implementation resumes.

## Status (from STATUS.md)
- Phase: implementation
- Review: ChatGPT 5.2 Pro response integrated; internal review updated for completeness/correctness/trade gaps
- Guardrails: minimal code, maximize SDKs/services, files under ~500 lines
- Stripe billing planned; not started
- Next: apply schema + RLS in Supabase, create storage bucket, set envs, and backfill embeddings

## Migration Summary
- Legacy code preserved under `legacy/` (no edits unless requested)
- New stack lives at repo root

## Architecture Snapshot
- UI: Next.js App Router pages in `app/` with Tailwind for styling.
- Estimator engine: pure TypeScript logic in `lib/estimate/*`.
- AI tools: server-only tool implementations in `lib/tools/estimateTools.ts`.
- Data layer: Supabase clients in `lib/db/supabase.ts` (browser/service) and `lib/db/supabaseServer.ts` (server), schema in `supabase/schema.sql`.
- Pricing data: JSON snapshot in `data/pricing_database.json`, import helper in `lib/pricing/importSupabase.ts`.
- Walkthrough capture APIs: `app/api/transcribe/route.ts` and `app/api/vision-count/route.ts` using `lib/ai/*` and `lib/db/supabaseServer.ts`.
- Drafting API: `app/api/draft-items/route.ts` for transcript-to-draft line items with catalog suggestions.
- Walkthrough note fetch: `app/api/walkthrough/latest-note/route.ts` for loading the newest transcript into drafting.

## Core Estimating Logic (code-first)
- Calculation formula (from `lib/estimate/calc.ts`):
  - Total = ((LaborHours * LaborRate) + (Material * (1 + TaxRate))) * (1 + OPRate)
- Unit handling:
  - UnitType: `E`, `C` (per 100), `M` (per 1000), `Lot`
  - Material/Labor extensions scale by unit type (`lib/estimate/calc.ts`).
- Defaults:
  - `DEFAULT_PARAMETERS` in `lib/estimate/defaults.ts`:
    - laborRate: 118.0
    - materialTaxRate: 0.1025
    - overheadProfitRate: 0
- Category order defined in `lib/estimate/defaults.ts` and used for totals.
- Feeder logic in `lib/estimate/feeder.ts`:
  - Combines wire + conduit costs per 100ft with ampacity multiplier.
- Conduit fill guidance in `lib/estimate/sizing.ts` and `validateConduitFill` tool.

## Current UI Behavior
- `app/estimate/page.tsx` handles auth gating and save/load to Supabase with manual save.
- `components/EstimateGrid.tsx` uses AG Grid and recalculates line totals on edit.
- `components/EstimateSummary.tsx` displays totals derived from `lib/estimate/calc.ts`.
- `components/EstimateAssistant.tsx` generates reviewable draft line items and applies them only after user approval.
- `components/EstimateChat.tsx` provides a tool-calling chat view backed by `/api/ai`, with live estimate context.
- `app/api/export/route.ts` recomputes totals server-side and returns `.xlsx` via ExcelJS.

## AI Tool-Calling Boundary
- `app/api/ai/route.ts` uses Vercel AI SDK with tools:
  - `searchCatalog` -> Supabase RPC `match_pricing_items`
  - `getPricingItem` -> `pricing_items` by id
  - `calculateEstimate` -> `lib/estimate/calc.ts`
  - `validateConduitFill` -> `lib/estimate/sizing.ts`
- System prompt: model must call tools for numbers; never guess.

## Supabase Schema (current)
- `pricing_items` table:
  - Vector embedding: `embedding vector(1536)`
  - Index: ivfflat with cosine ops
  - Columns: category/subcategory/name/description/size/unit_type/material_cost/labor_hours/market_price/markup_percent
- `estimates` table:
  - Project info, pricing params, totals, status, metadata
- `estimate_line_items` table:
  - Links to estimate + optional pricing item id
  - Stores extensions and totals
- `proposals` table:
  - Proposal metadata, versioning, PDF URL
- RPC: `match_pricing_items(query_embedding, match_count, category_filter)`

## Pricing Data and Copper Price Tracking Ideas
- `data/pricing_database.json` includes wire fields:
  - `marketPricePer1000ft`, `markupPercent`, `materialCostPer1000ft` (computed if missing)
- Import helper `lib/pricing/importSupabase.ts`:
  - Batch inserts into `pricing_items`
  - Computes wire material cost if missing
- Legacy tooling for pricing sync:
  - Extraction: `legacy/scripts/extract_pricing.py`
  - Sync monitor: `legacy/scripts/price_sync_monitor.py`
  - Email notifier: `legacy/scripts/price_sync_email.py`
- Supplier pricing integration scaffolding (future):
  - `legacy/flask_integration/services/supplier_pricing_service.py`
  - Includes CSV import fallback and supplier adapter stubs (Graybar, WESCO)

## Gemini Pro Trade-Specific Enhancements (to add)
These features target electrical-market volatility and real installation constraints.

### 1) Dynamic Commodity Indexing (Copper/Steel Basis)
Add a commodity basis object so wire/conduit prices can float with COMEX instead of being hardcoded.

Example (wire):
```json
{
  "id": "wire.cu.thhn.12",
  "baseMaterial": "COPPER",
  "weightPer1000ft": 20.0,
  "pricing": {
    "basis": "COMEX_COPPER",
    "adder": 0.45,
    "lastLockedPrice": 142.50
  }
}
```
Why:
- Protects contractors from weekly commodity swings.
- Enables locked-pricing estimates for large shops.

#### Commodity Indexing Draft Schema (minimal)
- New tables (Supabase):
  - `commodity_indices`: `id`, `name`, `base_material`, `unit`, `source`, `is_active`
  - `commodity_quotes`: `id`, `index_id`, `quote_date`, `price`, `source_url`, `retrieved_at`
- `pricing_items` additions:
  - `base_material`, `weight_per_unit`, `commodity_index_id`, `commodity_adder`, `last_locked_price`, `last_locked_at`
- Pricing rule:
  - If `commodity_index_id` is set, compute material cost from weight * latest quote + adder.
  - If `last_locked_price` is set, use it until a lock expiry policy is defined.

### 2) NECA Labor Columns (Difficulty Scaling)
Replace a single `laborHours` with labor columns (standard, difficult, complex, retrofit).

Example (conduit):
```json
{
  "id": "conduit.emt.ss.4.0",
  "laborColumns": {
    "1_standard": 18.775,
    "2_difficult": 23.47,
    "3_complex": 28.16,
    "retrofit": 32.50
  }
}
```
Why:
- Matches real estimator workflows (NECA columns).
- Avoids a blunt global multiplier.

### 3) Physical Properties for Code Validation
Store actual geometry so conduit fill and weight checks are calculable.

Examples:
```json
{
  "physicalProperties": {
    "innerDiameterInch": 0.622,
    "areaSqInch": 0.304,
    "maxFill40Percent": 0.122
  }
}
```
```json
{
  "physicalProperties": {
    "outerDiameterInch": 0.130,
    "areaSqInch": 0.0133
  }
}
```
Why:
- AI can prove fill compliance and auto-upsize.
- Enables total weight warnings and handling needs.

### 4) Phase/Milestone Tagging (Cash Flow)
Tag items/categories with milestones and lead times.

Example:
```json
{ "category": "ELECTRICAL_SERVICE", "milestone": "GEAR_PROCUREMENT", "leadTimeWeeks": 40 }
```
Why:
- Produces spend curves and long-lead warnings.
- Helps owners plan deposits and procurement timing.

### 5) Cut Logic vs Net Length (Waste Optimization)
Capture reel sizes and pull limits instead of a flat waste percent.

Example:
```json
{
  "id": "wire.cu.thhn.500mcm",
  "packagingLogic": {
    "type": "CUT_TO_LENGTH",
    "standardReelSizes": [1000, 2500, 5000],
    "canParallel": true,
    "maxPullLength": 400
  }
}
```
Why:
- Generates accurate cut sheets and reduces scrap.
- Bridges estimating into execution planning.

## Where This Was Discussed Before (Repo Check)
- Partial mentions only in legacy:
  - Commodity pricing idea in `legacy/flask_integration/services/supplier_pricing_service.py`.
  - Copper price adjustments noted in `legacy/README.md`.
- Conduit fill guidance table exists in `lib/estimate/sizing.ts`, with validation helper in `lib/tools/estimateTools.ts`.
- No NECA labor columns, milestone tagging, or packaging logic in new stack yet.

## Environment Variables
- From `docs/ENV.md`:
  - Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
  - OpenAI: `OPENAI_API_KEY`, `OPENAI_CHAT_MODEL`, `OPENAI_EMBEDDINGS_MODEL`

## Known Gaps / Risks to Review
- Embedding dimension alignment:
  - Default embedding model now targets `text-embedding-3-small` (1536 dims); ensure env overrides do not break this.
- Storage bucket and RLS policies must be applied in Supabase to match the new schema.
- No embedding generation/refresh pipeline for `pricing_items`.
- Stripe billing not implemented.
- Inngest workflows not implemented.

## Review Focus for ChatGPT 5.2 Pro
- Validate schema and API boundaries for tool-calling AI.
- Confirm minimal-code architecture while meeting product scope.
- Identify missing security/RLS concerns and recommend constraints.
- Propose a tight integration plan sequence with minimal steps.
- Confirm calculation logic parity with legacy formulas (`legacy/ELECTRICAL_BID_LOGIC.md`).
- Evaluate Gemini Pro trade-specific enhancements for feasibility and sequencing.

## ChatGPT 5.2 Pro Response (Pasted, 2026-01-14)
According to a document from **January 14, 2026**, you're *already* much closer than you think: you have a clean Next.js + Supabase scaffold, a pure TypeScript estimator engine, an AI tool-calling boundary, and an XLSX export route. That's the correct "minimum-code" foundation for the voice/photo/chat estimator you're describing.

## My take on your idea

Your "walk the job, talk into phone, get a filled-out calculated estimate + chatbot + web lookup + photo counts (reviewable)" is **absolutely feasible as an MVP** without inventing new AI, *as long as* you keep the workflow human-in-the-loop and you focus on a tight vertical slice.

The scaffold you shared already follows the right architecture principle for production AI: **the model doesn't "do math" or "guess prices" -- it calls tools** (catalog search + get item + calculate + conduit-fill validation). That's the right boundary for estimator trust.

What's missing isn't "AI magic." It's mainly:

- **Persistence** (estimates + line items currently live in memory only)
- **Auth + RLS** (multi-tenant security for real companies)
- **Embedding pipeline + dimension alignment** (vector search reliability)

Those three are what make it real.

## The MVP I'm "approving" (what to build first)

This is the smallest version that genuinely supercharges estimators in the field:

### 1) Estimate workspace (already mostly there)

- AG Grid line items + summary totals
- Server-side recompute for export (you already do this)
- Save/load estimates to Supabase (missing today)

### 2) Walkthrough mode (mobile-first UI inside the same web app)

A special screen optimized for a phone:

- Big "Record note" button
- Big "Take photo" button
- A running "Draft takeoff" list that fills in as the user speaks
- Clear "Review & apply" actions

### 3) AI assistant panel (chatbot that can *edit the estimate*, not just talk)

The chat must be tool-driven:

- "Add 12 duplex receptacles in office area"
- "What's the total if labor rate is 125 and O&P is 12%?"
- "Validate conduit fill for 8 THHN #12 in 3/4 EMT"
  ...and it **must call tools** for catalog lookups + calculation. (Your prompt/tool setup is already oriented this way.)

### 4) Photo "count suggestions" with user review

- Take photo -> AI proposes counts + confidence -> user confirms/edits
- You should treat the output as *suggestions*, not truth. OpenAI explicitly notes that "counting... may give approximate counts." ([OpenAI Platform][1])

### 5) Web lookup tool inside the assistant (optional toggle)

- The estimator can ask: "Look up NEC conduit fill rule for X" or "pulling tension guideline"
- Results are shown with sources (citations/links), not just model claims
  (Implement as a tool; don't let the model "browse" implicitly.)

## Architecture blueprint

You already have the right core separation:

- **UI**: Next.js App Router + Tailwind (existing)
- **Estimator engine**: pure TS logic under `lib/estimate/*` (existing)
- **AI tools**: server-only tool implementations (existing pattern)
- **Data**: Supabase schema + RPC for vector search (existing)

What you're adding is a "Walkthrough pipeline" that produces **draft** line-items.

### A. Client (Next.js web app -> behaves like mobile app)

- Make it a **PWA** so it feels app-like on phones (home screen icon, full screen, camera/mic permissions).
- Local-first *drafting*: keep the active walkthrough session in memory + localStorage; sync to Supabase when online.

### B. Supabase (Postgres + Storage)

Keep your existing tables, and add just enough to support walkthrough capture.

**Keep (existing):**

- `pricing_items` (vector search)
- `estimates`, `estimate_line_items`, `proposals`

**Add (minimal):**

- `organizations` (id, name)
- `org_members` (org_id, user_id, role)
- `walkthrough_sessions` (id, org_id, estimate_id, created_by, status)
- `walkthrough_notes` (session_id, transcript_text, started_at, ended_at, raw_audio_path?)
- `walkthrough_photos` (session_id, storage_path, ai_counts_json, reviewed_by, reviewed_at)

This keeps the estimating tables clean while capturing raw field data for audit and later improvements.

### C. Next.js Route Handlers (server)

You already have:

- `/api/ai` (Vercel AI SDK + tools)
- `/api/export` (Excel export)

Add:

- `/api/transcribe`
  - input: audio blob
  - output: transcript text
  - store: `walkthrough_notes` (+ optional raw audio in Supabase Storage)
  - Use OpenAI speech-to-text models (ex: `gpt-4o-transcribe` / `gpt-4o-mini-transcribe`). ([OpenAI][2])

- `/api/vision-count`
  - input: image
  - output: `{counts: {...}, confidence: {...}, notes: "..."}`
  - store: `walkthrough_photos.ai_counts_json`
  - Explicitly label as "suggested," because image counting is approximate. ([OpenAI Platform][1])

- `/api/estimate/persist` (or just do it directly via Supabase client + RLS)
  - save estimate + line items

### D. AI orchestration (tool calling)

You're already using the right concept: tools like `searchCatalog`, `getPricingItem`, `calculateEstimate`, `validateConduitFill`.

To make "walk and talk" work, add **two** tool categories:

#### 1) "Drafting tools" (write *draft* items, not final)

- `proposeLineItemsFromTranscript(transcript, context)`
  - returns: list of **draft** line items with fields:
    - `description`
    - `suggested_pricing_item_id` (optional)
    - `qty`, `unit_type`
    - `assumptions[]`
    - `confidence` (0-1)
- Then the UI forces user to **accept/apply**.

This prevents silent hallucinated edits.

#### 2) "Estimate editing tools" (only executed on explicit user intent)

- `addLineItem(estimate_id, pricing_item_id, qty, overrides?)`
- `updateLineItem(line_item_id, patch)`
- `removeLineItem(line_item_id)`
- `recalculateEstimate(estimate_id)` (calls your TS calc)

This is the trust boundary: *the assistant can suggest; the user approves; the system calculates.*

Tool calling is a first-class pattern in both OpenAI's function/tool calling docs and Vercel AI SDK's "tools" approach. ([OpenAI Platform][3])

## How the "walkthrough" actually flows

Here's the workflow that feels magical but stays reliable:

1. **Estimator starts walkthrough session** (ties to an estimate)
2. **Records a voice note**:
   "Two new 20A circuits to the kitchen, 6 duplexes, one GFCI, homeruns back to panel A."
3. Server transcribes audio -> text (store it)
4. AI takes transcript + current estimate context and returns **draft line items** + questions:
   - "Are these surface mount or in-wall?"
   - "Is this new panel space available?"
5. Estimator taps "Apply draft" (or edits quantities/descriptions first)
6. System calls catalog search + pricing item gets + calculate tool (your existing tool boundary)
7. Totals refresh live in the grid

Photos are similar:

- Take photo -> AI suggests "8 duplex, 2 switches, 1 panelboard" -> estimator confirms -> apply to estimate.

## Critical fixes to make your scaffold production-ready

These are non-negotiable for a real estimator product.

### 1) Fix embedding dimension mismatch now

Your doc calls out the risk: schema has `vector(1536)` while the default embedding model is `text-embedding-3-large` (3072 dims).

OpenAI's embeddings guide confirms: **1536** dims for `text-embedding-3-small`, **3072** for `text-embedding-3-large`. ([OpenAI Platform][4])

**My recommendation (minimum-code):**

- Keep `vector(1536)` and standardize on `text-embedding-3-small` for catalog search.
  It's plenty for this use case and avoids schema changes.

(Alternative: change schema to 3072 and use large everywhere -- but that's more migration risk.)

### 2) Add Auth + RLS before "teams"

You noted: "No Auth/RLS policies yet."

Without RLS, you can't safely serve both "one-man shop" and "200-person shop."

Minimum approach:

- Supabase Auth for login
- `org_id` on every business table
- RLS: `org_members` determines access; users only see rows in their org
- Service role key stays **server-only** (never shipped to browser)

### 3) Add persistence: estimates + line items must save

Your UI currently keeps estimate state in memory only.

This is the biggest "field usability" blocker. Walkthrough mode especially needs save/resume.

### 4) Add an embedding generation/refresh path

You called out: "No embedding generation/refresh pipeline for pricing_items."

Minimum solution:

- When you import pricing JSON -> generate embeddings at import time.
- For future edits: a small admin script or Edge Function that backfills missing embeddings.

## About the "trade-specific enhancements" in your doc

These are *excellent* differentiators, but they can be staged cleanly.

You listed:

- Dynamic commodity indexing (COMEX copper basis)
- NECA labor columns (difficulty scaling)
- Physical properties for code validation (fill/weight)
- Milestone tagging (cash flow / lead time)
- Cut logic / reel sizes / pull limits

**My sequencing recommendation (still minimal-code):**

1. **NECA labor columns** -> biggest estimator workflow win, relatively contained to schema + calc selection
2. **Physical properties** -> your conduit fill validation already exists; this makes it stronger
3. **Commodity indexing** -> huge commercial value, but needs data ingestion discipline
4. Milestones + cut logic -> "estimate -> operations" bridge; best once core estimating UX is stable

## Final approval (with explicit constraints)

Approved architecture direction for your "AI supercharged estimator" MVP, specifically because your scaffold already enforces:

- a deterministic estimator engine (`lib/estimate/*`)
- a tool-calling boundary for AI (catalog + calc + validations)
- a server-side export recomputation step (trustworthy totals)

**Approval constraints (to avoid over-engineering and avoid estimator distrust):**

1. **Human-in-the-loop always**: voice/photo produce *drafts*; user approves before applying.
2. **No "AI math"**: totals always computed by `calculateEstimate` / estimator engine tools (as you've already designed).
3. **Fix multi-tenant security early**: Auth + RLS before you onboard multiple companies.
4. **Standardize embeddings**: align vector size + model (1536 <-> `text-embedding-3-small`). ([OpenAI Platform][4])
5. **Be honest about image counting**: label it "approximate suggestion" in the UI. ([OpenAI Platform][1])

If you follow those, you get the "supercharged estimator" experience fast, without building fragile AI features that erode trust.

If you want, in a follow-up I can turn this into a concrete "repo plan" (exact new routes, tables, RLS policy outline, and the minimal tool schemas for transcript->draft items and photo counts) that fits your guardrails (small files, heavy use of SDKs/services).

[1]: https://platform.openai.com/docs/guides/images-vision?utm_source=chatgpt.com "Images and vision | OpenAI API"
[2]: https://openai.com/index/introducing-our-next-generation-audio-models/?utm_source=chatgpt.com "Introducing next-generation audio models in the API"
[3]: https://platform.openai.com/docs/guides/function-calling?utm_source=chatgpt.com "Function calling | OpenAI API"
[4]: https://platform.openai.com/docs/guides/embeddings?utm_source=chatgpt.com "Vector embeddings | OpenAI API"

## Agent Review Notes (2026-01-15)
### Completeness and correctness
- `calculateEstimateTotals` in `lib/estimate/calc.ts` rounds `finalBid` up to whole dollars via `Math.ceil`, which is not called out in the formula summary.
- `categoryTotals` sums `lineItem.totalCost`, which already includes tax and overhead; category totals will not reconcile 1:1 with `subtotal` and `overheadProfit`, and the final bid is rounded.
- `validateConduitFill` is implemented in `lib/tools/estimateTools.ts` and uses a sizing lookup; it is guidance, not a true NEC fill calculation with conductor areas.
- `CONDUIT_SIZING` in `lib/estimate/sizing.ts` is a fixed table keyed by wire size and conductor count; there is no handling for insulation type, number of conductors beyond the table, or percent-fill thresholds.

### Missing trade-specific requirements (not yet modeled)
- Separate material sales tax vs markup, with jurisdiction-specific tax rules (labor should remain untaxed).
- Labor burden and productivity modifiers beyond NECA columns (crew mix, supervision, shift differential, non-productive time).
- NEC-driven sizing inputs (insulation type, conductor OD, conduit type) plus voltage-drop checks for feeders.
- Conductor derating for ambient temperature and number of current-carrying conductors (branch circuits + feeders).
- Grounding/bonding conductor sizing and equipment/breaker short-circuit ratings (SCCR).
- Device/fixture assembly takeoffs and small-material allowances (boxes, fittings, connectors, supports).
- General conditions allowances (permits, bonding/insurance, equipment rental, mobilization, freight).
- Change-order/alternate workflows (add-deducts, unit pricing, contingency/escalation allowances).

## References (key files)
- STATUS: `STATUS.md`
- Schema: `supabase/schema.sql`
- AI endpoint: `app/api/ai/route.ts`
- Export endpoint: `app/api/export/route.ts`
- Walkthrough endpoints: `app/api/transcribe/route.ts`, `app/api/vision-count/route.ts`
- Walkthrough latest-note endpoint: `app/api/walkthrough/latest-note/route.ts`
- Drafting endpoint: `app/api/draft-items/route.ts`
- Estimator logic: `lib/estimate/*`
- Tool helpers: `lib/tools/estimateTools.ts`
- Supabase server client: `lib/db/supabaseServer.ts`
- AI helpers: `lib/ai/transcribe.ts`, `lib/ai/visionCount.ts`
- Assistant UI: `components/EstimateAssistant.tsx`
- Chat UI: `components/EstimateChat.tsx`
- Pricing import: `lib/pricing/*`
- Pricing data: `data/pricing_database.json`
- Estimate UI: `app/estimate/page.tsx`, `components/EstimateGrid.tsx`, `components/EstimateSummary.tsx`
- Legacy logic reference: `legacy/ELECTRICAL_BID_LOGIC.md`
