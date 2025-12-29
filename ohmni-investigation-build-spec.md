# ohmni-investigation — Build Spec for Cursor Agent (OpenAI Route)

Owner: **Ohmni Oracle LLC**  
Project: **ohmni-investigation**  
Purpose: Evidence-driven “follow-the-money” watchdog for electrical workforce training funding streams.  
Key principle: **Signals + evidence + next tests** (never accusations).

> **Read this like a PRD + implementation plan.** Build exactly what’s described. Keep it minimal. Prefer simple libraries, simple data flows, deterministic outputs.

---

## 0) Executive summary (what you’re building)

Build a repo that, on a daily schedule:

1. **Discovers** new sources (official docs + reputable news + filings) relevant to electrical workforce training funding.
2. **Extracts** key facts into strict JSON objects:
   - `Evidence` (source/provenance + excerpt)
   - `Entity` (canonical org/vendor/person registry)
   - `Lead` (ranked “signals” with evidence IDs + innocent explanations + next tests)
3. **Publishes** artifacts into a static site folder.
4. **Commits** artifacts back to the repo automatically.
5. **Deploys** the static site automatically (GitHub Pages).

No backend. No UI build system required (static HTML + Tailwind CDN is fine).  
Everything must be auditable and reproducible.

---

## 1) Non-negotiables (safety + credibility)

### 1.1 Defamation firewall (hard rules)
- Do **not** output “fraud”, “kickback”, “illegal”, “corrupt” as conclusions.
- Use **signal / anomaly / risk / needs review** language only.
- Do not assert intent. No mind-reading.
- Every `Lead` must include:
  - `evidence_ids[]`
  - `innocent_explanations[]` (best benign explanations)
  - `next_tests[]` (minimal steps that could falsify the suspicion)
- Public artifacts must redact personal addresses / personal phones / bank details.

### 1.2 “Escalate” definition
`status="escalate_for_review"` means: **strong evidence-backed signal** worthy of formal review, not guilt.

---

## 2) Tech stack (required)

### 2.1 Core (must-have)
- Python 3.11+
- OpenAI **Responses API** (not Chat Completions)
- OpenAI built-in **web_search** tool
- Pydantic v2 (structured output parsing + validation)
- YAML config (seed queries + watchlist)
- GitHub Actions (daily cron + auto-commit artifacts)
- GitHub Pages (deploy `site/`)

### 2.2 Libraries (approved)
Core requirements file (extended but still minimal):

```txt
openai>=1.50.0
pydantic>=2.7.0
python-dotenv>=1.0.1
pyyaml>=6.0.2
requests>=2.32.0
pymupdf>=1.24.0
rapidfuzz>=3.9.0
networkx>=3.3
duckdb>=1.0.0
```

Rules:
- **Do not introduce a framework** (FastAPI, Django, etc).
- Keep ingestion minimal. Only add a library if it enables a specific capability.
- If a feature can be done with standard library, do that.

---

## 3) Repo structure (required)

Use this structure:

```txt
ohmni-investigation/
  docs/
    CHARTER.md
    METHODOLOGY.md
    SAFETY_AND_NON_ACCUSATION.md
  worker/
    prompts/
      system_investigator.md
      run_daily.md
    schemas/
      entity.schema.json
      evidence.schema.json
      lead.schema.json
    sources.yaml
    requirements-openai.txt
    run_daily_openai.py
    validate_artifacts.py
    lint_public_text.py
    utils/
      ids.py
      dedupe.py
      archive.py
      normalize.py
  data/
    raw/                 # archived PDFs/HTML (gitignored by default)
    runs/                # run logs
  site/
    index.html
    app.js
    data/
      evidence.json
      entities.json
      leads.json
    casebook/
      manifest.json
      YYYY-MM-DD.md
  .github/workflows/
    daily-scan.yml
    pages.yml
  .env.example
  README.md
```

Notes:
- `site/` must remain **pure static assets**.
- `data/raw/` is not committed by default (gitignored). Artifacts contain hashes/paths.
- Cursor Agent should modify or add files as needed, but keep structure.

---

## 4) Data contracts (schemas)

### 4.1 Required object types
- **Evidence**: provenance + excerpt + summary + relevance tags + confidence
- **Entity**: canonical ID + aliases + roles + relationships + confidence
- **Lead**: ranked signal with evidence IDs + innocent explanations + next tests + confidence + status

### 4.2 Schema enforcement
- Store JSON Schemas in `worker/schemas/*.schema.json`.
- Every run must validate newly written artifacts against schemas.
- If validation fails: **do not commit** (CI should fail).

---

## 5) Daily workflow (OpenAI route)

### 5.1 Inputs
- `worker/sources.yaml` defines:
  - `queries[]`: discovery queries
  - `watchlist[]`: entities/sites to watch (names + optional URLs)
- `.env` defines:
  - `OPENAI_API_KEY`
  - `OHMNI_OPENAI_MODEL`
  - `OHMNI_OPENAI_REASONING_EFFORT`
  - `OHMNI_RUN_DATE` (optional override for backfill)

### 5.2 Steps (exact)
1. **Discover**: run `web_search` using queries + watchlist name expansions.
2. **Select**: keep at most **N=20** candidate sources per day (configurable).
3. **Acquire/Archive** (optional but recommended):
   - Fetch HTML/PDF via `requests`
   - Store as `data/raw/{sha256}.{ext}`
   - Save `content_hash` + `archive_path` in Evidence
4. **Extract**:
   - HTML: pull a clean excerpt (title + key paragraph(s))
   - PDF: if downloaded, extract text with PyMuPDF; store short excerpt + page refs if feasible
5. **Model synthesis**:
   - Call OpenAI Responses API with:
     - `tools=[{"type":"web_search"}]`
     - `responses.parse()` into a strict Pydantic model `DailyOutput`
   - The model returns:
     - `evidence[]`, `entities[]`, `leads[]`, `casebook_markdown`
6. **Merge (upsert)**:
   - Upsert into `site/data/*.json` using deterministic IDs + dedupe keys
7. **Write casebook**:
   - Write `site/casebook/YYYY-MM-DD.md`
   - Update `site/casebook/manifest.json` with list of available casebook files
8. **Run log**:
   - Write `data/runs/YYYY-MM-DD.json` with counts + IDs + model + timestamps
9. **Validate + lint**:
   - Validate artifacts against JSON schemas
   - Run text lint to enforce “no accusation” vocabulary in public outputs
10. **Commit** artifacts (CI):
   - Commit only:
     - `site/data/*`
     - `site/casebook/*`
     - `data/runs/*`

---

## 6) Model options (best + practical)

### 6.1 Default (simple, strong)
- `OHMNI_OPENAI_MODEL=gpt-5.2`
- `OHMNI_OPENAI_REASONING_EFFORT=high`

### 6.2 “Best-in-business” two-stage pipeline (recommended)
Implement as optional mode (`OHMNI_TWO_STAGE=true`):

Stage 1: **Scan + shortlist**
- model: `gpt-5-mini`
- reasoning: low/medium
- output: candidate sources + preliminary leads

Stage 2: **Adjudicate**
- model: `gpt-5.2` or `gpt-5.2-pro`
- reasoning: high
- input: top K candidates from stage 1 (K=10–30)
- output: final schema-valid Evidence/Entity/Lead + casebook

Must remain deterministic and schema-valid either way.

---

## 7) Deterministic IDs + dedupe (required)

### 7.1 ID rules
Use stable IDs so repeated runs don’t duplicate.

Implement helpers in `worker/utils/ids.py`:

- `evidence_id` = `ev_` + sha256( canonical_url + published_date + title )[:16]
- `entity_id`   = `en_` + sha256( normalized_primary_name + jurisdiction )[:16]
- `lead_id`     = `ld_` + sha256( signal_category + normalized_title + start_date + end_date )[:16]

### 7.2 Dedupe keys
Implement `worker/utils/dedupe.py`:
- Evidence: key by `evidence_id`
- Entity: key by `entity_id`, merge aliases
- Lead: key by `lead_id`, update fields if new evidence increases confidence

### 7.3 Merging policy
- Never delete old items; only update/merge.
- Preserve `created_at`; update `updated_at` on changes.
- Append new `evidence_ids` to leads if same lead reappears.

---

## 8) Archiving + provenance (required)

### 8.1 Archive behavior
Implement `worker/utils/archive.py`:
- Download page/PDF (when not too large)
- Save to `data/raw/{sha256}.{ext}`
- Store:
  - `retrieved_at`
  - `content_hash` (sha256)
  - `archive_path` (relative path)

### 8.2 Public vs private
- Keep `data/raw/` gitignored by default.
- Public artifacts only store **hash + path** (path may be empty if not archived).

---

## 9) Evidence quality filters (required)

Implement a simple scoring before model synthesis:
- Prefer:
  - official sources (.gov, official org sites)
  - primary press releases
  - reputable news
- Reject or de-prioritize:
  - duplicate URLs
  - thin aggregator pages
  - low-content pages without concrete details

Config:
- max sources/day: `OHMNI_MAX_SOURCES` default 20
- min quality threshold: `OHMNI_MIN_SOURCE_SCORE` default 0.3

---

## 10) Lead scoring + categories (required)

Use these categories in `Lead.signal_category`:
- vendor_concentration
- related_party_risk
- threshold_splitting
- vague_spend_inflation
- pass_through_pattern
- timeline_anomaly
- reporting_mismatch
- unknown

Rules:
- Every lead must include:
  - `innocent_explanations` (>=1)
  - `next_tests` (>=1)
  - `confidence` in [0, 1]
- Default to `status="needs_data"` when evidence is thin.

---

## 11) Static site requirements (required)

### 11.1 Must-have pages/behaviors
- Lead board:
  - search box
  - status filter
  - sort by confidence desc
  - show evidence IDs, innocent explanations, next tests
- Casebook:
  - list recent casebook entries from `manifest.json`
  - link to each daily markdown
- Summary counts:
  - total leads, entities, evidence
  - last updated timestamp

### 11.2 Site constraints
- No build step required.
- Use Tailwind CDN.
- Load JSON via `fetch()` from `site/data/*.json`.

---

## 12) GitHub Actions (required)

### 12.1 Daily scan workflow (`.github/workflows/daily-scan.yml`)
- Runs on cron + manual dispatch
- Installs Python deps
- Runs worker
- Updates casebook manifest
- Commits artifacts back to `main`

Secrets:
- `OPENAI_API_KEY`

### 12.2 Pages workflow (`.github/workflows/pages.yml`)
- Deploys `site/` on every push to `main` that changes `site/**`

---

## 13) Local dev workflow (required)

### 13.1 `.env.example`
Include:
```env
OPENAI_API_KEY=
OHMNI_OPENAI_MODEL=gpt-5.2
OHMNI_OPENAI_REASONING_EFFORT=high
OHMNI_MAX_SOURCES=20
OHMNI_TWO_STAGE=false
OHMNI_RUN_DATE=
```

### 13.2 Commands
- Install:
  - `pip install -r worker/requirements-openai.txt`
- Run:
  - `python worker/run_daily_openai.py`
- Validate:
  - `python worker/validate_artifacts.py`
- Lint:
  - `python worker/lint_public_text.py`

---

## 14) Required new scripts (Cursor Agent must implement)

### 14.1 `worker/validate_artifacts.py`
Validates:
- `site/data/evidence.json` against evidence schema (array of Evidence)
- `site/data/entities.json` against entity schema (array of Entity)
- `site/data/leads.json` against lead schema (array of Lead)

Use Pydantic re-parse (preferred) or add `jsonschema` if necessary.

### 14.2 `worker/lint_public_text.py`
Fail if public artifacts contain banned words in key contexts:
- banned: "fraud", "kickback", "illegal", "corrupt", "stole", "embezzl"
This is a safety net, not a primary control.

### 14.3 `worker/utils/normalize.py`
- URL canonicalization (strip tracking params)
- name normalization (lowercase, strip punctuation)
- date normalization

### 14.4 `worker/utils/archive.py`
- requests download + sha256 hash + file write
- detect content type, choose extension
- return `retrieved_at`, `content_hash`, `archive_path`

---

## 15) OpenAI implementation details (required)

### 15.1 Use Responses API + structured parsing
In Python, use the official SDK and `responses.parse()` to parse into a Pydantic model.

The model output must be a strict `DailyOutput` object:
- `run_date`
- `evidence[]`
- `entities[]`
- `leads[]`
- `casebook_markdown`

### 15.2 Tool usage
Enable `web_search`. The model should:
- use web_search for discovery
- cite URLs inside Evidence

### 15.3 Prompt discipline
System prompt must include:
- defamation firewall
- schema output requirement
- workflow steps
- “if insufficient evidence, set status=needs_data”

Run prompt includes:
- run date
- sources.yaml content
- max sources/leads constraints
- output paths

---

## 16) Acceptance criteria (definition of done)

### 16.1 v1 Done when:
- Running locally produces:
  - valid JSON in `site/data/*`
  - a casebook markdown file for today
  - a run log
- GitHub Action runs daily and commits artifacts without manual intervention
- GitHub Pages shows:
  - lead board populated
  - casebook index populated
  - counts update
- Validation + lint run in CI and can block commits if broken
- All outputs follow non-accusation rules

### 16.2 v1.5 Done when:
- Deterministic IDs prevent duplicates
- Archive/hashing is in place (even if raw files remain uncommitted)
- Optional two-stage mode works (mini scan -> 5.2 adjudication)

---

## 17) Backfill mode (required)
Support backfill runs:
- set `OHMNI_RUN_DATE=YYYY-MM-DD` and run worker
- it should write a casebook entry for that date without breaking other entries

---

## 18) Notes for Cursor Agent (how to execute)
- Make incremental commits as you implement.
- Keep the code readable and simple.
- Prefer standard library utilities where possible.
- Do not introduce large frameworks.
- Ensure artifact validation + lint is enforced in workflow.

---

# End of build spec
