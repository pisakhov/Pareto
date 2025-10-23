# Scenario Optimization UI Design

## Problem Statement

Current homepage shows a single calculation result, but users need to:
- Explore different provider allocation strategies
- Compare costs side-by-side
- Understand how tier changes affect pricing
- Make informed decisions about provider selection

**Key Constraint**: Product quantities (credit files) are fixed - only provider allocations can change.

## Proposed Solution: Side-by-Side Scenario Comparison

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Pricing Optimization Dashboard                              │
├─────────────────────────────────────────────────────────────┤
│ Product Quantities (Fixed)                                  │
│ [Cards] [Costco] [PIL] [Retail]  [Calculate All Scenarios] │
├─────────────────────────────────────────────────────────────┤
│ Scenarios:  [ Base ] [ Optimize Equifax ] [ All TU ] [+New]│
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────┬─────────────┬─────────────┐                │
│ │  Scenario 1 │  Scenario 2 │  Scenario 3 │                │
│ │   (Base)    │ (Opt Equi.) │  (All TU)   │                │
│ ├─────────────┼─────────────┼─────────────┤                │
│ │ $4,120,000  │ $3,890,000  │ $4,450,000  │                │
│ │             │ ↓ -$230,000 │ ↑ +$330,000 │                │
│ │             │   (-5.6%)   │   (+8.0%)   │                │
│ ├─────────────┼─────────────┼─────────────┤                │
│ │ Providers:  │ Providers:  │ Providers:  │                │
│ │ • Equifax   │ • Equifax   │ • TransUnion│                │
│ │   T5 ✓      │   T5 ✓      │   T4        │                │
│ │ • TransUnion│ • Experian  │             │                │
│ │   T4        │   T3        │             │                │
│ ├─────────────┼─────────────┼─────────────┤                │
│ │ [Details ▼] │ [Details ▼] │ [Details ▼] │                │
│ │             │             │             │                │
│ │ Allocations:│ Allocations:│ Allocations:│                │
│ │ FICO→Equi   │ FICO→Equi   │ FICO→TU     │                │
│ │ FACT→Equi   │ FACT→Exp    │ FACT→TU     │                │
│ │ ...         │ ...         │ ...         │                │
│ └─────────────┴─────────────┴─────────────┘                │
└─────────────────────────────────────────────────────────────┘
```

### Key Features

#### 1. Scenario Management
- **Create scenarios**: Clone base or start fresh
- **Name scenarios**: Descriptive names (e.g., "Maximize Equifax", "All TransUnion")
- **Save/Load**: Persist scenarios for later comparison
- **Delete**: Remove scenarios no longer needed

#### 2. Allocation Editor per Scenario
Each scenario has its own allocation matrix:

```
Item × Provider Matrix (per scenario)

         │ Equifax │ Experian │ TransUnion
─────────┼─────────┼──────────┼───────────
FICO     │   ✓     │          │
FACT     │   ✓     │          │
FICO2    │   ✓     │          │
ISPL     │   ✓     │          │
```

- **Toggle allocations**: Click to enable/disable item-provider pairs
- **Visual feedback**: Shows which providers are active
- **Validation**: Ensures at least one provider per item

#### 3. Real-Time Tier Calculation
As you toggle allocations, see immediate tier impact:

```
Equifax Tier Status
┌────────────────────────────────┐
│ Credit Files: 11,150,000       │
│ Calculated Tier: T5            │
│ Base Price: $0.10              │
│                                │
│ If you remove FICO:            │
│ Credit Files: 11,050,000       │
│ Calculated Tier: T5 (same)     │
│ Cost Δ: -$10,000               │
└────────────────────────────────┘
```

#### 4. Side-by-Side Comparison View
- **Up to 3 scenarios** visible simultaneously
- **Cost metrics**: Total, per-provider, delta from base
- **Tier indicators**: Visual badges for each provider
- **Provider usage**: Show which providers are used in each
- **Expandable details**: Click to see full allocation breakdown

#### 5. Optimization Insights
- **Best scenario**: Highlighted with green badge
- **Cost deltas**: Show savings/increase vs base
- **Tier warnings**: Alert if approaching tier boundary
- **Provider concentration**: Show risk of single-provider dependency

## Technical Implementation

### Data Structure

```javascript
// Scenario object
{
  scenario_id: "uuid",
  name: "Optimize Equifax",
  allocations: {
    // item_id -> provider_id
    1: 1,  // FICO -> Equifax
    2: 2,  // FACT -> Experian
    ...
  },
  results: {
    total_cost: 3890000,
    provider_breakdown: {...},
    provider_tiers: {...}
  }
}
```

### API Endpoints

#### New Endpoints Needed
```python
POST /api/optimization/scenario/calculate
# Calculate cost for specific allocations
{
  "product_quantities": {1: 100000, 2: 10000000, ...},
  "allocations": {1: 1, 2: 2, ...}  # item_id -> provider_id
}

GET /api/optimization/scenario/{scenario_id}
# Retrieve saved scenario

POST /api/optimization/scenario
# Save new scenario

PUT /api/optimization/scenario/{scenario_id}
# Update scenario

DELETE /api/optimization/scenario/{scenario_id}
# Delete scenario

GET /api/optimization/scenarios
# List all scenarios
```

#### Modified Logic
`optimization_repository.py` needs to accept allocations parameter:

```python
def calculate_cost_with_allocations(
    self, 
    product_quantities: Dict[int, int],
    allocations: Dict[int, int]  # item_id -> provider_id
) -> Dict[str, Any]:
    """Calculate cost using specific item-provider allocations."""
    # Similar to calculate_current_cost but respects allocations
    # Only calculate cost for specified provider-item pairs
```

### Frontend Components

#### New Files
- `frontend/home/js/scenarioManager.js` - Scenario CRUD operations
- `frontend/home/js/allocationEditor.js` - Allocation matrix UI
- `frontend/home/js/scenarioComparator.js` - Side-by-side comparison view
- `frontend/home/js/scenarioStorage.js` - LocalStorage persistence

#### Modified Files
- `frontend/home/index.html` - Add scenario tabs and comparison layout
- `frontend/home/js/optimizationApp.js` - Integrate scenario management

### UI Components Breakdown

#### Scenario Tabs
```html
<div class="scenario-tabs">
  <button class="tab active" data-scenario="base">Base</button>
  <button class="tab" data-scenario="opt-equifax">Optimize Equifax</button>
  <button class="tab" data-scenario="all-tu">All TU</button>
  <button class="tab-add">+ New Scenario</button>
</div>
```

#### Allocation Matrix Editor
```html
<div class="allocation-matrix">
  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th>Equifax</th>
        <th>Experian</th>
        <th>TransUnion</th>
      </tr>
    </thead>
    <tbody>
      <tr data-item-id="1">
        <td>FICO</td>
        <td><input type="checkbox" checked /></td>
        <td><input type="checkbox" /></td>
        <td><input type="checkbox" /></td>
      </tr>
    </tbody>
  </table>
</div>
```

#### Scenario Comparison Cards
```html
<div class="scenario-grid">
  <div class="scenario-card">
    <h3>Base Scenario</h3>
    <div class="cost-display">$4,120,000</div>
    <div class="provider-chips">
      <span class="chip">Equifax T5</span>
      <span class="chip">TransUnion T4</span>
    </div>
    <button class="btn-details">Details ▼</button>
  </div>
</div>
```

## User Workflow

### 1. Initial State
- User lands on homepage
- Default "Base" scenario is calculated using current allocations
- Shows single result (current behavior)

### 2. Create New Scenario
- Click "+ New Scenario"
- Modal opens: "Clone Base" or "Start Fresh"
- Name the scenario
- Allocation editor appears

### 3. Edit Allocations
- Toggle checkboxes in matrix
- See real-time tier impact
- Save scenario

### 4. Compare Scenarios
- Select 2-3 scenarios from tabs
- View side-by-side
- Identify best option
- Apply chosen scenario to production (future feature)

## Visual Design

### Color Coding
- **Best scenario**: Green border + badge
- **Current production**: Blue border
- **Worse than base**: Red cost delta
- **Better than base**: Green cost delta
- **Tier badges**: Color by tier (T1-T5)

### Responsive Breakpoints
- **Mobile**: Stack scenarios vertically
- **Tablet**: 2 scenarios side-by-side
- **Desktop**: 3 scenarios side-by-side
- **XL**: 4 scenarios (optional)

## Success Metrics
- Users can create scenarios in < 30 seconds
- Cost comparison is instantly visible
- Tier impact is clear
- Users can identify optimal allocation
- No confusion about fixed vs variable elements

## Future Enhancements
- **Auto-optimization**: AI suggests best allocation
- **Constraint rules**: "Must use Equifax for FICO"
- **Historical tracking**: Track scenario performance over time
- **Export/Import**: Share scenarios with team
- **What-if slider**: Adjust quantities temporarily to see tier impact
- **Provider minimums**: Enforce contractual minimums
- **Multi-product scenarios**: Different allocations per product
