# Methodology

**Project:** ohmni-investigation  
**Version:** 1.0  
**Last Updated:** December 28, 2025

---

## Overview

This document describes the technical and analytical methodology used by ohmni-investigation to discover, extract, and synthesize information about electrical workforce training funding.

## Data Pipeline

### 1. Discovery (Source Identification)

**Tool:** OpenAI web_search via Responses API

**Inputs:**
- Predefined discovery queries (see `worker/sources.yaml`)
- Watchlist of entities to monitor
- Date range constraints

**Process:**
- Execute web searches for each query
- Execute searches for each watchlist entity
- Collect URLs, titles, snippets from results
- Deduplicate by canonical URL

**Output:**
- List of candidate source URLs

### 2. Source Selection (Quality Filtering)

**Criteria:**
- **Prefer:**
  - Official government sources (.gov domains)
  - Primary press releases from known entities
  - Reputable news organizations
  - Regulatory filings
  - Recent publications (< 6 months)
- **De-prioritize:**
  - Aggregator sites with no original content
  - Duplicate URLs
  - Thin content pages
  - Social media posts without backing documentation

**Process:**
- Score each source on credibility and relevance
- Select top N sources (default: 20) per day
- Log rejected sources for audit trail

**Output:**
- Shortlist of high-quality sources for extraction

### 3. Archival (Provenance)

**Process:**
- Attempt to download HTML or PDF from source URL
- Calculate SHA256 hash of content
- Store file as `data/raw/{hash}.{ext}`
- Record retrieval timestamp
- For PDFs, extract text with PyMuPDF

**Purpose:**
- Preserve evidence in case source is removed or modified
- Enable later verification
- Support excerpt extraction

**Note:**
- Raw archives are gitignored by default (large binary files)
- Hashes and paths stored in Evidence records

### 4. Extraction (Structured Data)

**Tool:** OpenAI Responses API with structured output (Pydantic models)

**Process:**
- Pass source list to model with system prompt
- Model extracts:
  - **Evidence:** Title, excerpt, summary, tags, confidence
  - **Entity:** Organizations, people, roles, relationships
  - **Lead:** Signals, categories, innocent explanations, next tests

**Validation:**
- Model output parsed directly into Pydantic schemas
- Type checking and constraint validation
- Rejected if schema validation fails

**Output:**
- `DailyOutput` object with Evidence[], Entity[], Lead[], casebook_markdown

### 5. ID Generation (Deterministic)

**Purpose:** Prevent duplicate records across runs

**Method:**
- **Evidence ID:** `ev_` + SHA256(canonical_url + published_date + title)[:16]
- **Entity ID:** `en_` + SHA256(normalized_name + jurisdiction)[:16]
- **Lead ID:** `ld_` + SHA256(signal_category + normalized_title + dates)[:16]

**Normalization:**
- URLs: Remove tracking params, fragments
- Names: Lowercase, remove punctuation, collapse whitespace
- Dates: ISO 8601 format (YYYY-MM-DD)

### 6. Merging (Deduplication)

**Strategy:**
- Load existing artifacts from `site/data/*.json`
- Merge new items by ID
- For Evidence: Update fields if ID exists, preserve `created_at`
- For Entity: Merge aliases and relationships
- For Lead: Append new evidence_ids, take higher confidence

**Conflict Resolution:**
- Timestamps: Always preserve `created_at`, update `updated_at`
- Arrays: Union of unique values
- Scalars: Take new value (assumes later data is better)

### 7. Validation (Schema Compliance)

**Tool:** `worker/validate_artifacts.py`

**Process:**
- Load all JSON files from `site/data/`
- Re-parse each item through Pydantic models
- Report any validation errors

**Failure Mode:**
- If validation fails, CI workflow fails
- Artifacts not committed

### 8. Linting (Language Safety)

**Tool:** `worker/lint_public_text.py`

**Process:**
- Scan all JSON fields and casebook markdown
- Search for banned terms: "fraud", "kickback", "illegal", "corrupt", etc.
- Report violations with file, field, line number

**Failure Mode:**
- If banned terms found, CI workflow fails
- Artifacts not committed

### 9. Publication (Static Site)

**Process:**
- Commit validated artifacts to `main` branch
- GitHub Pages workflow deploys `site/` folder
- Static HTML + JS loads JSON client-side

**Public Artifacts:**
- `site/data/evidence.json`
- `site/data/entities.json`
- `site/data/leads.json`
- `site/casebook/YYYY-MM-DD.md`
- `site/casebook/manifest.json`

## Signal Categories

### vendor_concentration
Single vendor wins disproportionate share of contracts in a jurisdiction or program.

**Innocent Explanation:** Vendor has unique expertise or is only qualified provider.

**Next Test:** Compare vendor's qualifications against market alternatives.

### related_party_risk
Relationship between decision-makers and vendors (employment, family, board membership).

**Innocent Explanation:** Relationship disclosed and approved through proper channels.

**Next Test:** Check conflict-of-interest disclosures and approval records.

### threshold_splitting
Contracts split into smaller amounts to avoid procurement thresholds or oversight.

**Innocent Explanation:** Legitimate phasing or separate scope.

**Next Test:** Review contract scope and timing; check for common vendor.

### vague_spend_inflation
Budget increases without clear justification or deliverable improvements.

**Innocent Explanation:** Inflation, expanded scope, or market rate changes.

**Next Test:** Compare per-unit costs over time and against benchmarks.

### pass_through_pattern
Multiple layers of subcontracting with unclear value-add at each layer.

**Innocent Explanation:** Specialization or capacity constraints.

**Next Test:** Identify actual service delivery entity and compare to prime contract.

### timeline_anomaly
Unusual speed or timing of approvals, contract awards, or spending.

**Innocent Explanation:** Emergency procurement, fiscal year-end spending.

**Next Test:** Check for documented justification or approval exceptions.

### reporting_mismatch
Discrepancies between reported figures in different documents or time periods.

**Innocent Explanation:** Different accounting periods, rounding, or corrected figures.

**Next Test:** Request clarification or correction from reporting entity.

## Lead Scoring

### Confidence Score [0, 1]

Factors:
- **Source credibility** (official > news > aggregator)
- **Evidence quantity** (more evidence = higher confidence)
- **Evidence specificity** (dollar amounts, dates, names = higher)
- **Pattern strength** (repeated occurrences = higher)
- **Alternative explanations** (fewer plausible alternatives = higher)

Interpretation:
- **0.0 - 0.3:** Weak signal, needs more data
- **0.3 - 0.6:** Moderate signal, worth monitoring
- **0.6 - 0.8:** Strong signal, warrants review
- **0.8 - 1.0:** Very strong signal, escalate for formal review

### Status Assignment

- **needs_data:** Confidence < 0.3 or missing key information
- **under_review:** Confidence 0.3 - 0.6, monitoring for updates
- **escalate_for_review:** Confidence > 0.6, recommend formal review
- **resolved:** Innocent explanation confirmed with evidence
- **closed:** No longer relevant or overtaken by events

## Model Configuration

### Primary Model (Default)
- Model: `gpt-5.2`
- Reasoning effort: `high`
- Tools: `web_search`
- Response format: Structured (Pydantic)

### Two-Stage Mode (Optional)

**Stage 1: Scan**
- Model: `gpt-5-mini`
- Reasoning effort: `low`
- Purpose: Quick triage, identify top candidates

**Stage 2: Adjudicate**
- Model: `gpt-5.2` or `gpt-5.2-pro`
- Reasoning effort: `high`
- Purpose: Deep analysis, generate final output

Enable via: `OHMNI_TWO_STAGE=true`

## Limitations

### What We Can Detect
- Public patterns in contracts and spending
- Disclosed relationships between entities
- Timing and magnitude anomalies
- Inconsistencies in public reporting

### What We Cannot Detect
- Intent or motive
- Undisclosed relationships
- Private communications
- Properly concealed misconduct
- Context known only to insiders

### Known Sources of Error
- Incomplete web search results
- Model hallucination (mitigated by schema validation)
- Changes to source content after archival
- Misinterpretation of benign patterns

## Quality Assurance

### Automated
1. Schema validation (Pydantic models)
2. Text linting (banned terms)
3. ID collision detection
4. Timestamp consistency checks

### Manual
1. Periodic review of high-confidence leads
2. Spot-checking of evidence excerpts against sources
3. Community feedback via GitHub issues

## Version History

- **v1.0** (2025-12-28): Initial methodology document

---

*For technical implementation details, see the build spec and code comments.*

