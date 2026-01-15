# Ohmni Estimate - Implementation Specification

## Overview

This folder contains everything needed to add electrical estimating to the Ohmni Flask backend. Copy this folder to your backend repo and follow these instructions.

---

## Quick Start (5 Steps)

### Step 1: Copy Files

```bash
# From your ohmni-backend repo root:
cp -r /path/to/flask_integration/models/estimate_models.py backend/models/
cp -r /path/to/flask_integration/services/estimation_service.py backend/services/
cp -r /path/to/flask_integration/routes/estimation_routes.py backend/routes/
cp -r /path/to/flask_integration/prompts/* backend/prompts/
cp -r /path/to/flask_integration/data/pricing_database.json backend/data/
```

### Step 2: Register Models

Add to `backend/models/__init__.py`:
```python
from .estimate_models import Estimate, EstimateLineItem, PricingItem, Proposal
```

### Step 3: Register Blueprint

Add to `app_minimal.py` (after other blueprint imports):
```python
from backend.routes.estimation_routes import estimation_bp
app.register_blueprint(estimation_bp, url_prefix='/api/estimates')
```

### Step 4: Run Migration

```bash
flask db migrate -m "Add estimation models"
flask db upgrade
```

### Step 5: Import Pricing Database

```bash
flask shell
>>> from backend.services.estimation_service import import_pricing_database
>>> import_pricing_database('backend/data/pricing_database.json')
```

---

## File Structure

```
flask_integration/
├── IMPLEMENTATION_SPEC.md      # This file
├── models/
│   └── estimate_models.py      # SQLAlchemy models (4 tables)
├── services/
│   └── estimation_service.py   # Business logic + calculations
├── routes/
│   └── estimation_routes.py    # REST API endpoints
├── prompts/
│   ├── estimation_chat.md      # Chat-based estimating prompt
│   └── estimation_vision.md    # Photo takeoff analysis prompt
└── data/
    └── pricing_database.json   # 295 items (conduit, wire, equipment)
```

---

## Database Schema

### Tables Created

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `pricing_items` | Master pricing database | category, name, material_cost, labor_hours |
| `estimates` | User estimates/bids | project_name, totals, status |
| `estimate_line_items` | Individual line items | description, quantity, extensions |
| `proposals` | Generated proposal docs | content, pdf_url |

### Relationships

```
User (existing)
  └── Estimates (1:many)
        └── EstimateLineItems (1:many)
        └── Proposals (1:many)

ChatSession (existing)
  └── Estimate (optional 1:1 link for chat-based estimates)

PricingItem (standalone lookup table)
  └── EstimateLineItems (optional reference)
```

---

## API Endpoints

### Estimates CRUD

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/estimates` | Create new estimate |
| GET | `/api/estimates` | List user's estimates |
| GET | `/api/estimates/{id}` | Get estimate with line items |
| PATCH | `/api/estimates/{id}` | Update estimate |
| DELETE | `/api/estimates/{id}` | Delete estimate |

### Line Items

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/estimates/{id}/items` | Add line item |
| POST | `/api/estimates/{id}/items/bulk` | Add multiple items |
| PATCH | `/api/estimates/{id}/items/{item_id}` | Update item |
| DELETE | `/api/estimates/{id}/items/{item_id}` | Delete item |

### Pricing Database

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/estimates/pricing/search?q=...` | Search pricing items |
| GET | `/api/estimates/pricing/categories` | List all categories |
| GET | `/api/estimates/pricing/category/{name}` | Get items in category |

### Utilities

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/estimates/quick-quote` | Quick quote without saving |
| POST | `/api/estimates/calculate-feeder` | Calculate feeder pricing |
| POST | `/api/estimates/{id}/outcome` | Record win/loss |

---

## Integration with Existing Systems

### Chat Integration

Add `session_type='estimation'` support to your chat system:

```python
# In chat_routes.py or chat_service.py

# When creating a chat session:
if session_type == 'estimation':
    # Load estimation prompt
    system_prompt = load_prompt('estimation_chat.md')

    # Create linked estimate
    from backend.services.estimation_service import EstimationService
    service = EstimationService(user_id)
    estimate = service.create_estimate(
        project_name=f"Estimate from Chat {session_id}",
        chat_session_id=session_id
    )

    # Store estimate_id in session metadata
    session.session_metadata = {'estimate_id': estimate.id}
```

### Vision Integration

Extend `VisionService.analyze_image_for_chat()`:

```python
# In vision_service.py

def analyze_image_for_takeoff(self, file_path: str, user_content: str = None) -> dict:
    """Analyze image for electrical takeoff."""
    vision_prompt = load_prompt('estimation_vision.md')

    result = self.llm_provider.analyze_image(
        image_path=file_path,
        prompt=f"{vision_prompt}\n\nUser context: {user_content or 'General takeoff'}"
    )

    # Parse structured response (JSON expected)
    try:
        return json.loads(result)
    except:
        return {'raw_analysis': result, 'extracted_items': []}
```

### Tool Calling for AI

If using function calling / tools, define these:

```python
ESTIMATION_TOOLS = [
    {
        "name": "create_estimate",
        "description": "Create a new estimate for the user",
        "parameters": {
            "project_name": "string",
            "project_type": "string (warehouse/office/retail/industrial)",
            "square_footage": "integer"
        }
    },
    {
        "name": "add_line_items",
        "description": "Add items to the current estimate",
        "parameters": {
            "estimate_id": "string",
            "items": "array of {category, description, quantity, material_unit_cost, labor_hours_per_unit}"
        }
    },
    {
        "name": "search_pricing",
        "description": "Search the pricing database for items",
        "parameters": {
            "query": "string",
            "category": "string (optional)"
        }
    },
    {
        "name": "calculate_feeder",
        "description": "Calculate feeder wire/conduit pricing",
        "parameters": {
            "wire_material": "CU or AL",
            "wire_size": "string (#12, #4/0, 500 MCM, etc)",
            "conduit_type": "string (EMT_SS, PVC, etc)",
            "conduit_size": "string (1/2, 3/4, 4, etc)",
            "length_feet": "number"
        }
    },
    {
        "name": "get_estimate_summary",
        "description": "Get current estimate totals",
        "parameters": {
            "estimate_id": "string"
        }
    }
]
```

---

## Core Calculation Formula

The pricing engine implements this formula (from the original Excel):

```python
# Line Item Total
total_cost = ((labor_hours * labor_rate) + (material_cost * (1 + tax_rate))) * (1 + overhead_profit_rate)

# Defaults (Source of Truth):
# labor_rate = $118/hr (DEFAULT_LABOR_RATE in estimation_service.py)
# tax_rate = 10.25% (DEFAULT_TAX_RATE in estimation_service.py)
# overhead_profit_rate = 0% (DEFAULT_OP_RATE in estimation_service.py, user configurable)
```

### Default Parameters Architecture

**IMPORTANT:** Default parameters are defined in code constants, not in JSON files.

**Source of Truth Locations:**
- `flask_integration/services/estimation_service.py`:
  - `DEFAULT_LABOR_RATE = 118.00`
  - `DEFAULT_TAX_RATE = 0.1025`
  - `DEFAULT_OP_RATE = 0.0`

**Note on `pricing_database.json`:**
The `parameters` section in `pricing_database.json` is a **snapshot** extracted from the Excel workbook. It is **NOT used** as the source of truth for application defaults. When updating labor rates or other defaults, update the code constants above, not the JSON file.

**Current Defaults (2025):**
- Labor Rate: $118/hr (IBEW Local 134 2025)
- Material Tax: 10.25% (Washington state)
- Overhead & Profit: 0% (configurable per estimate)

### Unit Types

| Code | Meaning | Calculation |
|------|---------|-------------|
| E | Each | qty × unit_cost |
| C | Per 100 ft | (qty × unit_cost) / 100 |
| M | Per 1000 ft | (qty × unit_cost) / 1000 |
| Lot | Lump Sum | qty × unit_cost |

---

## Pricing Database Contents

### Categories

| Category | Item Count | Examples |
|----------|------------|----------|
| CONDUIT | 61 | EMT, IMC, PVC, Rigid by size |
| WIRE | 32 | Copper & Aluminum THHN by size |
| TEMP_POWER | 2 | Temp service, trailer hookup |
| ELECTRICAL_SERVICE | 55 | Panels, switchboards, transformers |
| MECHANICAL_CONNECTIONS | 15 | RTU, exhaust fans, pumps |
| INTERIOR_LIGHTING | 38 | LED fixtures, switches, controls |
| EXTERIOR_LIGHTING | 14 | Wall packs, poles, bollards |
| POWER_RECEPTACLES | 36 | Receptacles, floor boxes, data |
| SITE_CONDUITS | 9 | Underground runs |
| SECURITY | 2 | Card access, cameras |
| FIRE_ALARM | 11 | Panel, devices, connections |
| GENERAL_CONDITIONS | 8 | Permits, supervision, equipment |

### Sample Data

```json
{
  "category": "INTERIOR_LIGHTING",
  "name": "2x4 LED Panel",
  "material_cost": 50.00,
  "labor_hours": 1.50,
  "unit_type": "E"
}
```

---

## Testing

### Manual API Test

```bash
# Create estimate
curl -X POST http://localhost:5000/api/estimates \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"project_name": "Test Warehouse", "square_footage": 50000}'

# Add items
curl -X POST http://localhost:5000/api/estimates/{id}/items \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"category": "INTERIOR_LIGHTING", "description": "LED Highbay", "quantity": 100, "material_unit_cost": 510, "labor_hours_per_unit": 4}'

# Quick quote
curl -X POST http://localhost:5000/api/estimates/quick-quote \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"items": [{"name": "Duplex Receptacle", "quantity": 25}]}'
```

---

## UI Integration Notes

### Suggested Frontend Routes

| Route | Purpose |
|-------|---------|
| `/estimates` | List all estimates |
| `/estimates/new` | Create estimate wizard |
| `/estimates/{id}` | Edit estimate with line items |
| `/estimates/{id}/proposal` | View/generate proposal |

### Real-time Updates

When adding line items via chat, emit updates:

```javascript
// After AI adds items via tool call
socket.emit('estimate_updated', {
  estimate_id: '...',
  new_items: [...],
  totals: {
    material: 50000,
    labor_hours: 520,
    final_bid: 125000
  }
});
```

---

## Future Enhancements

1. **Price History** - Track material price changes over time
2. **Regional Rates** - Support different labor rates by region
3. **Templates** - Save estimate templates for common project types
4. **Comparison** - Compare estimates to historical data
5. **PDF Export** - Generate professional proposal PDFs
6. **Supplier Integration** - Real-time pricing from distributors

---

## Support

This integration was reverse-engineered from a production electrical estimating spreadsheet. The pricing data and labor rates reflect real-world commercial electrical work.

For questions about the electrical logic, refer to:
- `ELECTRICAL_BID_LOGIC.md` - Full documentation of calculation methodology
- NEC 2023 for code-based sizing questions
