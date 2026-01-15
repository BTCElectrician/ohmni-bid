# Ohmni Bid - Electrical Estimating System: Complete Reverse Engineering

## Executive Summary

This Excel workbook is a **commercial electrical estimating system** used by ABCO Electrical Construction and Design. It calculates electrical project bids by:

1. Taking line item quantities from a takeoff
2. Looking up material costs and labor hours from pricing databases
3. Applying markups for tax, overhead, and profit
4. Generating a professional proposal document

---

## Workbook Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        OHMNI BID SYSTEM                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐       │
│  │   FEEDERS   │────▶│   BASEBID   │────▶│  PROPOSAL   │       │
│  │  (Lookup    │     │  (Main Est  │     │  (Output    │       │
│  │   Tables)   │     │   Sheet)    │     │   Doc)      │       │
│  └─────────────┘     └─────────────┘     └─────────────┘       │
│         │                   │                                   │
│         ▼                   ▼                                   │
│  ┌─────────────┐     ┌─────────────┐                           │
│  │    Copy     │     │    Site     │                           │
│  │  (Template) │     │   (Site     │                           │
│  │             │     │   Work)     │                           │
│  └─────────────┘     └─────────────┘                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 1. FEEDERS Sheet - Pricing Database

### Purpose
Centralized lookup tables for conduit, wire, and cable pricing with both material costs and labor rates.

### Structure

#### A. Conduit Pricing (Rows 10-67)
Each conduit type has a "unit" price that includes conduit + fittings per 100 feet.

| Type | Rows | Sizes | Description |
|------|------|-------|-------------|
| EMT Set Screw | 10-19 | 1/2" to 4" | Standard EMT with set screw fittings |
| EMT Compression | 22-31 | 1/2" to 4" | EMT with compression fittings |
| Heavy Wall (HW) | 34-43 | 1/2" to 4" | Rigid steel conduit |
| IMC | 46-55 | 1/2" to 4" | Intermediate metal conduit |
| PVC | 58-68 | 1/2" to 5" | Schedule 40 PVC |
| PVC/GRC Assembly | 71-80 | 1/2" to 4" | Underground PVC to GRC transition |

#### B. Wire Pricing (Rows 82-120)

**Copper THHN Wire (Rows 83-101)**
```
Formula: Material Cost = Market Price × (1 + Markup%)
- #12 to #8: 15% markup
- #6 to #4: 10% markup
- #3 to #600 MCM: 5% markup
- #750 MCM: 10% markup
```

| Wire Size | Market Price (per 1000ft) | Markup | Final Price | Labor Rate |
|-----------|---------------------------|--------|-------------|------------|
| #12 | $189 | 15% | $217.35 | 5.5 hrs |
| #10 | $288 | 15% | $331.20 | 6.0 hrs |
| #8 | $540 | 10% | $594.00 | 6.25 hrs |
| #6 | $830 | 10% | $913.00 | 7.0 hrs |
| #4 | $1,270 | 10% | $1,397.00 | 8.5 hrs |
| #3 | $1,602 | 5% | $1,682.10 | 9.0 hrs |
| #2 | $2,005 | 5% | $2,105.25 | 10.0 hrs |
| #1 | $2,242 | 5% | $2,354.10 | 11.0 hrs |
| #1/0 | $2,745 | 5% | $2,882.25 | 13.0 hrs |
| #2/0 | $3,381 | 5% | $3,550.05 | 15.0 hrs |
| #3/0 | $4,267 | 5% | $4,480.35 | 17.0 hrs |
| #4/0 | $5,326 | 5% | $5,592.30 | 19.0 hrs |
| #250 MCM | $6,172 | 5% | $6,480.60 | 22.0 hrs |
| #300 MCM | $7,401 | 5% | $7,771.05 | 25.5 hrs |
| #350 MCM | $8,666 | 5% | $9,099.30 | 27.0 hrs |
| #400 MCM | $9,858 | 5% | $10,350.90 | 29.0 hrs |
| #500 MCM | $12,191 | 5% | $12,800.55 | 33.0 hrs |
| #600 MCM | $15,192 | 5% | $15,951.60 | 37.0 hrs |
| #750 MCM | $26,237 | 10% | $28,860.70 | 42.0 hrs |

**Aluminum THHN Wire (Rows 108-120)**
Similar structure with lower base prices for aluminum conductor.

#### C. Conduit Unit Pricing Formulas

```excel
# Material cost formula (per 100ft unit):
D{row} = O{raw_price_row} × B{markup} + O{raw_price_row}

# Where:
# - O column contains raw conduit prices
# - B column contains markup percentage (typically 0.15-0.50)

# Labor hours formula (per 100ft):
G{row} = fixed labor rate based on conduit size
```

---

## 2. BASEBID Sheet - Main Estimate

### Structure Overview

| Column | Header | Purpose |
|--------|--------|---------|
| A | MATERIAL | Item description |
| B | (Section Total) | SUM of section J column values |
| C | QTY | Quantity from takeoff |
| D | MAT UNIT | Material unit cost |
| E | per | Unit type (E=each, C=per 100ft, M=per 1000ft, Lot) |
| F | EXTENSION | Material extension (D × C) |
| G | LBR UNIT | Labor hours per unit |
| H | per | Unit type |
| I | EXTENSION | Labor hours extension (G × C) |
| J | TOTAL | Fully burdened cost per line item |
| K | $$/QTY | Cost per quantity (for reference) |

### Work Categories

```
Row 11-14:   TEMP POWER
Row 15-158:  ELECTRICAL SERVICE & DISTRIBUTION
Row 159-190: MECHANICAL CONNECTIONS
Row 191-231: INTERIOR LIGHTING
Row 232-247: EXTERIOR LIGHTING
Row 248-285: GENERAL POWER & RECEPTACLES
Row 286-295: SITE CONDUITS
Row 295-297: SECURITY
Row 299-311: FIRE ALARM SYSTEM
Row 312-320: GENERAL CONDITIONS
```

### Core Pricing Formula

**Line Item Total (Column J):**
```excel
=+(((I{row}*$I$323)+(F{row}*(1+$E$323)))*(1+$C$329))
```

**Breakdown:**
```
Total Cost = ((Labor_Hours × Labor_Rate) + (Material_Cost × (1 + Tax_Rate))) × (1 + OH&P_Rate)

Where:
- I{row} = Labor hours extension (hours)
- $I$323 = Labor rate per hour ($118/hr)
- F{row} = Material cost extension ($)
- $E$323 = Material tax/markup rate (10.25%)
- $C$329 = Overhead & Profit rate (configurable, default 0%)
```

### Key Parameters (Row 323-331)

| Cell | Parameter | Default Value |
|------|-----------|---------------|
| E323 | Material Tax/Markup | 10.25% |
| I323 | Labor Rate ($/hr) | $118.00 |
| C329 | Overhead & Profit | 0% (configurable) |
| F326 | Project Square Footage | 828,520 sf |
| D331 | **FINAL BID TOTAL** | =ROUNDUP(SUM(D328:D330),0) |

**IMPORTANT FOR AI AGENTS & DEVELOPERS:**

The system uses a **code-first architecture** for default parameters. The source of truth is in code constants, not in JSON files or Excel snapshots.

**Source of Truth Locations:**
- **Python Backend**: `flask_integration/services/estimation_service.py`
  - `DEFAULT_LABOR_RATE = 118.00`
  - `DEFAULT_TAX_RATE = 0.1025`
  - `DEFAULT_OP_RATE = 0.0`
- **TypeScript Engine**: `src/estimator.ts`
  - `DEFAULT_PARAMETERS.laborRate = 118.00`
  - `DEFAULT_PARAMETERS.materialTaxRate = 0.1025`
  - `DEFAULT_PARAMETERS.overheadProfitRate = 0`
- **React Frontend**: `frontend_integration/store/estimateStore.ts`
  - `const laborRate = estimate?.labor_rate ?? 118`

**Note on `pricing_database.json`:**
The `parameters` section in `pricing_database.json` is a **snapshot** extracted from the Excel workbook during extraction. It is **NOT used** as the source of truth. When updating defaults, always update the code constants above, not the JSON file.

### Feeder Wire/Conduit Lookups

For electrical distribution feeders, the unit prices are calculated by combining wire and conduit costs:

```excel
# Example: 4" EMT with #600 MCM copper (4 conductors)
D{row} = ((FEEDERS!$D$100 × 4) / 10 + FEEDERS!$D$19) × multiplier

Where:
- FEEDERS!$D$100 = #600 MCM copper wire price
- FEEDERS!$D$19 = 4" EMT conduit unit price
- × 4 = 4 conductors per feeder
- / 10 = convert per 1000ft to per 100ft
- multiplier = varies by ampacity (6-11× for larger services)
```

---

## 3. Line Item Catalog

### Electrical Service & Distribution

| Item | Material Cost | Labor Hours |
|------|--------------|-------------|
| 4000A Switchboard | $35,000 | 124 hrs |
| 3000A Switchboard | $30,000 | 104 hrs |
| 2500A Switchboard | $25,000 | 82 hrs |
| 2000A Switchboard | $23,000 | 66 hrs |
| 1600A Switchboard | $20,000 | 55 hrs |
| 1200A Distribution | $17,000 | 51 hrs |
| 1000A Distribution | $15,000 | 41 hrs |
| 800A Distribution | $9,000 | 33 hrs |
| 600A Distribution | $8,000 | 28 hrs |
| 400A Panelboard | $3,000 | 14 hrs |
| 250A Panelboard | $2,300 | 12 hrs |
| 225A Panelboard | $2,300 | 12 hrs |
| 200A Panelboard | $2,300 | 12 hrs |
| 100A Panelboard | $2,000 | 10 hrs |

### Transformers

| Item | Material Cost | Labor Hours |
|------|--------------|-------------|
| 300 KVA | $8,000 | 24 hrs |
| 225 KVA | $6,500 | 24 hrs |
| 150 KVA | $5,000 | 15 hrs |
| 112.5 KVA | $4,000 | 13 hrs |
| 75 KVA | $3,500 | 13 hrs |
| 45 KVA | $2,500 | 12 hrs |
| 30 KVA | $2,000 | 10 hrs |
| 15 KVA | $1,500 | 5 hrs |

### Lighting Fixtures

| Item | Material Cost | Labor Hours |
|------|--------------|-------------|
| LED Highbay | $510 | 4.0 hrs |
| LED Highbay w/ Sensor | $575 | 4.0 hrs |
| 2x4 LED Panel | $50-100 | 1.5-2.25 hrs |
| 2x2 LED Panel | $50 | 1.5 hrs |
| 6" LED Downlight | $50 | 2.0 hrs |
| 4' LED Strip | $50-100 | 1.5-3.0 hrs |
| Exit/Emergency Combo | $185 | 3.0 hrs |
| Exit Light | $75-150 | 3.0 hrs |
| Wall Pack LED | $200-250 | 4-6 hrs |

### Receptacles & Devices

| Item | Material Cost | Labor Hours |
|------|--------------|-------------|
| Duplex Receptacle | $60 | 1.3 hrs |
| Dedicated Duplex | $75 | 2.0 hrs |
| Double Duplex | $70 | 1.5 hrs |
| GFI Receptacle | $75 | 1.5 hrs |
| Floor Duplex | $300 | 2.5 hrs |
| Single Pole Switch | $25 | 1.0 hrs |
| Three-Way Switch | $25 | 1.5 hrs |
| Motion Sensor (Wall) | $65 | 1.25 hrs |
| Motion Sensor (Ceiling) | $140 | 1.5 hrs |
| Dimmer | $85 | 2.0 hrs |

### Mechanical Connections

| Item | Material Cost | Labor Hours |
|------|--------------|-------------|
| Make Up Air Unit (gas) | $2,000 | 15 hrs |
| Roof Top Unit (gas) | $1,200 | 20 hrs |
| Electric Water Heater | $200 | 2.75 hrs |
| 200A Fire Pump | $8,000 | 45 hrs |
| Hydraulic Elevator | $1,500 | 15 hrs |
| Exhaust Fan w/ Interlock | $160 | 11 hrs |
| Unit Heater (gas) | $150 | 8 hrs |

### Fire Alarm

| Item | Material Cost | Labor Hours |
|------|--------------|-------------|
| FA Control Panel | $3,500 | 20 hrs |
| Connection to Existing | $2,500 | 25 hrs |
| Duct Detector | $400 | 4 hrs |
| Audio/Visual Device | $200 | 3.5 hrs |
| Pull Station | $200 | 3.5 hrs |
| Flow/Tamper Connection | $200 | 3 hrs |

---

## 4. PROPOSAL Sheet - Output Document

The PROPOSAL sheet auto-generates a professional bid document by pulling data from BASEBID.

### Key Formula References:
```excel
E8  = basebid!F2          # Date
A10 = basebid!A5          # Contact name
F10 = basebid!A2          # Project name
A11 = basebid!A4          # GC name
F11 = basebid!A3          # Project location
C53 = basebid!D331        # FINAL BID PRICE
```

### Standard Exclusions (Built-in):
- Permit or bond fees
- Dumpster fees
- Excess utility company charges
- Spoil removal
- Low voltage cabling/equipment (except fire alarm)
- Site sleeving
- Temperature control wiring/starters
- Coring, sawcutting, patching
- Concrete encasements/pads
- Premium time
- Code/inspector required additions
- Heating/cooling units

---

## 5. Calculation Flow Diagram

```
┌────────────────────────────────────────────────────────────────────────────┐
│                           CALCULATION FLOW                                  │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  INPUT                    PROCESSING                      OUTPUT           │
│  ─────                    ──────────                      ──────           │
│                                                                            │
│  ┌──────────┐            ┌───────────────┐                                │
│  │ Takeoff  │───────────▶│ Line Items    │                                │
│  │ Quantity │            │ (BASEBID)     │                                │
│  └──────────┘            └───────┬───────┘                                │
│                                  │                                         │
│  ┌──────────┐            ┌───────▼───────┐                                │
│  │ FEEDERS  │───────────▶│ Material Ext  │ F = D × C                      │
│  │ Pricing  │            │               │ (Unit Price × Qty)             │
│  └──────────┘            └───────┬───────┘                                │
│                                  │                                         │
│  ┌──────────┐            ┌───────▼───────┐                                │
│  │ Labor    │───────────▶│ Labor Ext     │ I = G × C                      │
│  │ Rates    │            │               │ (Hours × Qty)                  │
│  └──────────┘            └───────┬───────┘                                │
│                                  │                                         │
│  ┌──────────┐            ┌───────▼───────┐         ┌───────────────┐      │
│  │ Tax Rate │            │ Line Total    │         │               │      │
│  │ (10.25%) │───────────▶│               │────────▶│ Section Sums  │      │
│  └──────────┘            │ J = ((I×$98)+ │         │ (B column)    │      │
│                          │  (F×1.1025))  │         └───────┬───────┘      │
│  ┌──────────┐            │  × (1+O&P)    │                 │              │
│  │ Labor    │───────────▶│               │                 │              │
│  │ Rate $98 │            └───────────────┘                 │              │
│  └──────────┘                                              │              │
│                                                            │              │
│  ┌──────────┐                                     ┌────────▼────────┐     │
│  │ O&P %    │────────────────────────────────────▶│  SUBTOTAL       │     │
│  │ (var)    │                                     │  + Tax          │     │
│  └──────────┘                                     │  + O&P          │     │
│                                                   │  ───────────    │     │
│                                                   │  TOTAL BID      │     │
│                                                   └────────┬────────┘     │
│                                                            │              │
│                                                   ┌────────▼────────┐     │
│                                                   │    PROPOSAL     │     │
│                                                   │    DOCUMENT     │     │
│                                                   └─────────────────┘     │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Implementation Plan for AI Application

### Data Models

```typescript
// Core pricing database
interface MaterialPricing {
  id: string;
  category: 'conduit' | 'wire' | 'equipment' | 'device' | 'fixture';
  name: string;
  description: string;
  unitType: 'E' | 'C' | 'M' | 'Lot'; // Each, per100ft, per1000ft, Lump
  baseMaterialCost: number;
  markupPercent: number;
  laborHours: number;
  notes?: string;
}

// Conduit types for lookup
interface ConduitType {
  id: string;
  type: 'EMT_SS' | 'EMT_COMP' | 'HW' | 'IMC' | 'PVC' | 'PVC_GRC';
  size: string; // "1/2", "3/4", "1", "1-1/4", etc.
  materialCostPer100ft: number;
  laborHoursPer100ft: number;
  markupPercent: number;
}

// Wire types for lookup
interface WireType {
  id: string;
  material: 'CU' | 'AL';
  type: 'THHN' | 'XHHW' | 'USE';
  size: string; // "#12", "#10", "#4/0", "250 MCM", etc.
  marketPricePer1000ft: number;
  markupPercent: number;
  laborHoursPer1000ft: number;
}

// Line item in estimate
interface LineItem {
  id: string;
  category: EstimateCategory;
  description: string;
  quantity: number;
  unitType: 'E' | 'C' | 'M' | 'Lot';
  materialUnitCost: number;
  laborHoursPerUnit: number;
  materialExtension: number; // quantity × materialUnitCost
  laborExtension: number;    // quantity × laborHoursPerUnit
  totalCost: number;         // calculated with markup
}

// Project estimate
interface Estimate {
  id: string;
  projectName: string;
  projectNumber: string;
  location: string;
  gcName: string;
  contactName: string;
  preparedBy: string;
  date: Date;

  // Pricing parameters
  laborRate: number;         // default $118/hr
  materialTaxRate: number;   // default 10.25%
  overheadProfitRate: number;// configurable

  // Line items by category
  lineItems: LineItem[];

  // Calculated totals
  totalMaterial: number;
  totalLabor: number;
  subtotal: number;
  overhead: number;
  finalBid: number;
}

type EstimateCategory =
  | 'TEMP_POWER'
  | 'ELECTRICAL_SERVICE'
  | 'MECHANICAL_CONNECTIONS'
  | 'INTERIOR_LIGHTING'
  | 'EXTERIOR_LIGHTING'
  | 'POWER_RECEPTACLES'
  | 'SITE_CONDUITS'
  | 'SECURITY'
  | 'FIRE_ALARM'
  | 'GENERAL_CONDITIONS';
```

### Core Calculation Functions

```typescript
// Calculate line item total with all markups
function calculateLineItemTotal(
  materialExtension: number,
  laborExtension: number,
  laborRate: number,
  materialTaxRate: number,
  overheadProfitRate: number
): number {
  const laborCost = laborExtension * laborRate;
  const materialCost = materialExtension * (1 + materialTaxRate);
  const subtotal = laborCost + materialCost;
  const total = subtotal * (1 + overheadProfitRate);
  return total;
}

// Calculate feeder pricing (wire + conduit)
function calculateFeederPrice(
  wireType: WireType,
  conduitType: ConduitType,
  conductorCount: number,
  lengthFeet: number,
  ampacityMultiplier: number
): { materialCost: number; laborHours: number } {
  // Wire cost: (price per 1000ft × conductors) / 10 for per 100ft
  const wireCostPer100ft = (wireType.marketPricePer1000ft *
    (1 + wireType.markupPercent) * conductorCount) / 10;

  // Conduit cost per 100ft
  const conduitCostPer100ft = conduitType.materialCostPer100ft;

  // Combined unit cost with ampacity multiplier
  const unitCost = (wireCostPer100ft + conduitCostPer100ft) * ampacityMultiplier;

  // Labor hours
  const wireLabor = (wireType.laborHoursPer1000ft * conductorCount) / 10;
  const conduitLabor = conduitType.laborHoursPer100ft;
  const laborHours = (wireLabor + conduitLabor) * ampacityMultiplier;

  return {
    materialCost: (unitCost * lengthFeet) / 100,
    laborHours: (laborHours * lengthFeet) / 100
  };
}

// Calculate category subtotal
function calculateCategoryTotal(items: LineItem[]): number {
  return items.reduce((sum, item) => sum + item.totalCost, 0);
}

// Calculate final bid
function calculateFinalBid(estimate: Estimate): number {
  const materialTotal = estimate.lineItems.reduce(
    (sum, item) => sum + item.materialExtension, 0
  );
  const materialWithTax = materialTotal * (1 + estimate.materialTaxRate);

  const laborTotal = estimate.lineItems.reduce(
    (sum, item) => sum + item.laborExtension, 0
  );
  const laborCost = laborTotal * estimate.laborRate;

  const subtotal = materialWithTax + laborCost;
  const overhead = subtotal * estimate.overheadProfitRate;

  return Math.ceil(subtotal + overhead);
}
```

### AI Integration Points

1. **Natural Language Takeoff**
   - Parse project descriptions to identify required items
   - Extract quantities from specifications
   - Map to appropriate line items

2. **Smart Pricing Recommendations**
   - Suggest appropriate equipment sizes based on load
   - Recommend wire/conduit sizes based on ampacity tables
   - Flag potential code violations

3. **Historical Analysis**
   - Compare bid to similar past projects
   - Identify cost outliers
   - Suggest value engineering options

4. **Proposal Generation**
   - Auto-generate scope of work
   - Create professional PDF output
   - Include relevant exclusions

### Database Schema

```sql
-- Material/Labor pricing database
CREATE TABLE materials (
  id UUID PRIMARY KEY,
  category VARCHAR(50),
  name VARCHAR(255),
  description TEXT,
  unit_type CHAR(3),
  base_material_cost DECIMAL(10,2),
  markup_percent DECIMAL(5,4),
  labor_hours DECIMAL(6,2),
  updated_at TIMESTAMP
);

-- Conduit lookup table
CREATE TABLE conduit_types (
  id UUID PRIMARY KEY,
  conduit_type VARCHAR(20),
  size VARCHAR(10),
  material_cost_per_100ft DECIMAL(10,2),
  labor_hours_per_100ft DECIMAL(6,2),
  markup_percent DECIMAL(5,4)
);

-- Wire lookup table
CREATE TABLE wire_types (
  id UUID PRIMARY KEY,
  material CHAR(2),
  wire_type VARCHAR(10),
  size VARCHAR(15),
  market_price_per_1000ft DECIMAL(10,2),
  markup_percent DECIMAL(5,4),
  labor_hours_per_1000ft DECIMAL(6,2)
);

-- Project estimates
CREATE TABLE estimates (
  id UUID PRIMARY KEY,
  project_name VARCHAR(255),
  project_number VARCHAR(50),
  location TEXT,
  gc_name VARCHAR(255),
  contact_name VARCHAR(255),
  prepared_by VARCHAR(100),
  created_at TIMESTAMP,
  labor_rate DECIMAL(10,2) DEFAULT 118.00,
  material_tax_rate DECIMAL(5,4) DEFAULT 0.1025,
  overhead_profit_rate DECIMAL(5,4) DEFAULT 0,
  final_bid DECIMAL(12,2)
);

-- Line items
CREATE TABLE line_items (
  id UUID PRIMARY KEY,
  estimate_id UUID REFERENCES estimates(id),
  category VARCHAR(50),
  description TEXT,
  quantity DECIMAL(10,2),
  unit_type CHAR(3),
  material_unit_cost DECIMAL(10,2),
  labor_hours_per_unit DECIMAL(6,2),
  material_extension DECIMAL(12,2),
  labor_extension DECIMAL(10,2),
  total_cost DECIMAL(12,2)
);
```

---

## 7. Key Insights

### Pricing Philosophy
1. **Labor is king**: At $118/hr, labor costs often exceed material costs
2. **Markup layers**: Material gets 10.25% tax, then O&P on everything
3. **Unit consistency**: Always work in per 100ft for conduit, per 1000ft for wire
4. **Feeder complexity**: Distribution feeders combine wire + conduit pricing

### Common Patterns
1. Equipment has fixed material + fixed labor hours
2. Linear items (wire, conduit) scale with quantity
3. Larger equipment = more labor hours (not always proportional)
4. Warehouse items have different pricing than office items

### Adjustable Parameters
1. **Labor rate**: Regional prevailing wage compliance
2. **Material markup**: Market volatility buffer
3. **O&P rate**: Profit margin and overhead recovery
4. **Market prices**: Commodity wire pricing updates

---

## 8. Next Steps for Implementation

1. **Phase 1**: Build core data models and pricing engine
2. **Phase 2**: Import line item catalog as seed data
3. **Phase 3**: Create takeoff input interface
4. **Phase 4**: Add AI-powered quantity estimation
5. **Phase 5**: Proposal generation and export
6. **Phase 6**: Historical analytics and benchmarking
