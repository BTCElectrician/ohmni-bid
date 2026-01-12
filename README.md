# Ohmni Bid

**AI-powered electrical estimating system** - Reverse-engineered from production Excel workbook. Calculates commercial electrical project bids with material costs, labor hours, and markups.

## Overview

This system extracts pricing logic from a password-protected Excel workbook and provides:
- **TypeScript calculation engine** - Core bid formulas
- **Flask backend integration** - REST API for estimates
- **React frontend components** - Complete UI for estimate management
- **Pricing database** - 295+ items (conduit, wire, equipment, fixtures)
- **AI integration points** - Chat and photo takeoff support

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    OHMNI BID SYSTEM                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   TypeScript │    │     Flask    │    │    React      │  │
│  │   Engine     │───▶│   Backend    │◄───│   Frontend    │  │
│  │  (Core Calc) │    │   (REST API) │    │  (Components) │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│         │                   │                   │           │
│         ▼                   ▼                   ▼           │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   Pricing    │    │   Database   │    │   AI Chat    │  │
│  │   Database   │    │   (SQL)      │    │   & Vision   │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Core Calculation Formula

```typescript
Total = ((Labor_Hours × Labor_Rate) + (Material × (1 + Tax_Rate))) × (1 + O&P_Rate)
```

**Default Parameters:**
- Labor Rate: **$118/hr** (IBEW Local 134 2025)
- Material Tax: **10.25%** (Washington state)
- Overhead & Profit: **0%** (configurable)

## Configuration & Defaults Architecture

**IMPORTANT FOR AI AGENTS & DEVELOPERS:**

This system uses a **code-first approach** for default parameters. The source of truth for defaults is in code constants, not in JSON files.

### Source of Truth for Defaults

| Parameter | Source of Truth | Location |
|-----------|----------------|----------|
| **Labor Rate** | `DEFAULT_LABOR_RATE = 118.00` | `flask_integration/services/estimation_service.py`<br>`src/estimator.ts` |
| **Material Tax Rate** | `DEFAULT_TAX_RATE = 0.1025` | `flask_integration/services/estimation_service.py`<br>`src/estimator.ts` |
| **Overhead & Profit** | `DEFAULT_OP_RATE = 0.0` | `flask_integration/services/estimation_service.py`<br>`src/estimator.ts` |

### Pricing Database JSON (`pricing_database.json`)

The `parameters` object in `pricing_database.json` is **NOT the source of truth**. It's a snapshot extracted from the Excel workbook during the extraction process. The actual defaults used by the application come from code constants.

**Why this matters:**
- When updating labor rates, update the code constants (`DEFAULT_LABOR_RATE`), not the JSON file
- The JSON file's `parameters` section is informational only (shows what was in Excel at extraction time)
- If you need to change defaults, update them in:
  1. `flask_integration/services/estimation_service.py` (Python backend)
  2. `src/estimator.ts` (TypeScript engine)
  3. `frontend_integration/store/estimateStore.ts` (React frontend defaults)

### Current Defaults (2025)

- **Labor Rate**: $118/hr (IBEW Local 134 2025 rates)
- **Material Tax**: 10.25% (Washington state)
- **Overhead & Profit**: 0% (user configurable per estimate)

## Setup

### Prerequisites

- **Python 3.11+** (with virtual environment)
- **Node.js 20+** (for TypeScript compilation)

### Installation

1. **Activate virtual environment:**
```bash
source venv/bin/activate  # or: venv/bin/python -m pip install
```

2. **Install Python dependencies:**
```bash
pip install -r requirements.txt
```

3. **Install Node.js dependencies and build:**
```bash
npm install
npm run build
```

4. **Environment setup:**
```bash
# Create .env file for Excel password
echo "EXCEL_PASSWORD=your_password_here" > .env
```

### Verify Installation

```bash
# Test sync monitor
python scripts/price_sync_monitor.py

# Check dependencies
python -c "import pandas, openpyxl, dotenv, msoffcrypto_tool; print('✓ All deps installed')"
```

## Project Structure

```
ohmni-bid/
├── src/
│   └── estimator.ts              # Core TypeScript calculation engine
├── flask_integration/            # Backend package
│   ├── models/                   # SQLAlchemy models
│   ├── services/                 # Business logic (DEFAULT_LABOR_RATE here)
│   ├── routes/                   # REST API endpoints
│   ├── prompts/                  # AI prompts (chat & vision)
│   └── data/
│       └── pricing_database.json # 295 items extracted from Excel
│                                # (parameters section is snapshot only)
├── frontend_integration/          # Frontend package
│   ├── components/estimate/      # React components
│   ├── hooks/estimate/           # React Query hooks
│   ├── store/                    # Zustand state (defaults here)
│   ├── services/                 # API client
│   └── types/                    # TypeScript interfaces
├── scripts/
│   ├── extract_pricing.py        # Extract from password-protected Excel
│   ├── price_sync_monitor.py    # Monitor Excel file changes
│   └── price_sync_email.py      # Email notifications
├── data/
│   ├── Unit price - Master 11-3-21- JG.xlsx  # Master pricing file
│   └── sync_history.json         # Sync tracking
└── ELECTRICAL_BID_LOGIC.md      # Complete reverse-engineering docs
```

## Usage

### Extract Pricing from Excel

```bash
# Requires .env with EXCEL_PASSWORD
python scripts/extract_pricing.py
```

Extracts all pricing data from the password-protected Excel file into `flask_integration/data/pricing_database.json`.

### Monitor Price Changes

```bash
# Check if Excel has been updated
python scripts/price_sync_monitor.py

# Mark as synced after extraction
python scripts/price_sync_monitor.py --mark-synced

# View sync history
python scripts/price_sync_monitor.py --history
```

### TypeScript Engine

```typescript
import { createEstimate, createLineItem, DEFAULT_PARAMETERS } from './src/estimator';

// Create line item
const item = createLineItem(
  {
    category: 'INTERIOR_LIGHTING',
    name: 'LED Highbay',
    materialUnitCost: 510,
    unitType: 'E',
    laborHoursPerUnit: 4.0
  },
  100, // quantity
  DEFAULT_PARAMETERS
);

// Create estimate
const estimate = createEstimate(
  {
    projectName: 'Warehouse Project',
    squareFootage: 50000,
    // ... other project info
  },
  [item],
  { laborRate: 118, materialTaxRate: 0.1025, overheadProfitRate: 0.15 }
);

console.log(`Final Bid: $${estimate.finalBid.toLocaleString()}`);
```

## Integration

### Flask Backend

See `flask_integration/IMPLEMENTATION_SPEC.md` for complete integration guide.

**Quick steps:**
1. Copy `flask_integration/` files to your backend
2. Register models and blueprint
3. Run migrations
4. Import pricing database

**API Endpoints:**
- `POST /api/estimates` - Create estimate
- `GET /api/estimates/{id}` - Get estimate with line items
- `POST /api/estimates/{id}/items` - Add line item
- `GET /api/estimates/pricing/search` - Search pricing database

### React Frontend

See `frontend_integration/IMPLEMENTATION_SPEC.md` for complete integration guide.

**Quick steps:**
1. Copy `frontend_integration/` files to your Next.js app
2. Install dependencies: `@tanstack/react-query zustand framer-motion`
3. Add `<EstimateStudio />` component to your routes

**Components:**
- `EstimateStudio` - Main container (3-panel layout)
- `LineItemsTable` - Category-grouped line items
- `PhotoTakeoffModal` - AI photo analysis
- `EstimateChat` - Conversational AI assistant
- `QuickAddModal` - Pricing database search

## Pricing Database

**295 items across 11 categories:**

| Category | Items | Examples |
|----------|-------|----------|
| CONDUIT | 61 | EMT, IMC, PVC, Rigid by size |
| WIRE | 32 | Copper & Aluminum THHN |
| ELECTRICAL_SERVICE | 55 | Panels, switchboards, transformers |
| INTERIOR_LIGHTING | 38 | LED fixtures, switches, controls |
| POWER_RECEPTACLES | 36 | Receptacles, floor boxes, data |
| MECHANICAL_CONNECTIONS | 15 | RTU, exhaust fans, pumps |
| EXTERIOR_LIGHTING | 14 | Wall packs, poles, bollards |
| FIRE_ALARM | 11 | Panel, devices, connections |
| SITE_CONDUITS | 9 | Underground runs |
| GENERAL_CONDITIONS | 8 | Permits, supervision, equipment |
| TEMP_POWER | 2 | Temp service, trailer hookup |

## Key Features

- ✅ **Reverse-engineered Excel logic** - Exact formula replication
- ✅ **295-item pricing database** - Extracted from production workbook
- ✅ **AI integration points** - Chat and photo takeoff ready
- ✅ **TypeScript + Python** - Type-safe calculations
- ✅ **Price sync monitoring** - Track Excel file changes
- ✅ **Complete UI components** - Production-ready React components
- ✅ **REST API** - Flask backend with full CRUD
- ✅ **Labor rate updates** - $118/hr (IBEW Local 134 2025)
- ✅ **Material price adjustments** - 20% copper wire increase from 2021

## Documentation

- **[ELECTRICAL_BID_LOGIC.md](./ELECTRICAL_BID_LOGIC.md)** - Complete reverse-engineering documentation
- **[flask_integration/IMPLEMENTATION_SPEC.md](./flask_integration/IMPLEMENTATION_SPEC.md)** - Backend integration guide
- **[frontend_integration/IMPLEMENTATION_SPEC.md](./frontend_integration/IMPLEMENTATION_SPEC.md)** - Frontend integration guide
- **[AGENT_GUIDE.md](./AGENT_GUIDE.md)** - **For AI agents: Architecture, defaults, and conventions**

## Development

```bash
# TypeScript development
npm run dev

# TypeScript build
npm run build

# Run tests (when implemented)
npm test

# Python scripts
python scripts/extract_pricing.py
python scripts/price_sync_monitor.py
```

## Notes

- **Labor Rate**: Updated to $118/hr (IBEW Local 134 2025 rates)
- **Copper Wire**: Prices increased 20% from 2021 baseline
- **Excel Password**: Required in `.env` file for `extract_pricing.py`
- **Sync Status**: Monitor tracks when Excel file changes

## License

MIT