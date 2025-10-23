# Scenario Optimization - Benefits & Roadmap

## Executive Summary

Transform Pareto's homepage from a **single calculation view** to a **side-by-side scenario comparison tool** that enables data-driven provider allocation decisions.

## Key Problem Solved

**Current State**: You see one messy calculation result. Hard to understand, no way to explore alternatives.

**New State**: Create and compare multiple scenarios side-by-side to find optimal provider allocations.

## Core Benefits

### 1. 🎯 Visual Clarity
- **Before**: Single dense result with all providers mixed together
- **After**: Clean scenario cards showing total cost, providers used, and savings at a glance

### 2. 💰 Cost Optimization
- **Before**: Don't know if current allocation is optimal
- **After**: Instantly see which scenario saves the most money (e.g., "Optimize T5" saves $230k vs base)

### 3. 🔄 Easy Exploration
- **Before**: Can't test different provider strategies without manual recalculation
- **After**: Create scenarios in 30 seconds, compare up to 3 simultaneously

### 4. 📊 Tier Impact Understanding
- **Before**: Unclear how provider choices affect tier pricing
- **After**: Real-time tier calculation shows exact impact of each allocation change

### 5. ⚠️ Risk Awareness
- **Before**: May unknowingly concentrate on single provider
- **After**: Visual warnings for single-provider dependency

## Example Use Cases

### Use Case 1: "Which provider allocation saves the most?"
```
Scenario A (Base):        $4,120,000  [Equifax T5, TransUnion T4]
Scenario B (Optimize T5): $3,890,000  [Equifax T5, Experian T3]    ← WINNER
Scenario C (All TU):      $4,450,000  [TransUnion T4]

→ Choose Scenario B, save $230,000 (5.6%)
```

### Use Case 2: "What if we consolidate to one provider?"
```
Scenario A (Base):        $4,120,000  [2 providers]
Scenario B (Equifax Only):$1,640,000  [1 provider]  ← Cheaper but risky
Scenario C (TU Only):     $4,450,000  [1 provider]

→ Equifax-only saves money but creates single-provider risk
→ Visual warning highlights this risk
```

### Use Case 3: "How close are we to tier boundaries?"
```
Current: 11,150,000 files → Equifax T5
If we remove Costco product: 1,150,000 files → Equifax T3
Cost impact: T5 ($0.10) → T3 ($0.50) = +$460,000

→ Real-time preview shows tier drop and cost increase
→ Decision: Keep Costco to maintain T5 pricing
```

## Implementation Phases

### Phase 1: MVP (Week 1-2)
**Goal**: Side-by-side scenario comparison

✅ Create scenario management (add, clone, delete)  
✅ Allocation matrix editor (item × provider checkboxes)  
✅ Side-by-side comparison cards (up to 3)  
✅ Cost calculation with custom allocations  
✅ Basic tier display  

**Deliverables**:
- 3 new frontend components
- 1 new API endpoint (`POST /api/optimization/scenario/calculate`)
- Modified `optimization_repository.py` to accept allocations

### Phase 2: Enhanced UX (Week 3)
**Goal**: Polish and insights

✅ Real-time tier impact preview  
✅ Best scenario highlighting  
✅ Cost delta visualization (green/red)  
✅ Provider risk warnings  
✅ Scenario persistence (localStorage)  

**Deliverables**:
- Enhanced UI with animations
- Risk indicators
- Scenario saving/loading

### Phase 3: Advanced Features (Week 4+)
**Goal**: Power user features

✅ Auto-optimization suggestions  
✅ Constraint rules (e.g., "must use Equifax for FICO")  
✅ Export/import scenarios  
✅ Historical tracking  
✅ Database persistence (replace localStorage)  

**Deliverables**:
- Optimization algorithms
- Database schema for scenarios
- Full CRUD API

## Technical Approach

### Backend Changes (Minimal)

#### New/Modified Files:
1. **`db/optimization_repository.py`** - Add `calculate_cost_with_allocations()` method
2. **`api/routers/home.py`** - Add `POST /api/optimization/scenario/calculate` endpoint

#### Estimated LOC: ~150 lines

### Frontend Changes (Moderate)

#### New Files:
1. **`scenarioManager.js`** - Scenario CRUD (~200 lines)
2. **`allocationEditor.js`** - Matrix UI (~250 lines)
3. **`scenarioComparator.js`** - Side-by-side view (~300 lines)
4. **`scenarioStorage.js`** - Persistence (~100 lines)

#### Modified Files:
1. **`index.html`** - Add scenario layout (~100 lines)
2. **`optimizationApp.js`** - Integrate scenarios (~50 lines)

#### Estimated LOC: ~1,000 lines (all vanilla JS)

### Database Changes (Phase 3 only)

```sql
CREATE TABLE scenarios (
    scenario_id INTEGER PRIMARY KEY,
    name VARCHAR NOT NULL,
    allocations JSON NOT NULL,
    results JSON,
    is_active BOOLEAN DEFAULT false,
    date_creation VARCHAR NOT NULL,
    date_last_update VARCHAR NOT NULL
);
```

## Success Metrics

### User Experience:
- ✅ Scenario creation time < 30 seconds
- ✅ Cost comparison visible without scrolling
- ✅ Zero confusion about what can be changed
- ✅ Tier impact clear and actionable

### Business Impact:
- 💰 Identify cost savings opportunities (avg $200k per scenario analysis)
- ⏱️ Reduce decision-making time from hours to minutes
- 🎯 Increase confidence in provider allocation decisions
- 📊 Enable data-driven contract negotiations

## Design Philosophy

### Follows Pareto Principles:
✅ **UAT Philosophy**: Simple, clear functions without over-engineering  
✅ **Vanilla JavaScript**: No frameworks, lightweight components  
✅ **Tailwind CSS**: Consistent with existing design system  
✅ **Component Architecture**: Matches pricing/products pages  
✅ **Mobile-First**: Responsive at all breakpoints  

### User-Centric:
✅ **Fixed vs Variable Clear**: Product quantities fixed, allocations variable  
✅ **Visual Feedback**: Real-time tier and cost updates  
✅ **No Jargon**: "Credit files" not "units", clear labels  
✅ **Reversible Actions**: Clone and edit without losing original  

## Next Steps

### Option A: Full Implementation
Implement all 3 phases sequentially, starting with Phase 1 MVP.

**Timeline**: 4 weeks  
**Effort**: ~2-3 days per week  
**Risk**: Low (incremental approach)

### Option B: Prototype First
Build interactive prototype with dummy data to validate UX before backend changes.

**Timeline**: 2-3 days  
**Effort**: Frontend only  
**Risk**: Very low (no backend changes)

### Option C: Phased Rollout
Deploy Phase 1 MVP behind feature flag, gather feedback, iterate.

**Timeline**: 2 weeks to MVP  
**Effort**: Phase 1 only  
**Risk**: Low (controlled release)

## Questions for Consideration

1. **Should scenarios persist?** (localStorage vs database)
2. **How many scenarios to support?** (3 shown, unlimited saved?)
3. **Auto-optimization priority?** (Phase 2 or Phase 3?)
4. **Historical tracking needed?** (Track scenario performance over time)
5. **Multi-user support?** (Share scenarios across team)

## Recommendation

**Start with Phase 1 MVP** using localStorage for persistence:
- Fastest path to value
- Validates UX before heavy backend investment
- Can upgrade to database persistence in Phase 3 if needed
- Aligns with UAT philosophy: simple, working solution first

**Estimated Timeline**: 2 weeks to working MVP with side-by-side comparison.
