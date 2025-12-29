# ohmni-investigation

**Evidence-driven watchdog for electrical workforce training funding streams**

[![Daily Scan](https://github.com/[owner]/ohmni-investigation/actions/workflows/daily-scan.yml/badge.svg)](https://github.com/[owner]/ohmni-investigation/actions/workflows/daily-scan.yml)
[![GitHub Pages](https://github.com/[owner]/ohmni-investigation/actions/workflows/pages.yml/badge.svg)](https://github.com/[owner]/ohmni-investigation/actions/workflows/pages.yml)

---

## What Is This?

An automated system that:
1. **Discovers** new sources (official docs, reputable news, filings) relevant to electrical workforce training funding
2. **Extracts** key facts into structured JSON (Evidence, Entities, Leads)
3. **Publishes** findings to a static website
4. **Commits** artifacts back to the repo automatically
5. **Deploys** updates to GitHub Pages

**Key Principle:** Signals + evidence + next tests. Never accusations.

---

## Live Site

🔗 **[View the Investigation Dashboard](https://[owner].github.io/ohmni-investigation/)**

---

## Quick Start

### Prerequisites
- Python 3.11+
- OpenAI API key
- Git

### Local Setup

1. **Clone the repository:**
```bash
git clone https://github.com/[owner]/ohmni-investigation.git
cd ohmni-investigation
```

2. **Install dependencies:**
```bash
cd worker
pip install -r requirements-openai.txt
```

3. **Configure environment:**
```bash
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY
```

4. **Run a daily scan:**
```bash
python worker/run_daily_openai.py
```

5. **Validate artifacts:**
```bash
python worker/validate_artifacts.py
python worker/lint_public_text.py
```

6. **View locally:**
Open `site/index.html` in your browser, or use a local server:
```bash
cd site
python -m http.server 8000
# Open http://localhost:8000
```

---

## Project Structure

```
ohmni-investigation/
├── docs/                           # Documentation
│   ├── CHARTER.md                 # Project charter and principles
│   ├── METHODOLOGY.md             # Technical methodology
│   └── SAFETY_AND_NON_ACCUSATION.md  # Defamation firewall
├── worker/                        # Data collection and processing
│   ├── prompts/                   # LLM prompts
│   │   ├── system_investigator.md
│   │   └── run_daily.md
│   ├── schemas/                   # JSON schemas
│   │   ├── evidence.schema.json
│   │   ├── entity.schema.json
│   │   └── lead.schema.json
│   ├── utils/                     # Utility modules
│   │   ├── ids.py                # Deterministic ID generation
│   │   ├── dedupe.py             # Deduplication and merging
│   │   ├── archive.py            # Source archival
│   │   └── normalize.py          # URL/name/date normalization
│   ├── sources.yaml              # Discovery queries and watchlist
│   ├── run_daily_openai.py       # Main worker script
│   ├── validate_artifacts.py     # Schema validation
│   ├── lint_public_text.py       # Language safety check
│   └── requirements-openai.txt   # Python dependencies
├── data/                          # Data storage
│   ├── raw/                      # Archived sources (gitignored)
│   └── runs/                     # Run logs
├── site/                          # Static website
│   ├── index.html                # Main page
│   ├── app.js                    # Frontend logic
│   ├── data/                     # Published artifacts
│   │   ├── evidence.json
│   │   ├── entities.json
│   │   └── leads.json
│   └── casebook/                 # Daily narratives
│       ├── manifest.json
│       └── YYYY-MM-DD.md
├── .github/workflows/             # CI/CD
│   ├── daily-scan.yml            # Daily automated run
│   └── pages.yml                 # GitHub Pages deployment
└── README.md                      # This file
```

---

## How It Works

### 1. Discovery
Uses OpenAI's `web_search` tool to find relevant sources based on queries in `worker/sources.yaml`.

### 2. Extraction
Uses OpenAI Responses API with structured output (Pydantic models) to extract:
- **Evidence:** Source documents with provenance and excerpts
- **Entities:** Organizations, agencies, vendors, people
- **Leads:** Ranked signals with evidence backing

### 3. Validation
Every output is validated against strict JSON schemas and linted for prohibited accusatory language.

### 4. Merging
New data is merged with existing artifacts using deterministic IDs to prevent duplicates.

### 5. Publication
Artifacts are committed to the repo and deployed to GitHub Pages as a static site.

---

## Key Features

### Defamation Firewall
- **No accusations:** Only signals and patterns
- **Innocent explanations:** Every lead includes plausible benign reasons
- **Next tests:** Every lead includes actionable verification steps
- **Banned language:** Automated linting blocks "fraud", "kickback", "corrupt", etc.

### Deterministic IDs
Prevents duplicate records across runs:
- `evidence_id`: SHA256(url + date + title)[:16]
- `entity_id`: SHA256(normalized_name + jurisdiction)[:16]
- `lead_id`: SHA256(category + title + dates)[:16]

### Transparency
- All sources cited with URLs
- All methods documented
- All code open source
- All data versioned in Git

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENAI_API_KEY` | (required) | OpenAI API key |
| `OHMNI_OPENAI_MODEL` | `gpt-5.2` | Model to use |
| `OHMNI_OPENAI_REASONING_EFFORT` | `high` | Reasoning effort level |
| `OHMNI_MAX_SOURCES` | `20` | Max sources per day |
| `OHMNI_TWO_STAGE` | `false` | Enable two-stage pipeline |
| `OHMNI_RUN_DATE` | (today) | Override run date for backfill |

### Queries and Watchlist

Edit `worker/sources.yaml` to customize:
- **queries:** Discovery search queries
- **watchlist:** Entities to monitor (names + optional URLs)

---

## Data Schemas

### Evidence
```json
{
  "evidence_id": "ev_a1b2c3d4e5f6g7h8",
  "source_url": "https://example.gov/announcement",
  "title": "...",
  "excerpt": "...",
  "summary": "...",
  "relevance_tags": ["funding", "contract"],
  "confidence": 0.85,
  "retrieved_at": "2025-12-28T12:00:00Z",
  "published_date": "2025-12-20",
  "created_at": "...",
  "updated_at": "..."
}
```

### Entity
```json
{
  "entity_id": "en_x1y2z3a4b5c6d7e8",
  "primary_name": "...",
  "aliases": [],
  "entity_type": "organization",
  "jurisdiction": "Illinois",
  "roles": ["training_provider"],
  "relationships": [],
  "confidence": 0.90,
  "created_at": "...",
  "updated_at": "..."
}
```

### Lead
```json
{
  "lead_id": "ld_m1n2o3p4q5r6s7t8",
  "title": "...",
  "signal_category": "vendor_concentration",
  "summary": "...",
  "evidence_ids": ["ev_..."],
  "entity_ids": ["en_..."],
  "innocent_explanations": ["..."],
  "next_tests": ["..."],
  "confidence": 0.72,
  "status": "escalate_for_review",
  "created_at": "...",
  "updated_at": "..."
}
```

---

## Automated Workflows

### Daily Scan (`daily-scan.yml`)
- **Schedule:** Daily at 6 AM UTC
- **Trigger:** Manual dispatch also available
- **Steps:**
  1. Install dependencies
  2. Run worker
  3. Validate artifacts
  4. Lint text
  5. Commit artifacts

**Required Secret:** `OPENAI_API_KEY`

### GitHub Pages (`pages.yml`)
- **Trigger:** Push to `main` with changes in `site/**`
- **Steps:**
  1. Configure Pages
  2. Upload site folder
  3. Deploy

---

## Development

### Run Validation
```bash
cd worker
python validate_artifacts.py
```

### Run Linting
```bash
cd worker
python lint_public_text.py
```

### Backfill a Specific Date
```bash
export OHMNI_RUN_DATE=2025-12-15
python worker/run_daily_openai.py
```

### Test Two-Stage Mode
```bash
export OHMNI_TWO_STAGE=true
python worker/run_daily_openai.py
```

---

## Documentation

- **[Charter](docs/CHARTER.md):** Mission, scope, principles
- **[Methodology](docs/METHODOLOGY.md):** Technical approach and signal categories
- **[Safety Guidelines](docs/SAFETY_AND_NON_ACCUSATION.md):** Defamation firewall and prohibited language

---

## Contributing

### Reporting Issues
- Inaccuracies in data: Open a GitHub issue with evidence
- Suggested queries: Submit a PR updating `worker/sources.yaml`
- Code improvements: Submit a PR with tests

### Principles for Contributors
1. **Evidence first:** Every claim needs a source
2. **No accusations:** Use signal language only
3. **Innocent explanations:** Consider benign reasons
4. **Testable hypotheses:** Propose falsifiable next steps
5. **Transparency:** Document your reasoning

---

## Limitations

### What This Project Is NOT
- A law enforcement tool
- A replacement for regulatory oversight
- A determination of guilt or wrongdoing
- Legal advice

### Known Blind Spots
- Non-public information
- Internal organizational context
- Undisclosed relationships
- Information not published online

---

## License

[To be determined]

---

## Contact

- **Issues:** [GitHub Issues](https://github.com/[owner]/ohmni-investigation/issues)
- **Email:** [To be determined]

---

## Acknowledgments

Built with:
- [OpenAI Responses API](https://platform.openai.com/docs/)
- [Pydantic](https://docs.pydantic.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [GitHub Actions](https://github.com/features/actions)

---

**Remember:** This is a watchdog tool, not an accusation machine. Signals are starting points for review, not endpoints for judgment.

