# Simple Optimization UI - Current vs Optimized

## Concept

Two columns side-by-side:
- **Left**: Current allocation (as configured in products)
- **Right**: Optimized allocation (dynamic, you toggle providers)

When you toggle providers on the right, cost recalculates instantly.

## Visual Layout

```
┌────────────────────────────────────────────────────────┐
│  Pricing Optimization                                  │
├────────────────────────────────────────────────────────┤
│  📦 Products: Cards(100k) Costco(10M) PIL(50k)...      │
│      Total: 11,150,000 credit files                    │
└────────────────────────────────────────────────────────┘

┌──────────────────────┬──────────────────────────────────┐
│   CURRENT            │   OPTIMIZED                      │
├──────────────────────┼──────────────────────────────────┤
│  💵 $4,120,000       │  💵 $3,640,000                   │
│                      │  ↓ $480,000 (11.6%)              │
├──────────────────────┼──────────────────────────────────┤
│  FICO  → [ Equifax ▼]│  FICO  → [ Equifax ▼] ✓         │
│  FACT  → [ Equifax ▼]│  FACT  → [ Equifax ▼] ✓         │
│  FICO2 → [TransUnion]│  FICO2 → [ Equifax ▼]            │
│  ISPL  → [ Equifax ▼]│  ISPL  → [ Equifax ▼] ✓         │
├──────────────────────┼──────────────────────────────────┤
│  Providers Used:     │  Providers Used:                 │
│  • Equifax    T5     │  • Equifax    T5 ✓               │
│  • TransUnion T4     │                                  │
└──────────────────────┴──────────────────────────────────┘
```

## How It Works

### Left Column (Read-Only)
- Shows current allocations from database
- Fixed, no interaction
- Display cost and provider tiers

### Right Column (Interactive)
- Each item has a provider dropdown
- Change dropdown → instant recalculation
- Shows cost delta vs current

### Auto-Optimization Button
Optional: "Auto-Optimize" button that sets right column to lowest-cost allocation.

## Technical Implementation

### Backend

#### New Endpoint
```python
POST /api/optimization/compare
{
  "product_quantities": {1: 100000, ...},
  "optimized_allocations": {1: 1, 2: 1, ...}  # item_id -> provider_id
}

Response:
{
  "current": {
    "total_cost": 4120000,
    "allocations": {1: 1, 2: 1, ...},
    "provider_breakdown": {...}
  },
  "optimized": {
    "total_cost": 3640000,
    "allocations": {1: 1, 2: 1, ...},
    "provider_breakdown": {...}
  },
  "delta": {
    "amount": -480000,
    "percent": -11.6
  }
}
```

#### Repository Method
```python
def compare_allocations(
    product_quantities: Dict[int, int],
    optimized_allocations: Dict[int, int]
) -> Dict[str, Any]:
    """Calculate current vs optimized side-by-side."""
    current = self.calculate_current_cost(product_quantities)
    optimized = self.calculate_cost_with_allocations(
        product_quantities, 
        optimized_allocations
    )
    
    return {
        "current": current,
        "optimized": optimized,
        "delta": {
            "amount": optimized["total_cost"] - current["total_cost"],
            "percent": ((optimized["total_cost"] / current["total_cost"]) - 1) * 100
        }
    }
```

### Frontend

#### Single Component: `comparisonView.js`

```javascript
class ComparisonView {
    constructor() {
        this.currentAllocations = {};
        this.optimizedAllocations = {};
        this.items = [];
        this.providers = [];
    }
    
    async init() {
        await this.loadData();
        this.render();
        this.setupEventHandlers();
    }
    
    async loadData() {
        // Load items and providers
        // Initialize optimized = current
    }
    
    render() {
        // Render two-column layout
    }
    
    onProviderChange(itemId, providerId) {
        this.optimizedAllocations[itemId] = providerId;
        this.recalculate();
    }
    
    async recalculate() {
        const result = await fetch('/api/optimization/compare', {
            method: 'POST',
            body: JSON.stringify({
                product_quantities: this.quantities,
                optimized_allocations: this.optimizedAllocations
            })
        });
        this.updateDisplay(result);
    }
    
    async autoOptimize() {
        // Call optimization algorithm endpoint
        // Set optimized allocations to result
        // Recalculate
    }
}
```

#### HTML Structure

```html
<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <!-- Current Column -->
    <div class="bg-card rounded-lg border p-6">
        <h2 class="text-xl font-semibold mb-4">Current Strategy</h2>
        
        <div class="mb-6">
            <div class="text-3xl font-bold">$4,120,000</div>
        </div>
        
        <div class="space-y-3" id="currentAllocations">
            <!-- Item allocations (read-only) -->
        </div>
        
        <div class="mt-6 pt-6 border-t" id="currentProviders">
            <!-- Provider tier badges -->
        </div>
    </div>
    
    <!-- Optimized Column -->
    <div class="bg-card rounded-lg border p-6 border-green-500">
        <div class="flex items-center justify-between mb-4">
            <h2 class="text-xl font-semibold">Optimized Strategy</h2>
            <button id="autoOptimizeBtn" class="btn-sm">Auto-Optimize</button>
        </div>
        
        <div class="mb-6">
            <div class="text-3xl font-bold">$3,640,000</div>
            <div class="text-green-600 text-sm">↓ $480,000 (11.6%)</div>
        </div>
        
        <div class="space-y-3" id="optimizedAllocations">
            <!-- Item allocations (dropdowns) -->
        </div>
        
        <div class="mt-6 pt-6 border-t" id="optimizedProviders">
            <!-- Provider tier badges -->
        </div>
    </div>
</div>
```

## Item Allocation Row Component

```html
<div class="flex items-center justify-between py-2">
    <span class="font-medium">FICO</span>
    
    <!-- Current (read-only) -->
    <div class="px-3 py-1 bg-secondary/20 rounded text-sm">
        Equifax
    </div>
    
    <!-- OR Optimized (dropdown) -->
    <select class="px-3 py-1 border rounded text-sm">
        <option value="1">Equifax</option>
        <option value="2">Experian</option>
        <option value="3">TransUnion</option>
    </select>
</div>
```

## Auto-Optimization Algorithm

### Simple Greedy Approach
```python
def auto_optimize(product_quantities: Dict[int, int]) -> Dict[int, int]:
    """Find lowest-cost allocation for each item."""
    items = get_all_items()
    optimized = {}
    
    for item_id in items:
        providers = get_providers_for_item(item_id)
        best_provider = None
        best_cost = float('inf')
        
        for provider_id in providers:
            # Calculate total cost if we assign this item to this provider
            test_allocations = {**optimized, item_id: provider_id}
            cost = calculate_cost_with_allocations(product_quantities, test_allocations)
            
            if cost["total_cost"] < best_cost:
                best_cost = cost["total_cost"]
                best_provider = provider_id
        
        optimized[item_id] = best_provider
    
    return optimized
```

## File Structure

### New Files
- `frontend/home/js/comparisonView.js` (~300 lines)
- `frontend/home/js/optimizationAlgorithm.js` (~100 lines) - client-side helpers

### Modified Files
- `frontend/home/index.html` - Replace existing results with two-column layout
- `frontend/home/js/optimizationApp.js` - Remove old visualization, use ComparisonView
- `db/optimization_repository.py` - Add `compare_allocations()` method
- `api/routers/home.py` - Add `/api/optimization/compare` endpoint

### Estimated Changes
- Backend: ~100 lines
- Frontend: ~400 lines
- Total: ~500 lines

## User Flow

1. Load page → see products, set quantities
2. Click "Calculate" → see Current vs Optimized side-by-side
3. Optimized starts as copy of Current
4. Click "Auto-Optimize" → algorithm sets best allocations
5. Manually adjust dropdowns → instant recalculation
6. Compare costs, choose strategy

## Design Principles (UAT Compliant)

✅ **Minimal**: Just two columns, no tabs/modals/complexity  
✅ **Clear**: Current (fixed) vs Optimized (editable)  
✅ **Fast**: Instant recalculation on dropdown change  
✅ **Sleek**: Clean two-column grid, no visual clutter  
✅ **Functional**: Dropdowns only, no checkbox matrices  

## Visual Enhancements

### Green Border on Optimized
When optimized < current, add green border to right column.

### Delta Arrows
- Green ↓ when optimized saves money
- Red ↑ when optimized costs more

### Provider Tier Badges
Show tier for each provider used, with colored badges:
- T5: Green
- T4: Blue
- T3: Yellow
- T2: Orange
- T1: Red

### Smooth Animations
When cost changes, animate number with countup effect.

## Mobile Behavior

Stack columns vertically on mobile:
```
┌──────────────────┐
│ CURRENT          │
│ $4,120,000       │
└──────────────────┘
        ⬇️
┌──────────────────┐
│ OPTIMIZED        │
│ $3,640,000       │
│ ↓ $480k (11.6%)  │
└──────────────────┘
```

## Implementation Timeline

**Day 1-2**: Backend endpoint + repository method  
**Day 3-4**: Frontend component + layout  
**Day 5**: Auto-optimize algorithm  
**Day 6**: Polish + testing  

**Total**: ~1 week for complete implementation
