# ohmni-investigation

**Evidence-driven watchdog for electrical workforce training funding streams**

[![Daily Scan](https://github.com/BTCElectrician/ohmni-bid/actions/workflows/daily-scan.yml/badge.svg)](https://github.com/BTCElectrician/ohmni-bid/actions/workflows/daily-scan.yml)
[![GitHub Pages](https://github.com/BTCElectrician/ohmni-bid/actions/workflows/pages.yml/badge.svg)](https://github.com/BTCElectrician/ohmni-bid/actions/workflows/pages.yml)

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

🔗 **[View the Investigation Dashboard](https://btcelectrician.github.io/ohmni-bid/ohmni-investigation/site/)**

---

## Quick Start

### Prerequisites
- Python 3.11+
- OpenAI API key
- Git

### Local Setup

1. **Clone the repository:**
```bash
git clone https://github.com/BTCElectrician/ohmni-bid.git
cd ohmni-bid/ohmni-investigation
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

## 🔧 Customization Guide

This system is designed to be extended and enhanced. Here's how to turn it into an absolute alien freak of nature investigator.

### Extensibility Points

| What To Modify | File | Impact |
|----------------|------|--------|
| Search queries | `worker/sources.yaml` | What topics to investigate |
| Watchlist entities | `worker/sources.yaml` | Which orgs to monitor |
| System behavior | `worker/prompts/system_investigator.md` | Core personality & rules |
| Daily instructions | `worker/prompts/run_daily.md` | Task execution logic |
| Signal categories | `worker/schemas/lead.schema.json` | Types of patterns to detect |
| Banned terms | `worker/lint_public_text.py` | Defamation firewall |
| Data structure | `worker/schemas/*.json` | What data gets captured |
| ID generation | `worker/utils/ids.py` | How duplicates are detected |
| Source quality | `worker/run_daily_openai.py` | Filtering logic |

---

### 1. Customize Discovery Queries

Edit `worker/sources.yaml` to change what the system searches for:

```yaml
queries:
  # Add your investigation topics
  - "electrical workforce training funding Illinois 2025"
  - "IBEW apprenticeship program grants"
  - "YOUR CUSTOM QUERY HERE"
  - "specific vendor name + contracts"
  - "specific program name + funding"
  
  # Pro tips:
  # - Be specific: "Chicago electrical training contract 2024" > "training"
  # - Include dates: helps find recent info
  # - Use entity names: "DCEO electrical workforce" 
  # - Combine terms: "vendor + contract + apprenticeship"
```

---

### 2. Customize Watchlist

Add organizations, agencies, or people to monitor:

```yaml
watchlist:
  - name: "Illinois Department of Commerce"
    url: "https://dceo.illinois.gov"
  
  - name: "Some Vendor You're Tracking"
    url: ""  # Optional - leave empty if unknown
  
  - name: "Specific Official Name"
    url: ""
```

The system will search for news/filings mentioning these entities.

---

### 3. Customize the System Prompt (Core Brain)

Edit `worker/prompts/system_investigator.md` to change the AI's personality and approach:

```markdown
## What You Can Modify:

### Investigation Focus
- Add domain-specific knowledge
- Define what "suspicious" means for your context
- Add industry-specific red flags

### Signal Detection
- Add new pattern types to look for
- Define thresholds (e.g., "concentration > 60% = flag")
- Add cross-reference requirements

### Output Style
- Adjust confidence calibration
- Change summary depth
- Add specific fields to extract

### Domain Knowledge
- Add context about how the industry works
- Define normal vs. abnormal patterns
- Include relevant regulations/thresholds
```

**Example Enhancement:**
```markdown
## Additional Red Flags for Electrical Training

- Single vendor receiving >50% of annual training contracts
- Contracts awarded within 30 days of RFP (unusually fast)
- Training programs with <70% completion rates receiving increased funding
- Vendor addresses matching official's business interests
- Pass-through entities with no training facilities
```

---

### 4. Customize the Daily Run Prompt

Edit `worker/prompts/run_daily.md` to change task execution:

```markdown
## What You Can Add:

### Enhanced Search Strategy
- Multi-hop searches (find X, then search for X's connections)
- Temporal analysis (compare this year vs. last year)
- Cross-reference requirements

### Extraction Depth
- Specific fields to always extract (dollar amounts, dates, names)
- Relationship mapping requirements
- Document type prioritization

### Analysis Instructions
- Comparative analysis (benchmark against other jurisdictions)
- Trend detection over time
- Network analysis of entity relationships
```

---

### 5. Add New Signal Categories

Edit `worker/schemas/lead.schema.json` to add detection patterns:

```json
{
  "signal_category": {
    "type": "string",
    "enum": [
      "vendor_concentration",
      "related_party_risk",
      "threshold_splitting",
      "vague_spend_inflation",
      "pass_through_pattern",
      "timeline_anomaly",
      "reporting_mismatch",
      "geographic_mismatch",      // NEW: Vendor far from service area
      "credential_gap",           // NEW: Provider lacks certifications
      "outcome_disconnect",       // NEW: High spend, poor results
      "bid_pattern_anomaly",      // NEW: Same bidders, rotating wins
      "unknown"
    ]
  }
}
```

Then update `worker/prompts/system_investigator.md` to define what each new category means.

---

### 6. Add Banned Terms (Defamation Firewall)

Edit `worker/lint_public_text.py` to expand the safety net:

```python
BANNED_TERMS = [
    r'\bfraud\b',
    r'\bkickback\b',
    r'\billegal\b',
    r'\bcorrupt\b',
    # Add more as needed:
    r'\bcriminal\b',
    r'\bconspir\w*\b',
    r'\bracketeering\b',
]
```

---

### 7. Extend Data Schemas

Add new fields to capture more information. Edit `worker/schemas/*.json`:

**Example: Add `dollar_amount` to Evidence:**
```json
{
  "dollar_amount": {
    "type": ["number", "null"],
    "description": "Dollar amount mentioned in source, if any"
  }
}
```

Then update the Pydantic models in `worker/run_daily_openai.py` to match.

---

### 8. Tune Model Behavior

Adjust via environment variables or GitHub repo variables:

```bash
# Use the most powerful model
OHMNI_OPENAI_MODEL=gpt-5.2-pro

# Maximum reasoning depth
OHMNI_OPENAI_REASONING_EFFORT=high

# More sources per run
OHMNI_MAX_SOURCES=50

# Two-stage pipeline (fast scan + deep analysis)
OHMNI_TWO_STAGE=true
```

---

### 9. Advanced: Multi-Stage Pipeline

The system supports a two-stage approach:

**Stage 1 (Fast Scan):** `gpt-5-mini` quickly reviews many sources  
**Stage 2 (Deep Analysis):** `gpt-5.2` or `gpt-5.2-pro` deeply analyzes top candidates

Enable with `OHMNI_TWO_STAGE=true`

---

### 10. Future Enhancement Ideas

Ideas for turning this into an absolute beast:

```
□ Document ingestion - Upload PDFs/docs for analysis
□ FOIA tracking - Monitor FOIA request responses  
□ Court record scraping - Track litigation involving entities
□ Entity network mapping - Visualize relationships (NetworkX)
□ Historical comparison - Trend analysis over years
□ Cross-jurisdiction - Compare IL to other states
□ Automated FOIA drafting - Generate requests based on leads
□ Slack/Discord alerts - Notify on high-confidence leads
□ Embedding search - Semantic search across evidence
□ Knowledge graph - Neo4j for entity relationships
□ Anomaly scoring - ML-based pattern detection
```

---

### Pro Tips for Prompt Engineering

When enhancing prompts with ChatGPT 5 Pro:

1. **Be specific about domain** - Include electrical trade context, union structures, funding mechanisms
2. **Define what "normal" looks like** - So the AI knows what's abnormal
3. **Add calibration examples** - "This is a 0.3 confidence signal, this is 0.8"
4. **Include red herrings** - Examples of things that LOOK suspicious but aren't
5. **Add verification steps** - "Before flagging X, check Y"
6. **Define thresholds** - Specific numbers/percentages that matter
7. **Include temporal context** - Fiscal years, election cycles, budget deadlines

---

### Testing Your Customizations

After making changes:

```bash
# Test locally
cd worker
python run_daily_openai.py

# Validate output
python validate_artifacts.py

# Check for banned terms
python lint_public_text.py

# Review casebook entry
cat ../site/casebook/$(date +%Y-%m-%d).md
```

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

- **Issues:** [GitHub Issues](https://github.com/BTCElectrician/ohmni-bid/issues)
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

