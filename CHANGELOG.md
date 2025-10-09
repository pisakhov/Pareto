# Changelog

All notable changes to the Pareto project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
