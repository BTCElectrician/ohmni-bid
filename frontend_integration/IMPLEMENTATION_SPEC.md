# Ohmni Estimate - Frontend Integration Spec

## Overview

This package provides a complete frontend implementation for the Ohmni electrical estimating system. Built with Next.js 15, React 19, TypeScript, Tailwind CSS, Zustand, TanStack React Query, and Framer Motion.

## Quick Start

### 1. Copy Files

Drop these folders into your Next.js project:

```
your-app/
├── types/
│   └── estimate.ts           # TypeScript interfaces
├── store/
│   └── estimateStore.ts      # Zustand global state
├── services/
│   └── estimateService.ts    # API service layer
├── hooks/
│   └── estimate/
│       └── useEstimate.ts    # React Query hooks
└── components/
    └── estimate/
        ├── EstimateStudio.tsx     # Main component
        ├── LineItemsTable.tsx     # Line items with categories
        ├── EstimateSummary.tsx    # Animated totals bar
        ├── ProjectInfoPanel.tsx   # Project details sidebar
        ├── PhotoTakeoffModal.tsx  # AI photo analysis
        ├── QuickAddModal.tsx      # Pricing database search
        └── EstimateChat.tsx       # AI chat assistant
```

### 2. Install Dependencies

```bash
npm install @tanstack/react-query zustand framer-motion lucide-react react-hot-toast
```

### 3. Add to Your App

```tsx
// app/estimate/page.tsx or wherever you want it
import { EstimateStudio } from '@/components/estimate/EstimateStudio';

export default function EstimatePage() {
  return <EstimateStudio />;
}

// Or with an existing estimate:
<EstimateStudio
  estimateId="abc123"
  onBack={() => router.push('/estimates')}
/>
```

### 4. Configure Query Provider

Wrap your app with TanStack Query provider (you probably already have this):

```tsx
// app/providers.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

export function Providers({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

---

## Architecture

### State Management

```
┌─────────────────────────────────────────────────────────────┐
│                    EstimateStudio                           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                    useEstimate                        │   │
│  │  ┌─────────────┐  ┌───────────────┐  ┌───────────┐   │   │
│  │  │ React Query │◄─┤ Zustand Store │◄─┤ Services  │   │   │
│  │  │   (cache)   │  │   (local UI)  │  │   (API)   │   │   │
│  │  └─────────────┘  └───────────────┘  └───────────┘   │   │
│  └──────────────────────────────────────────────────────┘   │
│                           │                                  │
│    ┌──────────┬───────────┼───────────┬──────────┐          │
│    ▼          ▼           ▼           ▼          ▼          │
│ ┌──────┐ ┌────────┐ ┌──────────┐ ┌────────┐ ┌───────┐      │
│ │Panel │ │ Items  │ │ Summary  │ │ Modal  │ │ Chat  │      │
│ └──────┘ └────────┘ └──────────┘ └────────┘ └───────┘      │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **useEstimate hook** - Main orchestrator
   - Loads estimate via React Query
   - Syncs server data to Zustand store
   - Provides mutation functions
   - Returns computed values (totals, categoryGroups)

2. **estimateStore** - Local UI state
   - Current estimate + line items
   - UI toggles (panels, modals)
   - Category expansion states
   - Real-time total calculations

3. **estimateService** - API layer
   - CRUD operations for estimates
   - Line item management
   - Pricing database search
   - Bulk operations

---

## Component Reference

### EstimateStudio

The main container. Three-panel layout:

| Panel | Description | Toggle |
|-------|-------------|--------|
| Left | Project info, client details, pricing settings | Building icon |
| Center | Line items table (always visible) | - |
| Right | AI chat assistant | Message icon |

**Props:**
```typescript
interface EstimateStudioProps {
  estimateId?: string;   // Load existing estimate
  onBack?: () => void;   // Back button handler
}
```

### LineItemsTable

Collapsible category groups with inline editing.

**Features:**
- Expandable/collapsible categories
- Drag handle for reordering (UI only, implement DnD if needed)
- Inline edit/delete actions
- AI source badges (photo/chat)
- Category totals

### EstimateSummary

Sticky bottom bar with animated counters.

**Features:**
- Spring animations on value changes
- Trend indicators (up/down arrows)
- Gradient total display
- Item/category counts

### PhotoTakeoffModal

AI-powered image analysis for automatic takeoffs.

**Features:**
- Drag & drop upload
- Multi-image support
- Mock AI analysis (wire up to your backend)
- Confidence scores
- Selectable items
- Clarification prompts

**Integration Point:**
```typescript
// In PhotoTakeoffModal.tsx, replace mock analysis with:
const response = await api.post('/api/estimates/analyze-photo', {
  image: base64Image,
  estimate_id: estimateId,
});
```

### QuickAddModal

Search and add items from pricing database.

**Features:**
- Real-time search
- Category filtering
- Quantity adjustment
- Multi-select
- Inline totals

### EstimateChat

AI conversational assistant.

**Features:**
- Message history
- Suggested items from AI
- Multi-select to add
- Quick prompt buttons
- Typing indicators

**Integration Point:**
```typescript
// Replace mock AI response with your chat API:
const response = await api.post('/api/chat/estimate', {
  message: text,
  estimate_id: estimateId,
  context: lineItems,
});
```

---

## API Endpoints Expected

The services expect these endpoints (see flask_integration for backend):

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/estimates` | Create estimate |
| GET | `/api/estimates` | List estimates |
| GET | `/api/estimates/:id` | Get estimate with items |
| PUT | `/api/estimates/:id` | Update estimate |
| DELETE | `/api/estimates/:id` | Delete estimate |
| POST | `/api/estimates/:id/items` | Add line item |
| POST | `/api/estimates/:id/items/bulk` | Bulk add items |
| PUT | `/api/estimates/:id/items/:itemId` | Update item |
| DELETE | `/api/estimates/:id/items/:itemId` | Delete item |
| GET | `/api/estimates/pricing/search` | Search pricing DB |
| POST | `/api/estimates/analyze-photo` | AI photo analysis |
| POST | `/api/estimates/quick-quote` | Quick quote calc |

---

## Theming

Uses your existing Tailwind theme. Required colors:

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        'electric-blue': '#00D4FF',
        'electric-glow': '#00FF88',
        'abco-navy': '#0A1628',
        'dark-bg': '#030712',
        'surface-elevated': '#1E293B',
        'border-subtle': '#334155',
        'text-primary': '#F1F5F9',
        'text-secondary': '#94A3B8',
      },
    },
  },
};
```

---

## TypeScript Types

Key interfaces from `types/estimate.ts`:

```typescript
// Core estimate
interface Estimate {
  id: string;
  project_name: string;
  project_type?: string;
  square_footage?: number;
  labor_rate: number;           // $/hr
  material_tax_rate: number;    // Decimal (0.1025)
  overhead_profit_rate: number; // Decimal (0.15)
  line_items?: EstimateLineItem[];
  // ... totals, dates, etc.
}

// Line item
interface EstimateLineItem {
  id: string;
  category: EstimateCategory;
  description: string;
  quantity: number;
  unit_type: 'E' | 'C' | 'M' | 'Lot';
  material_unit_cost: number;
  labor_hours_per_unit: number;
  material_extension: number;    // Calculated
  labor_extension: number;       // Calculated
  total_cost: number;            // Calculated
  source?: 'manual' | 'photo' | 'chat' | 'import';
}

// Categories
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

---

## Pricing Formula

From the Excel reverse engineering:

```
Total = ((Labor_Hours × Labor_Rate) + (Material × (1 + Tax))) × (1 + O&P)
```

Where:
- **Labor_Rate**: Default $98/hr
- **Tax**: Default 10.25% (Washington state)
- **O&P**: Configurable (0% for base bid)

Unit types:
- **E** = Each (qty × unit cost)
- **C** = Per 100ft (qty/100 × unit cost)
- **M** = Per 1000ft (qty/1000 × unit cost)
- **Lot** = Lump sum

---

## Customization Guide

### Add New Category

1. Add to `EstimateCategory` type in `types/estimate.ts`
2. Add icon mapping in `LineItemsTable.tsx` (CATEGORY_ICON_MAP)
3. Add config in `QuickAddModal.tsx` (CATEGORY_CONFIG)
4. Add to backend category list

### Change Animations

Framer Motion configs in components:
- `EstimateSummary.tsx` - Counter springs, trend indicators
- `LineItemsTable.tsx` - Row entry, category expand
- Modals - Backdrop and modal entry/exit

### Add Real AI Integration

Replace mock functions:

1. **PhotoTakeoffModal** - `processImages()` function
2. **EstimateChat** - `sendMessage()` function

Both should call your Flask backend AI endpoints.

---

## Performance Notes

- React Query handles caching and background refetches
- Zustand with selectors prevents unnecessary re-renders
- Framer Motion uses GPU-accelerated animations
- Large lists use `layout` prop for smooth reordering
- Optimistic updates for instant feedback

---

## File Checklist

```
✅ types/estimate.ts
✅ store/estimateStore.ts
✅ services/estimateService.ts
✅ hooks/estimate/useEstimate.ts
✅ components/estimate/EstimateStudio.tsx
✅ components/estimate/LineItemsTable.tsx
✅ components/estimate/EstimateSummary.tsx
✅ components/estimate/ProjectInfoPanel.tsx
✅ components/estimate/PhotoTakeoffModal.tsx
✅ components/estimate/QuickAddModal.tsx
✅ components/estimate/EstimateChat.tsx
```

---

## Next Steps

1. Drop files into your project
2. Install dependencies
3. Add routes
4. Connect to Flask backend
5. Wire up real AI endpoints
6. Test with real pricing data

Questions? The code is heavily commented and follows your existing patterns.
