# Changelog

All notable changes to the Pareto project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added - 2025-01-23

#### Simple Two-Column Optimization UI
**Implemented streamlined Current vs Optimized comparison interface**

**Problem Identified:**
- Current homepage shows single messy calculation result
- No way to explore alternative provider allocations
- Unclear how tier changes affect pricing
- Product quantities are fixed, provider allocations can vary

**Simplified Solution (UAT Compliant):**
- Two-column layout: Current (read-only) vs Optimized (interactive)
- Provider dropdowns for each item in optimized column
- Instant recalculation on dropdown change
- Auto-optimize button for algorithm-suggested allocation
- Clean, minimal design with no storage/scenarios/modals

**Documentation Created:**
- `SIMPLE_OPTIMIZATION_DESIGN.md` - Streamlined technical design
  - Two-column concept with left (current) vs right (optimized)
  - Single component architecture (~300 lines)
  - Auto-optimization greedy algorithm
  - Real-time recalculation on provider change
- `TWO_COLUMN_MOCKUP.txt` - Clean ASCII mockup
  - Current strategy (fixed) vs Optimized strategy (editable)
  - Provider dropdowns per item
  - Cost delta display with green/red indicators
  - Mobile-responsive stacked layout
- `INTERACTION_EXAMPLE.txt` - Step-by-step user interaction flow
  - Shows before/after states for each action
  - Auto-optimize button usage
  - Manual provider changes
  - Visual feedback examples
- `QUICK_START.md` - Quick reference guide
  - What you're getting summary
  - Implementation checklist
  - UAT compliance verification

**Key Features:**
- Two columns side-by-side: Current vs Optimized
- Each item has provider dropdown (optimized side only)
- Change dropdown → instant cost recalculation
- "Auto-Optimize" button applies algorithmic best allocation
- Green border when optimized saves money
- Cost delta with percentage and arrow (↓ savings, ↑ increase)
- Provider tier badges with color coding
- Smooth cost animation on changes

**Technical Implementation:**
- Backend: 1 new endpoint (`POST /api/optimization/compare`)
- Backend: 1 new repository method (`compare_allocations()`)
- Frontend: 1 new component (`comparisonView.js` ~300 lines)
- Frontend: Updated HTML layout (two-column grid)
- No storage, no database changes, no persistence

**Design Principles (UAT Compliant):**
- Minimal: Just two columns, no complexity
- Clear: Current (fixed) vs Optimized (editable)
- Fast: Instant recalculation
- Sleek: Clean grid, no clutter
- Functional: Dropdowns only, no matrices

**Technical Estimates:**
- Backend: ~100 lines
- Frontend: ~400 lines
- Total: ~500 lines
- Timeline: ~1 week

**Implementation Details:**

**Backend Changes:**
- `db/optimization_repository.py`
  - Added `get_current_allocations()` method to retrieve current item-provider mappings
  - Added `calculate_cost_with_allocations()` method to calculate cost with custom allocations
  - ~150 lines of new code

- `api/routers/home.py`
  - Added `CompareRequest` Pydantic model for request validation
  - Added `POST /api/optimization/compare` endpoint
  - Returns current vs optimized results with delta calculations
  - ~35 lines of new code

**Frontend Changes:**
- `frontend/home/js/comparisonView.js` - NEW FILE
  - Two-column comparison view component
  - Renders current (read-only) and optimized (interactive) strategies
  - Provider dropdowns for each item with instant recalculation
  - Green/red border and delta display based on savings/costs
  - Tier badges with color coding
  - ~285 lines

- `frontend/home/index.html`
  - Replaced old cost summary, tier status, and allocation views
  - Added single `comparisonContainer` div for two-column layout
  - Updated script includes to use comparisonView.js
  - Removed tierStatusManager.js and allocationVisualizer.js includes

- `frontend/home/js/optimizationApp.js`
  - Simplified `calculate()` method to use comparisonView
  - Removed old `displayResults()` method
  - Removed tier status and allocation visualizer integrations
  - ~30 lines removed, ~10 lines modified

**Files Modified:**
- db/optimization_repository.py
- api/routers/home.py
- frontend/home/index.html
- frontend/home/js/optimizationApp.js

**Files Created:**
- frontend/home/js/comparisonView.js

**Status:**
- ✅ Backend implementation complete
- ✅ Frontend implementation complete
- ⏳ Ready for testing

### Added - 2025-01-XX

#### Tier-Based Pricing System
**Implemented comprehensive tier-based pricing with credit file terminology and manual override support**

**Database Changes:**
- `migrations/002_add_tier_thresholds.sql` - Added tier management schema
  - Added `tier_thresholds` JSON column to `providers` table for tier threshold configuration
  - Added `provider_tier_overrides` table for manual tier adjustments per provider
  - Schema supports flexible tier thresholds with base prices per tier
  - Stores calculated tier, manual override tier, and override notes

**Backend Changes:**
- `db/pricing_repository.py` - Enhanced with tier management methods
  - Added `get_tier_thresholds()` and `set_tier_thresholds()` for provider tier configuration
  - Added `get_tier_for_credit_files()` to calculate appropriate tier based on volume
  - Added `get_provider_tier_override()` and `set_provider_tier_override()` for manual tier control
  - Added `get_price_for_item_at_tier()` for tier-based price lookup with inheritance
  - Updated price calculation logic to use tiers instead of unit ranges

- `db/optimization_repository.py` - Updated cost calculation for tiers
  - Modified `calculate_current_cost()` to use tier-based pricing
  - Added `get_provider_tier_status()` to fetch tier status across all providers
  - Implemented tier inheritance logic: prices inherit from lower tiers if not explicitly set
  - Returns tier info in provider breakdown for visualization

- `api/routers/pricing.py` - Extended API with tier endpoints
  - Replaced `unit_range` with `tier_number` in Offer model
  - Added GET/PUT `/api/providers/{provider_id}/tier-thresholds` endpoints
  - Added GET/PUT `/api/providers/{provider_id}/tier-override` endpoints
  - Added DELETE `/api/providers/{provider_id}/tier-override` endpoint
  - Updated offer CRUD operations to handle tier_number

- `api/routers/home.py` - Added tier status endpoint (line 128-133)
  - POST `/api/optimization/tier-status` endpoint for fetching tier status per provider
  - Returns calculated tier, override tier, effective tier, and credit files per provider

**Frontend - Pricing Management:**
- `frontend/pricing/index.html` - Added tier management UI
  - Added "Tier Thresholds" section to provider modal with dynamic tier inputs
  - Changed "Minimum Units" input to "Tier Number" dropdown in offer modal
  - Tier dropdown populated dynamically based on selected provider's tiers
  - Included tierManager.js script for tier management functionality

- `frontend/pricing/js/tierManager.js` - NEW FILE for tier management
  - Created `initializeTierThresholds()` to load and populate provider tiers
  - Created `addTierThreshold()` and `removeTierThreshold()` for dynamic tier UI
  - Created `getTierThresholds()` and `getTierBasePrices()` to extract tier data
  - Implemented `populateTierSelect()` to populate tier dropdown in offer modal
  - Handles tier selection change events and async tier loading

- `frontend/pricing/js/formHandler.js` - Integrated tier management
  - Updated provider form handling to save/load tier thresholds and base prices
  - Modified offer form to use tier_number instead of unit_range
  - Enhanced provider populate function to load tiers with error handling
  - Enhanced offer populate function to select appropriate tier
  - Added tier data to provider save/update requests

- `frontend/pricing/js/tableRenderer.js` - Updated display for tiers
  - Changed offer table column from "Min Units" to "Tier"
  - Display tier number instead of unit range in offer listings
  - Updated sort logic to work with tier numbers

**Frontend - Home Dashboard:**
- `frontend/home/index.html` - Added tier status panel and updated terminology
  - Changed "Total Units" to "Total Credit Files" in cost summary
  - Added "Provider Tier Status" panel to show tier info per provider
  - Included tierStatusManager.js script

- `frontend/home/js/tierStatusManager.js` - NEW FILE for tier status display
  - Created `fetchTierStatus()` to retrieve tier status from backend
  - Created `renderTierStatus()` to display tier cards with calculated/override/effective tiers
  - Visual indicators for manual overrides with warning icons
  - Shows credit files, override notes, and tier status per provider

- `frontend/home/js/optimizationApp.js` - Integrated tier status
  - Updated `calculate()` to fetch both cost and tier status in parallel
  - Modified `displayResults()` to render tier status panel
  - Updated to use totalCreditFiles instead of totalUnits

- `frontend/home/js/allocationVisualizer.js` - Enhanced with tier display
  - Added tier badge to provider cards showing effective tier
  - Changed "units" to "credit files" throughout
  - Display tier number alongside price in allocation bars
  - Show tier info from provider breakdown data

- `frontend/home/js/quantityManager.js` - No changes (credit files are product quantities)

**Terminology Updates:**
- Replaced "units" with "credit files" across all frontend displays
- Replaced "unit_range" with "tier_number" in API and database
- Updated labels, help text, and display strings consistently

**Business Logic:**
- Tiers are based on total credit files across all products, not per-product
- Tier thresholds define minimum credit files required for each tier
- Prices can be set per tier, with automatic inheritance from lower tiers
- Manual tier overrides allow pricing flexibility for specific providers
- Override status clearly displayed with warnings and notes
- Tier pricing applies uniformly across all items from a provider

**User Experience:**
- Providers can configure multiple pricing tiers with thresholds
- Offers select from available tiers rather than specifying unit ranges
- Dashboard shows calculated vs. effective tiers for transparency
- Visual indicators highlight when manual overrides are active
- Tier badges on provider cards show at-a-glance tier status

### Added - 2025-10-19

#### Products Card Accordion Total & Multiplier Fix
- frontend/products/js/tableRenderer.js
  - Appends a Total row at the bottom of each product's item breakdown accordion.
  - Sums per-item final_price and multiplies by product Est. Files (proxy_quantity).
  - Displays currency-formatted grand total.
  - Implements Option C UI for multipliers: shows Base price and Final price with a premium/discount pill and tier tag.
  - Groups item pricing by provider in accordion with per-provider subtotal and grand total.
  - Reverted to Option C popover: tiny colored dot next to price opens details (Base, Multiplier, % Change). Per-item only.
  - Price formatting now shows 3 decimals when needed (e.g., 0.05 × 0.90 → $0.045), otherwise 2 decimals.

### Changed - 2025-10-19

#### Tier-Exceeding Indicator Visual Update
**Updated visual indicator for providers exceeding maximum tier with improved tooltip**

**Frontend Changes:**
- `frontend/base.html` (lines 143-185)
  - Changed tier-exceeding icon from star (★) to warning triangle (⚠)
  - Added hover tooltip explaining "Exceeding maximum tier - using highest tier pricing"
  - Implemented tooltip with same visual style as existing .tier-tooltip
  - Added clip-path arrow pointing to icon for better UX
  - Maintained amber/orange color (#f59e0b) for visual consistency

**Technical Details:**
- Tooltip appears on hover using CSS pseudo-elements (::before for tooltip, ::after for icon)
- Smooth transitions with opacity and transform animations
- Z-index 50 ensures tooltip visibility above other elements
- Pointer-events: none prevents interference with hover interactions

**User Experience:**
- Clear warning triangle icon draws attention to tier-exceeding status
- Informative tooltip appears on hover explaining the situation
- Consistent with existing tier tooltip styling and behavior
- No layout shifts in the pricing relationship matrix

### Fixed - 2025-10-17

#### Product Sequence Sync
**Fixed duplicate key constraint errors when adding products**

**Issue:**
- Attempting to create new products resulted in: "Constraint Error: Duplicate key 'product_id: 1' violates primary key constraint"
- Each click incremented sequence but hit the next existing ID (1, 2, 3...)
- Same pattern as the previously fixed offer/provider/item sequences

**Root Cause:**
- DuckDB sequence `product_seq` started at 1
- Existing products already occupied IDs 1, 2, 3, etc.
- Sequence initialization didn't account for pre-existing records

**Solution:**
- `db/products_repository.py` (lines 107-115, 242-249)
  - Added `_sync_sequences()` method following same pattern as pricing_repository
  - Queries `MAX(product_id)` from products table and recreates sequence starting at max_id + 1
  - Uses `COALESCE(MAX(product_id), 0)` to handle empty tables
  - Called automatically during database initialization via `_create_sequences()`

**Technical Details:**
- Product sequence: `START {max(product_id) + 1}`
- Uses `CREATE OR REPLACE SEQUENCE` pattern (DROP + CREATE for DuckDB)
- UAT-compliant: minimal, self-documenting code without defensive checks

#### Database Sequence Sync
**Fixed duplicate key constraint errors when adding offers/providers/items**

**Issue:**
- Attempting to create new offers resulted in: "Constraint Error: Duplicate key 'offer_id: 1' violates primary key constraint"
- Required multiple attempts (clicking 2-3 times) until sequence advanced past existing IDs
- Same issue affected providers and items sequences

**Root Cause:**
- DuckDB sequences (provider_seq, item_seq, offer_seq) started at 1
- Existing data already occupied IDs 1, 2, 3, etc.
- Sequence initialization didn't account for pre-existing records

**Solution:**
- `db/pricing_repository.py` (lines 159-173)
  - Added `_sync_sequences()` method to reset sequences based on existing max IDs
  - Queries `MAX(id)` from each table and recreates sequence starting at max_id + 1
  - Uses `COALESCE(MAX(id), 0)` to handle empty tables gracefully
  - Called automatically during database initialization

**Technical Details:**
- Provider sequence: `START {max(provider_id) + 1}`
- Item sequence: `START {max(item_id) + 1}`
- Offer sequence: `START {max(offer_id) + 1}`
- Uses `CREATE OR REPLACE SEQUENCE` to reset existing sequences

#### Offer Edit Constraint
**Disabled item and provider editing when modifying existing offers**

**Frontend Changes:**
- `frontend/pricing/js/formHandler.js` (lines 269-271)
  - Added `disabled = true` for item and provider selects when editing offers
  - Prevents accidental changes to offer's item/provider relationship
  - Follows UAT principle: offers belong to specific item+provider combinations

- `frontend/pricing/js/modalManager.js` (lines 145-146)
  - Re-enables selects when creating new offers
  - Ensures clean state for new offer creation

**Business Logic:**
- An offer is fundamentally tied to its item and provider
- Changing these would create a different offer, not update the existing one
- Users should delete and recreate offers if item/provider needs to change
- This prevents data integrity issues and maintains clear business semantics

**User Experience:**
- When editing an offer: item and provider selects are disabled (grayed out)
- When creating a new offer: all fields are editable as expected
- Clear visual feedback via browser's native disabled state styling

### Added - 2025-10-09

#### Cost Comparison Chart Enhancement
**Enhanced optimization results with visual bar chart for cost comparison**

**Frontend Changes:**
- `frontend/home/js/resultsRenderer.js` - Enhanced chart visualization (lines 130-192)
  - Improved `renderChart()` method with better visual design
  - Added automatic sorting by total cost (lowest to highest)
  - Implemented gradient colors: dark blue for best offer, gray for others
  - Added animated pulse effect on optimal offer bar
  - Displayed savings amount on each bar in green
  - Added "BEST" badge on optimal offer
  - Implemented hover effects with scale transform and shadows
  - Minimum bar height of 20% for visibility
  - Fixed height container (300px per bar area) for consistency

- `frontend/home/index.html` - Improved chart container (lines 154-168)
  - Updated background with gradient styling
  - Added chart icon to section header
  - Increased chart height from h-64 to h-80 (256px → 320px)
  - Added descriptive helper text: "Sorted by total cost • Lower is better"
  - Improved spacing with gap-4 between bars

**Chart Features:**
- Visual bar representation of total costs
- Color-coded best offer (dark blue gradient with pulse animation)
- Real-time savings calculation displayed on each bar
- Interactive hover effects on all bars
- Sorted display from cheapest to most expensive
- Provider names and total costs clearly labeled
- Responsive design with proper spacing

**Documentation:**
- `CHART_ENHANCEMENT.md` - Complete feature documentation
  - Visual examples and ASCII chart representation
  - Feature breakdown with technical details
  - Browser compatibility notes
  - Usage instructions

**Design Details:**
- Pure vanilla JavaScript and Tailwind CSS (no charting libraries)
- Follows existing design system with #023047 primary color
- Maintains UAT philosophy with minimal, clear code
- Accessible with tooltips and proper contrast ratios

### Changed - 2025-10-09

#### Unit Range Logic Interpretation Update
**Changed unit_range from "maximum units" (≤) to "minimum units" (≥) for volume discount pricing**

**Backend Changes:**
- `db/pricing_repository.py` (line 603)
  - Updated SQL query from `o.unit_range >= ?` to `o.unit_range <= ?`
  - Now correctly interprets unit_range as minimum quantity threshold
  - Volume discounts work as expected: higher quantities unlock lower per-unit prices

**Frontend Display Updates:**
- `frontend/home/js/resultsRenderer.js` (line 109)
  - Changed display symbol from "≤" to "≥"
  
- `frontend/pricing/js/tableRenderer.js` (lines 198, 265)
  - Updated symbol from "≤" to "≥" in pricing table display
  
- `frontend/pricing/js/pricing.js` (line 289, 748, 831)
  - Changed offer display symbol from "≤" to "≥"

**Frontend Form Updates:**
- `frontend/pricing/index.html` (line 245)
  - Changed label from "Maximum Units (≤)" to "Minimum Units (≥)"
  - Updated help text to reflect minimum quantity requirement

**Testing Results:**
- Quantity 500: No offers shown (correct - no minimums met)
- Quantity 1000: Offers with unit_range=1000 displayed (correct)
- Quantity 2500: All applicable offers shown with correct best price (correct)

**Business Logic:**
The new interpretation makes business sense for volume pricing:
- unit_range=1000 means "minimum 1000 units required for this price"
- Higher quantities unlock better per-unit rates
- Consistent with standard volume discount models

### Fixed - 2025-10-09

#### Optimization Results bestOffer Bug
**Fixed undefined provider.company_name error in optimization results**

**Issue:**
- Frontend JavaScript error: "Cannot read properties of undefined (reading 'company_name')"
- Occurred when displaying optimization results
- API response had flat structure with `provider_name`, but renderer expected nested `provider.company_name`

**Root Cause:**
- In `frontend/home/js/optimizationApp.js` (lines 70, 72)
- `bestOffer` was assigned directly from raw API response
- While offers array was properly transformed, bestOffer reference wasn't updated

**Solution:**
- Ensured `bestOffer` references transformed offer object with proper structure
- Transformed offers include nested provider object: `{provider: {provider_id, company_name}}`
- Both bestOffer and offers array now use consistent data structure

### Added - 2025-10-09

#### Products Page UI/UX Enhancement
**Transformed products page from basic table to modern card-based grid layout**

**Frontend Changes:**
- `frontend/products/index.html` - Completely redesigned with card grid layout
  - Added responsive 4-column grid (1-col mobile → 2-col tablet → 3-col desktop → 4-col XL)
  - Implemented search input with icon for filtering products
  - Added status filter dropdown (All/Active/Inactive)
  - Created empty state with call-to-action
  - Enhanced product counter with filtered results display
  - Maintained existing modal for CRUD operations

- `frontend/products/js/tableRenderer.js` - Transformed into CardRenderer
  - Replaced table rows with rich product cards
  - Added `filterProducts()` method for search/status filtering
  - Implemented `createProductCard()` with modern card design
  - Added `escapeHtml()` for XSS protection
  - Created `formatDate()` for relative time display (e.g., "2 days ago")
  - Card features: truncated descriptions, item count badges, status indicators
  - Hover effects and smooth transitions

- `frontend/products/js/productsApp.js` - Enhanced with filtering capabilities
  - Added `handleFilter()` method for coordinating search/filter actions
  - Implemented `updateFilteredCount()` to show "X of Y products"
  - Connected search input and status dropdown event listeners
  - Maintained existing initialization and data loading logic

- `frontend/products/js/uiManager.js` - Added loading state support
  - Created `showLoadingState()` with animated spinner
  - Enhanced visual feedback during async operations
  - Maintained existing notification and count update functionality

**Documentation:**
- `frontend/products/ARCHITECTURE.md` - Comprehensive architecture documentation
  - Component architecture and data flow diagrams
  - Design system tokens and responsive breakpoints
  - Accessibility implementation details
  - Performance optimization notes
  - Future enhancement roadmap

- `CHANGELOG.md` - Created project changelog for tracking changes

**Design System:**
- Maintained consistency with pricing page design language
- Used shadcn-inspired component patterns
- Color palette: Navy blue (#023047) primary, green success, red destructive
- Responsive breakpoints: mobile < 768px, tablet 768-1024px, desktop 1024-1280px, XL > 1280px

**Accessibility:**
- ARIA labels on all interactive elements
- Keyboard navigation support (ESC to close modals, Tab navigation)
- Focus indicators on all elements
- Screen reader friendly card content

**Key Features:**
- Real-time search across product names and descriptions
- Status filtering (active/inactive)
- Visual product cards with hover effects
- Relative timestamps ("2 days ago" vs full dates)
- Item count badges
- Quick edit/delete actions
- Empty state with CTA
- Responsive layout for all screen sizes

**Technical Details:**
- Zero external dependencies (vanilla JavaScript only)
- Follows UAT philosophy (minimal, self-documenting code)
- Component-based architecture matching pricing page patterns
- Efficient client-side filtering (no re-fetch needed)
- Total bundle size: ~8KB uncompressed JavaScript

**Backend - No Changes Required:**
- Existing API endpoints fully support new UI
- `GET /api/products` returns all required fields
- `GET /api/items` populates item dropdown
- CRUD operations unchanged

### Files Modified
- `frontend/products/index.html` - Grid layout implementation
- `frontend/products/js/tableRenderer.js` - Card rendering logic
- `frontend/products/js/productsApp.js` - Filter coordination
- `frontend/products/js/uiManager.js` - Loading state support

### Files Created
- `frontend/products/ARCHITECTURE.md` - Architecture documentation
- `CHANGELOG.md` - Project changelog

### Testing
- [x] Verified responsive layout on mobile, tablet, desktop, XL screens
- [x] Tested search functionality across all fields
- [x] Validated status filtering
- [x] Confirmed CRUD operations still work correctly
- [x] Verified accessibility with keyboard navigation
- [x] Tested empty state display
- [x] Confirmed modal interactions

### Next Steps
- Consider adding infinite scroll for large datasets
- Plan bulk operations feature
- Explore product image upload capability
- Design advanced filtering options
- Implement sort functionality

---

## Notes
This changelog follows the UAT philosophy principles and project rules:
- Simple, clear documentation
- Focus on user-facing changes
- Technical details for maintainability
- Future enhancement visibility
