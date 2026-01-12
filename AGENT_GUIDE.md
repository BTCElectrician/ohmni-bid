# Agent Guide - Ohmni Bid System

**For AI agents working on this codebase**

This document explains the architecture and conventions that agents must follow when modifying this codebase.

## Default Parameters Architecture

### ⚠️ CRITICAL: Code-First Defaults

**The source of truth for default parameters is in CODE, not in JSON files.**

When updating labor rates, tax rates, or other defaults, you MUST update them in these locations:

1. **Python Backend**: `flask_integration/services/estimation_service.py`
   ```python
   DEFAULT_LABOR_RATE = 118.00
   DEFAULT_TAX_RATE = 0.1025
   DEFAULT_OP_RATE = 0.0
   ```

2. **TypeScript Engine**: `src/estimator.ts`
   ```typescript
   export const DEFAULT_PARAMETERS: EstimateParameters = {
     laborRate: 118.00,
     materialTaxRate: 0.1025,
     overheadProfitRate: 0
   };
   ```

3. **React Frontend**: `frontend_integration/store/estimateStore.ts`
   ```typescript
   const laborRate = estimate?.labor_rate ?? 118;
   ```

### What NOT to Do

❌ **DO NOT** update defaults by editing `pricing_database.json`  
❌ **DO NOT** assume `pricing_database.json.parameters` controls application behavior  
❌ **DO NOT** change defaults in only one location

### What the JSON File Is

`flask_integration/data/pricing_database.json` contains:
- **Unit pricing data** (conduit, wire, equipment costs) - ✅ Used by application
- **Parameters section** - ❌ NOT used by application (snapshot only)

The `parameters` section is extracted from the Excel workbook during the extraction process. It's informational only and shows what was in Excel at extraction time. The application ignores it.

## Current Defaults (2025)

- **Labor Rate**: $118/hr (IBEW Local 134 2025 rates)
- **Material Tax**: 10.25% (Washington state)
- **Overhead & Profit**: 0% (user configurable per estimate)

## File Structure

```
ohmni-bid/
├── src/estimator.ts                    # TypeScript calculation engine
├── flask_integration/
│   ├── services/estimation_service.py  # Backend business logic (DEFAULTS HERE)
│   ├── models/estimate_models.py      # SQLAlchemy models
│   ├── routes/estimation_routes.py     # REST API endpoints
│   ├── prompts/                        # AI prompts (chat & vision)
│   └── data/pricing_database.json      # Unit pricing (NOT defaults)
├── frontend_integration/
│   ├── store/estimateStore.ts         # Zustand state (DEFAULTS HERE)
│   ├── components/estimate/           # React components
│   └── services/estimateService.ts     # API client
└── scripts/
    └── extract_pricing.py               # Extracts from Excel
```

## When Making Changes

### Updating Labor Rates

1. Update `DEFAULT_LABOR_RATE` in `flask_integration/services/estimation_service.py`
2. Update `DEFAULT_PARAMETERS.laborRate` in `src/estimator.ts`
3. Update fallback in `frontend_integration/store/estimateStore.ts`
4. Update documentation in:
   - `README.md`
   - `ELECTRICAL_BID_LOGIC.md`
   - `flask_integration/IMPLEMENTATION_SPEC.md`
   - `frontend_integration/IMPLEMENTATION_SPEC.md`
5. Update prompts if they mention rates:
   - `flask_integration/prompts/estimation_chat.md`
   - `flask_integration/prompts/estimation_vision.md` (if applicable)

### Adding New Default Parameters

1. Add constant to `estimation_service.py`
2. Add to `DEFAULT_PARAMETERS` in `estimator.ts`
3. Add to frontend store defaults
4. Update all documentation
5. Update database models if needed

### Modifying Pricing Database

The `pricing_database.json` file contains unit pricing data (material costs, labor hours per unit). This IS used by the application.

To update:
1. Run `scripts/extract_pricing.py` to re-extract from Excel
2. The `parameters` section will be updated automatically (but it's still not used as source of truth)

## Testing Checklist

Before committing changes to defaults:

- [ ] All three code locations updated (Python, TypeScript, React)
- [ ] Documentation updated in all relevant files
- [ ] Prompts updated if they mention rates
- [ ] TypeScript builds successfully (`npm run build`)
- [ ] Python files compile (`python -m compileall`)
- [ ] JSON files are valid (`python -c "import json; json.load(open('file.json'))"`)

## Common Mistakes to Avoid

1. **Updating only the JSON file** - The app won't use it
2. **Updating only one code location** - Causes inconsistencies
3. **Forgetting to update documentation** - Confuses future agents
4. **Assuming Excel controls defaults** - Excel is just the data source, not the runtime config

## Questions?

If you're unsure about where to make a change:
1. Check this guide first
2. Search the codebase for existing constants
3. Look at how similar parameters are handled
4. Update ALL locations, not just one

Remember: **Code is the source of truth, not data files.**
