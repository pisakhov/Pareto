/**
 * Product View - Handles product details view modal
 */
class ProductView {
    constructor() {
        this.modalId = 'productViewModal';
    }

    async show(productId) {
        try {
            // Load fresh data to get details
            const product = await dataService.getProduct(productId);
            this.render(product);
            this.openModal();
            
            // Load Pricing Data
            this.loadPricingData(productId);
        } catch (error) {
            console.error('Failed to load product details:', error);
            if (window.Toast) {
                Toast.show('Failed to load product details', 'error');
            } else {
                alert('Failed to load product details');
            }
        }
    }

    async loadPricingData(productId) {
        const container = document.getElementById('pricingTablesContainer');
        const headerMonthYear = document.getElementById('pricingMonthYear');
        const headerActuals = document.getElementById('pricingActuals');
        const headerTotalCost = document.getElementById('pricingTotalCost');
        
        if (!container) return;
        
        container.innerHTML = '<div class="flex items-center justify-center py-8 text-slate-400"><span class="text-sm">Loading pricing data...</span></div>';
        
        try {
            const response = await fetch(`/api/products/${productId}/pricing_view`);
            if (!response.ok) throw new Error('Failed to load pricing data');
            
            const data = await response.json();
            
            // Calculate Grand Total
            let grandTotal = 0;
            if (data.processes) {
                data.processes.forEach(process => {
                    if (process.rows) {
                        process.rows.forEach(row => {
                            grandTotal += row.total_cost || 0;
                        });
                    }
                });
            }

            // Update Header
            const monthName = new Date(data.year, data.month - 1).toLocaleString('default', { month: 'long' });
            if (headerMonthYear) headerMonthYear.textContent = `${monthName} ${data.year}`;
            if (headerActuals) headerActuals.textContent = data.actual_units.toLocaleString();
            if (headerTotalCost) headerTotalCost.textContent = `$${grandTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
            
            this.renderPricingTables(data, container);
            
        } catch (error) {
            console.error('Error loading pricing data:', error);
            container.innerHTML = '<div class="text-center py-4 text-red-500 text-sm">Failed to load pricing breakdown</div>';
        }
    }

    renderPricingTables(data, container) {
        if (!data.processes || data.processes.length === 0) {
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
                                    <th class="px-4 py-3 font-medium text-right">Multiplier</th>
                                    <th class="px-4 py-3 font-medium text-right">Allocation</th>
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
                                    <div>${this.escapeHtml(row.provider_name)}</div>
                                    <div class="mt-1">
                                        <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                            Tier ${row.tier}
                                        </span>
                                    </div>
                                    <div class="mt-2 pt-2 border-t border-slate-100">
                                        <div class="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Total</div>
                                        <div class="text-sm font-bold text-slate-700">$${group.total.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                                    </div>
                                </td>
                            ` : ''}
                            <td class="px-4 py-3 text-slate-600 font-medium">${this.escapeHtml(row.item_name)}</td>
                            <td class="px-4 py-3 text-right text-slate-600">$${row.price_per_unit.toFixed(2)}</td>
                            <td class="px-4 py-3 text-right text-slate-500 text-xs">${row.multiplier_display}</td>
                            <td class="px-4 py-3 text-right font-medium text-slate-700">
                                ${row.allocation}
                                <div class="text-[10px] text-slate-400 font-normal">(${row.allocated_units.toLocaleString()} units)</div>
                            </td>
                            <td class="px-4 py-3 text-right font-bold text-[#fb923c]">$${row.total_cost.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                        </tr>
                    `;
                });
            });
            
            html += `
                            </tbody>
                            <tfoot class="bg-slate-50 border-t border-slate-200">
                                <tr>
                                    <td colspan="5" class="px-4 py-3 text-right font-semibold text-slate-700">Process Subtotal</td>
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
        const nameEl = document.getElementById('viewProductName');
        if (nameEl) nameEl.textContent = product.name;

        const descEl = document.getElementById('viewProductDescription');
        if (descEl) descEl.textContent = product.description || 'No description provided';
        
        const statusEl = document.getElementById('viewProductStatus');
        if (statusEl) {
            const isActive = product.status === 'active';
            statusEl.textContent = isActive ? 'Active' : 'Inactive';
            statusEl.className = `px-2.5 py-0.5 rounded-full text-xs font-medium border ${isActive ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-700 border-gray-200'}`;
        }

        // Dates
        const createdEl = document.getElementById('viewProductCreated');
        if (createdEl) createdEl.textContent = this.formatDate(product.date_creation);
        
        const updatedEl = document.getElementById('viewProductUpdated');
        if (updatedEl) updatedEl.textContent = this.formatDate(product.date_last_update);
        
        // Stats
        const countEl = document.getElementById('viewProductItemCount');
        if (countEl) countEl.textContent = product.item_ids ? product.item_ids.length : 0;
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
