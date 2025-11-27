/**
 * Product View - Handles product details view modal
 */
class ProductView {
    constructor() {
        this.modalId = 'productViewModal';
        this.viewMode = 'actuals'; // 'actuals' or 'forecasts'
    }

    async show(productId) {
        try {
            // Load fresh data to get details
            const product = await dataService.getProduct(productId);
            this.currentProduct = product; // Store for reference
            this.render(product);
            
            // Setup Toggle
            this.setupModeToggle();
            
            // Initial Date Selector & Data Load
            this.renderDateSelector(product);
            this.loadPricingData(productId); // defaults to current date & actuals
            this.openModal();
        } catch (error) {
            console.error('Failed to load product details:', error);
            if (window.Toast) {
                Toast.show('Failed to load product details', 'error');
            } else {
                alert('Failed to load product details');
            }
        }
    }

    setupModeToggle() {
        const btnActuals = document.getElementById('modeActuals');
        const btnForecasts = document.getElementById('modeForecasts');
        const unitsLabel = document.getElementById('unitsLabel');
        const iconContainer = document.getElementById('unitsIconContainer');

        if (!btnActuals || !btnForecasts) return;

        // Helper to update UI state
        const updateUI = (mode) => {
            this.viewMode = mode;
            
            if (mode === 'actuals') {
                btnActuals.className = 'px-3 py-1.5 text-sm font-medium rounded-md transition-all shadow-sm bg-white text-slate-900';
                btnForecasts.className = 'px-3 py-1.5 text-sm font-medium rounded-md text-slate-500 hover:text-slate-900 transition-all';
                unitsLabel.textContent = 'Actual Units';
                iconContainer.className = 'p-3 bg-slate-50 rounded-full text-slate-400 transition-colors';
            } else {
                btnForecasts.className = 'px-3 py-1.5 text-sm font-medium rounded-md transition-all shadow-sm bg-white text-[#fb923c]';
                btnActuals.className = 'px-3 py-1.5 text-sm font-medium rounded-md text-slate-500 hover:text-slate-900 transition-all';
                unitsLabel.textContent = 'Forecast Units';
                iconContainer.className = 'p-3 bg-orange-50 rounded-full text-[#fb923c] transition-colors';
            }

            // Refresh Date Selector (dates available might differ) and Data
            if (this.currentProduct) {
                this.renderDateSelector(this.currentProduct);
                // Default to current date when switching modes or keep selected if possible?
                // Simpler to reset to default (current) to avoid invalid dates
                this.loadPricingData(this.currentProduct.product_id); 
            }
        };

        // Set initial state
        updateUI(this.viewMode);

        // Add listeners
        btnActuals.onclick = () => updateUI('actuals');
        btnForecasts.onclick = () => updateUI('forecasts');
    }

    renderDateSelector(product) {
        const container = document.getElementById('pricingMonthYear');
        if (!container) return;

        // Select data source based on mode
        const sourceData = this.viewMode === 'forecasts' ? product.forecasts : product.actuals;
        
        // Get dates and sort descending
        const dates = (sourceData || []).sort((a, b) => {
            if (a.year !== b.year) return b.year - a.year;
            return b.month - a.month;
        });

        // Create Select Element
        const select = document.createElement('select');
        select.className = 'w-full bg-white border border-slate-300 text-slate-700 text-sm rounded-lg focus:ring-[#fb923c] focus:border-[#fb923c] block p-2.5 shadow-sm';
        
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;

        // Add "Current" option
        const currentMonthName = now.toLocaleString('default', { month: 'long' });
        const currentOption = document.createElement('option');
        currentOption.value = `${currentYear}-${currentMonth}`;
        currentOption.textContent = `${currentMonthName} ${currentYear} (Current)`;
        select.appendChild(currentOption);

        // Add available dates
        const uniqueDates = new Set();
        uniqueDates.add(`${currentYear}-${currentMonth}`);

        dates.forEach(d => {
            const dateKey = `${d.year}-${d.month}`;
            if (!uniqueDates.has(dateKey)) {
                uniqueDates.add(dateKey);
                const option = document.createElement('option');
                option.value = dateKey;
                const mName = new Date(d.year, d.month - 1).toLocaleString('default', { month: 'long' });
                option.textContent = `${mName} ${d.year}`;
                select.appendChild(option);
            }
        });

        // Handle Change
        select.onchange = (e) => {
            const [year, month] = e.target.value.split('-');
            this.loadPricingData(product.product_id, parseInt(year), parseInt(month));
        };

        // Clear current content and add select
        container.innerHTML = '';
        container.appendChild(select);
    }

    async loadPricingData(productId, year = null, month = null) {
        const container = document.getElementById('pricingTablesContainer');
        container.innerHTML = '<div class="flex items-center justify-center py-8 text-slate-400"><span class="text-sm">Loading pricing data...</span></div>';
        
        try {
            let url = `/api/products/${productId}/pricing_view?`;
            if (year && month) {
                url += `year=${year}&month=${month}&`;
            }
            
            if (this.viewMode === 'forecasts') {
                url += `use_forecasts=true`;
            }

            const response = await fetch(url);
            const data = await response.json();
            
            // Calculate Grand Total
            let grandTotal = 0;
            data.processes.forEach(process => {
                process.rows.forEach(row => {
                    grandTotal += row.total_cost;
                });
            });

            // Update Header Stats
            // Note: `data.units` is returned from backend now instead of `actual_units`
            const units = data.units !== undefined ? data.units : data.actual_units; 
            document.getElementById('pricingActuals').textContent = units.toLocaleString();
            document.getElementById('pricingTotalCost').textContent = `$${grandTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
            
            this.renderPricingTables(data, container);
            
        } catch (error) {
            console.error('Error loading pricing data:', error);
            container.innerHTML = '<div class="text-center py-4 text-red-500 text-sm">Failed to load pricing breakdown</div>';
        }
    }

    renderPricingTables(data, container) {
        if (data.processes.length === 0) {
            container.innerHTML = '<div class="text-center py-4 text-slate-500 text-sm">No pricing data available</div>';
            return;
        }

        let html = '';
        
        data.processes.forEach(process => {
            html += `
                <div class="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                    <div class="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                        <h4 class="font-semibold text-slate-800 flex items-center gap-2">
                            <div class="w-2 h-2 rounded-full bg-[#fb923c]"></div>
                            ${this.escapeHtml(process.process_name)}
                        </h4>
                        <span class="text-xs text-slate-500 font-medium uppercase tracking-wider">${process.rows.length} items</span>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full text-sm text-left">
                            <thead class="bg-white border-b border-slate-100 text-xs text-slate-500 uppercase bg-slate-50/50">
                                <tr>
                                    <th class="px-4 py-3 font-medium border-r border-slate-100">Provider</th>
                                    <th class="px-4 py-3 font-medium">Item</th>
                                    <th class="px-4 py-3 font-medium text-right">Price</th>
                                    <th class="px-4 py-3 font-medium text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100">
            `;
            
            // Group rows by provider to calculate rowspan and totals
            const providerGroups = [];
            let currentGroup = null;
            let processTotal = 0;
            
            process.rows.forEach(row => {
                processTotal += row.total_cost;

                if (!currentGroup || currentGroup.providerName !== row.provider_name) {
                    currentGroup = {
                        providerName: row.provider_name,
                        rows: [],
                        total: 0
                    };
                    providerGroups.push(currentGroup);
                }
                currentGroup.rows.push(row);
                currentGroup.total += row.total_cost;
            });

            providerGroups.forEach(group => {
                group.rows.forEach((row, index) => {
                    const isFirst = index === 0;
                    const isLast = index === group.rows.length - 1;
                    const borderClass = isLast ? '' : ''; // Can add specific styling if needed
                    
                    html += `
                        <tr class="hover:bg-slate-50/50 transition-colors">
                            ${isFirst ? `
                                <td class="px-4 py-3 font-medium text-slate-900 border-r border-slate-100 bg-white align-top" rowspan="${group.rows.length}">
                                    <div class="font-semibold text-slate-800 mb-3">${this.escapeHtml(row.provider_name)}</div>
                                    
                                    <div class="space-y-1.5 mb-3">
                                        <div class="flex justify-between items-baseline text-xs">
                                            <span class="text-slate-400 font-normal">Share</span>
                                            <span class="font-medium text-slate-600">${row.allocation}</span>
                                        </div>
                                        <div class="flex justify-between items-baseline text-xs">
                                            <span class="text-slate-400 font-normal">Volume</span>
                                            <span class="text-slate-600">${row.allocated_units.toLocaleString()} <span class="text-slate-400 text-[10px]">(Tier ${row.calculated_tier})</span></span>
                                        </div>
                                        <div class="flex justify-between items-center text-xs pt-0.5">
                                            <span class="text-slate-400 font-normal">Billed</span>
                                            <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#fff7ed] text-[#c2410c] border border-[#fdba74]">
                                                Tier ${row.tier}
                                            </span>
                                        </div>
                                    </div>

                                    <div class="pt-2 border-t border-slate-100 flex justify-between items-baseline">
                                        <span class="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Total</span>
                                        <span class="text-sm font-bold text-slate-700">$${group.total.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                                    </div>
                                </td>
                            ` : ''}
                            <td class="px-4 py-3 text-slate-600 font-medium">${this.escapeHtml(row.item_name)}</td>
                            <td class="px-4 py-3 text-right text-slate-600 align-top">
                                <div class="font-medium text-slate-700">$${parseFloat(row.price_per_unit.toFixed(4))}</div>
                                ${row.multiplier_display !== '-' ? `<div class="text-[10px] text-slate-400 mt-0.5">x${row.multiplier_display}</div>` : ''}
                            </td>
                            <td class="px-4 py-3 text-right font-bold text-[#fb923c]">$${row.total_cost.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 4})}</td>
                        </tr>
                    `;
                });
            });
            
            html += `
                            </tbody>
                            <tfoot class="bg-slate-50 border-t border-slate-200">
                                <tr>
                                    <td colspan="3" class="px-4 py-3 text-right font-semibold text-slate-700">Process Subtotal</td>
                                    <td class="px-4 py-3 text-right font-bold text-slate-900 text-base">
                                        $${processTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    render(product) {
        // Populate fields
        document.getElementById('viewProductName').textContent = product.name;
        document.getElementById('viewProductDescription').textContent = product.description || 'No description provided';
        
        const statusEl = document.getElementById('viewProductStatus');
        const isActive = product.status === 'active';
        statusEl.textContent = isActive ? 'Active' : 'Inactive';
        statusEl.className = `px-2.5 py-0.5 rounded-full text-xs font-medium border ${isActive ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-700 border-gray-200'}`;

        // Dates
        document.getElementById('viewProductCreated').textContent = this.formatDate(product.date_creation);
        document.getElementById('viewProductUpdated').textContent = this.formatDate(product.date_last_update);
        
        // Stats
        document.getElementById('viewProductItemCount').textContent = product.item_ids.length;
    }

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    }

    openModal() {
        const modal = document.getElementById(this.modalId);
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }
        
        // Close on Escape
        document.addEventListener('keydown', this.handleEscape);
    }

    close() {
        const modal = document.getElementById(this.modalId);
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
        document.removeEventListener('keydown', this.handleEscape);
    }

    handleEscape = (e) => {
        if (e.key === 'Escape') this.close();
    }
}

// Initialize
const productView = new ProductView();
window.productView = productView;
