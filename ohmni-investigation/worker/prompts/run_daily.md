# Daily Run Prompt

## Task
Conduct a daily scan for new information related to electrical workforce training funding, focusing on Illinois and Chicago.

## Today's Date
{run_date}

## Discovery Queries
{queries}

## Watchlist Entities
{watchlist}

## Instructions

### Step 1: Discovery
Use the `web_search` tool to find recent information using the provided queries and watchlist entity names. Focus on:
- Official government announcements
- Press releases from agencies and training programs
- Procurement notices and contract awards
- News reports from reputable sources
- Regulatory filings

### Step 2: Source Selection
From search results, select up to {max_sources} most relevant sources. Prioritize:
- Official sources (.gov, .org from known entities)
- Recent publications (last 6 months preferred)
- Primary sources over aggregators
- Sources with concrete details (dollar amounts, dates, names)

### Step 3: Extract Evidence
For each selected source:
- Create an Evidence record with:
  - Canonical URL (cleaned)
  - Title and excerpt (key facts)
  - Summary (1-2 sentences)
  - Relevance tags
  - Confidence score
  - Retrieved timestamp
  - Published date (if available)

### Step 4: Identify Entities
Extract and create Entity records for:
- Government agencies
- Training providers
- Vendors and contractors
- Unions
- Key officials (if publicly named in official capacity)

For each entity:
- Assign entity_type
- List roles
- Track relationships to other entities
- Provide confidence score

### Step 5: Detect Signals
Analyze evidence for patterns worthy of review:
- Vendor concentration
- Related party risks
- Threshold splitting
- Vague spend inflation
- Pass-through patterns
- Timeline anomalies
- Reporting mismatches

For each signal, create a Lead with:
- Clear title
- Signal category
- Summary
- Evidence IDs (references to Evidence records)
- Entity IDs (if applicable)
- **At least one innocent explanation** (best benign reason)
- **At least one next test** (actionable step to verify or falsify)
- Confidence score [0, 1]
- Status (needs_data, under_review, escalate_for_review)

### Step 6: Write Casebook Entry
Create a markdown narrative for today including:
- Summary of sources reviewed
- Key findings
- New leads identified
- Updates to existing leads (if applicable)
- Next steps

Use neutral, evidence-based language. No accusations.

## Constraints
- Max sources: {max_sources}
- Max leads per day: 10
- Every lead MUST have innocent_explanations and next_tests
- Use only information from web_search results and prior context
- Do not fabricate URLs or quotes

## Output Format
Return a structured object with:
- `run_date`: str (ISO date)
- `evidence`: List[Evidence]
- `entities`: List[Entity]
- `leads`: List[Lead]
- `casebook_markdown`: str

Follow the Pydantic schemas exactly.

