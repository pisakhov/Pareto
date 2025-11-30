/**
 * SimulationAllocation - Allocation Optimizer Calculator
 * Allows simulating different provider allocations to see cost/tier impact.
 */
class SimulationAllocation {
    constructor(containerId) {
        this.containerId = containerId;
        this.currentAllocations = {};
        this.optimizedAllocations = {};
        this.quantities = {};
        this.items = [];
        this.providers = [];
        this.itemProvidersMap = {};
        this.currentResult = null;
        this.optimizedResult = null;
        this.delta = { amount: 0, percent: 0 };
    }

    async init() {
        this.renderLoading();
        try {
            await this.loadProductsAndQuantities();
            await this.loadItemsAndProviders();
            await this.loadItemProviders();
            await this.loadCurrentAllocations();
            await this.fetchBaseAndCompare();
            this.render();
            this.setupEventHandlers();
        } catch (error) {
            console.error("SimulationAllocation Init Error:", error);
            this.renderError(error.message);
        }
    }

    renderLoading() {
        const container = document.getElementById(this.containerId);
        if (container) {
            container.innerHTML = `
                <div class="text-center py-12">
                    <div class="animate-pulse text-muted-foreground">Loading allocation simulation...</div>
                </div>`;
        }
    }

    renderError(msg) {
        const container = document.getElementById(this.containerId);
        if (container) {
            container.innerHTML = `
                <div class="text-center py-12">
                    <p class="text-red-600 mb-2">Failed to load simulation</p>
                    <p class="text-sm text-muted-foreground">${msg}</p>
                </div>`;
        }
    }

    async loadProductsAndQuantities() {
        const response = await fetch('/api/products');
        const products = await response.json();
        
        this.quantities = {};
        products.filter(p => p.status === 'active').forEach(product => {
            if (product.proxy_quantity && product.proxy_quantity > 0) {
                this.quantities[product.product_id] = product.proxy_quantity;
            }
        });
    }

    async loadItemsAndProviders() {
        const [itemsRes, providersRes] = await Promise.all([
            fetch('/api/items'),
            fetch('/api/providers')
        ]);
        
        const allItems = await itemsRes.json();
        const allProviders = await providersRes.json();
        
        this.items = allItems.filter(item => item.status === 'active');
        this.providers = allProviders.filter(p => p.status === 'active');
    }

    async loadItemProviders() {
        const res = await fetch('/api/provider-items');
        if (res.ok) {
            const rels = await res.json();
            this.itemProvidersMap = rels.reduce((acc, r) => {
                const itemId = r.item_id;
                if (!acc[itemId]) acc[itemId] = [];
                acc[itemId].push(r.provider_id);
                return acc;
            }, {});
        } else {
            this.itemProvidersMap = {};
        }
    }

    async loadCurrentAllocations() {
        this.optimizedAllocations = {};
    }

    async fetchBaseAndCompare() {
        // 1) Fetch base (current) cost
        const baseRes = await fetch('/api/optimization/cost', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ product_quantities: this.quantities })
        });
        if (!baseRes.ok) throw new Error('Failed to load base cost');
        this.currentResult = await baseRes.json();

        // 2) Mirror base allocations into editable structure
        const base = this.currentResult?.allocation_details || {};
        this.optimizedAllocations = Object.fromEntries(Object.entries(base).map(([pid, pdata]) => {
            const items = Object.entries(pdata.items || {}).reduce((acc, [iid, idata]) => {
                const mode = (idata.allocations && idata.allocations[0]?.mode) || 'percentage';
                acc[iid] = {
                    item_name: idata.item_name,
                    mode,
                    allocations: (idata.allocations || []).map(a => ({ provider_id: a.provider_id, value: a.value }))
                };
                return acc;
            }, {});
            return [pid, { product_name: pdata.product_name, items }];
        }));

        // 3) Compare
        await this.runComparison();
    }

    async runComparison() {
        const response = await fetch('/api/optimization/compare', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                product_quantities: this.quantities,
                optimized_allocations: this.optimizedAllocations
            })
        });
        if (!response.ok) throw new Error('Comparison failed');
        const data = await response.json();
        this.optimizedResult = data.optimized;
        this.delta = data.delta;
    }

    render() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        const deltaClass = this.delta.amount < 0 ? 'text-green-600' : 'text-red-600';
        const deltaIcon = this.delta.amount < 0 ? '↓' : '↑';
        const borderClass = this.delta.amount < 0 ? 'border-green-500' : 'border-red-500';

        container.innerHTML = `
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <!-- Base Column (Read Only) -->
                <div class="bg-card rounded-lg border border-border p-6 opacity-75">
                    <div class="flex items-center justify-between mb-4">
                        <h2 class="text-xl font-semibold text-muted-foreground">Current State</h2>
                        <span class="text-xs bg-secondary px-2 py-1 rounded text-muted-foreground">Read Only</span>
                    </div>
                    
                    <div class="mb-6">
                        <div class="text-sm text-muted-foreground mb-1">Total Cost</div>
                        <div class="text-3xl font-bold text-slate-700">${this.formatCurrency(this.currentResult.total_cost)}</div>
                    </div>
                    
                    <div class="space-y-4 mb-6 max-h-[600px] overflow-y-auto pr-2">
                        ${this.renderBaseHierarchy(this.currentResult)}
                    </div>
                    
                    <div class="pt-4 border-t border-border">
                        <div class="text-sm font-medium text-muted-foreground mb-2">Providers Used</div>
                        ${this.renderProviderBadges(this.currentResult)}
                    </div>
                </div>
                
                <!-- Simulator Column (Editable) -->
                <div class="bg-card rounded-lg border-2 ${borderClass} p-6 shadow-lg">
                    <div class="flex items-center justify-between mb-4">
                        <h2 class="text-xl font-semibold text-slate-900">Simulator</h2>
                        <span class="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-100">Interactive</span>
                    </div>
                    
                    <div class="mb-6 bg-slate-50 p-4 rounded-lg border border-slate-100">
                        <div class="flex justify-between items-end">
                            <div>
                                <div class="text-sm text-muted-foreground mb-1">Simulated Cost</div>
                                <div class="text-3xl font-bold text-slate-900" id="optimizedCost">${this.formatCurrency(this.optimizedResult.total_cost)}</div>
                            </div>
                            <div class="text-right">
                                <div class="text-sm text-muted-foreground mb-1">Impact</div>
                                <div class="${deltaClass} text-lg font-bold flex items-center gap-1">
                                    ${deltaIcon} ${this.formatCurrency(Math.abs(this.delta.amount))} 
                                    <span class="text-sm font-normal opacity-80">(${this.delta.percent > 0 ? '+' : ''}${this.delta.percent.toFixed(1)}%)</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="space-y-4 mb-6 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                        ${this.renderOptimizedHierarchy()}
                    </div>
                    
                    <div class="pt-4 border-t border-border">
                        <div class="text-sm font-medium text-muted-foreground mb-2">Providers Used</div>
                        <div id="optimizedProviders">
                            ${this.renderProviderBadges(this.optimizedResult)}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderBaseHierarchy(result) {
        const details = result.allocation_details || {};
        if (Object.keys(details).length === 0) return '<div class="text-sm text-muted-foreground">No products configured</div>';

        return Object.entries(details).map(([productId, pdata]) => {
            const items = pdata.items || {};
            const rows = Object.entries(items).map(([itemId, idata]) => {
                const allocs = idata.allocations || [];
                const mode = allocs.length ? (allocs[0].mode || 'percentage') : 'percentage';
                const providers = allocs.map(a => `
                    <div class="flex justify-between items-center text-xs mb-1">
                        <span class="text-slate-600">${a.provider_name}</span>
                        <span class="font-medium">${mode === 'percentage' ? a.value + '%' : a.value.toLocaleString()}</span>
                    </div>`).join('');
                return `
                    <div class="ml-4 pl-4 border-l-2 border-slate-100 py-1">
                        <div class="text-xs font-semibold text-slate-700 mb-1">${idata.item_name}</div>
                        <div class="bg-slate-50 rounded p-2">
                            ${providers || '<span class="text-xs text-muted-foreground">No allocation</span>'}
                        </div>
                    </div>
                `;
            }).join('');
            return `
                <div class="mb-4">
                    <div class="flex items-center gap-2 mb-2">
                        <div class="w-2 h-2 rounded-full bg-slate-300"></div>
                        <div class="text-sm font-bold text-slate-800">${pdata.product_name}</div>
                    </div>
                    ${rows}
                </div>
            `;
        }).join('');
    }

    renderOptimizedHierarchy() {
        // Build editor inputs
        const sections = Object.entries(this.optimizedAllocations || {}).map(([productId, pdata]) => {
            const items = (pdata && pdata.items) || {};
            const rows = Object.entries(items).map(([itemId, idata]) => {
                const mode = idata.mode || 'percentage';
                const inputs = (idata.allocations || []).map((a, idx) => {
                    const prov = this.providers.find(p => p.provider_id === a.provider_id);
                    const name = prov ? prov.company_name : `Provider ${a.provider_id}`;
                    return `
                        <div class="flex items-center gap-2 mb-2">
                            <span class="text-xs w-32 truncate text-slate-600" title="${name}">${name}</span>
                            <div class="flex-1 flex items-center gap-2">
                                <input type="range" min="0" max="${mode === 'percentage' ? 100 : 100000}" step="${mode === 'percentage' ? 1 : 100}" 
                                    value="${a.value}" 
                                    class="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#023047]"
                                    oninput="this.nextElementSibling.value = this.value"
                                    data-product-id="${productId}" data-item-id="${itemId}" data-provider-id="${a.provider_id}" data-mode="${mode}"
                                >
                                <input type="number" min="0" step="${mode === 'percentage' ? '1' : '100'}" value="${a.value}" 
                                    class="w-16 px-1 py-0.5 border border-slate-200 rounded text-xs text-center font-medium"
                                    onchange="this.previousElementSibling.value = this.value; this.previousElementSibling.dispatchEvent(new Event('change', {bubbles: true}))"
                                >
                                <span class="text-[10px] text-slate-400 w-4">${mode === 'percentage' ? '%' : '#'}</span>
                            </div>
                        </div>
                    `;
                }).join('');
                return `
                    <div class="ml-4 pl-4 border-l-2 border-[#023047]/10 py-2">
                        <div class="text-xs font-bold text-slate-700 mb-2 flex justify-between">
                            <span>${idata.item_name}</span>
                            <span class="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase">${mode}</span>
                        </div>
                        <div class="bg-white border border-slate-100 rounded-md p-3 shadow-sm">
                            ${inputs || '<span class="text-xs text-muted-foreground">No providers</span>'}
                        </div>
                    </div>
                `;
            }).join('');
            return `
                <div class="mb-4">
                    <div class="flex items-center gap-2 mb-2">
                        <div class="w-2 h-2 rounded-full bg-[#023047]"></div>
                        <div class="text-sm font-bold text-slate-800">${pdata.product_name}</div>
                    </div>
                    ${rows}
                </div>
            `;
        }).join('');
        return sections || '<div class="text-sm text-muted-foreground">No allocations to edit</div>';
    }

    renderProviderBadges(result) {
        const usedProviders = Object.keys(result.provider_breakdown);
        if (usedProviders.length === 0) return '<div class="text-sm text-muted-foreground">No providers used</div>';
        
        return usedProviders.map(providerName => {
            const providerData = result.provider_breakdown[providerName];
            const tier = providerData.tier_info.effective_tier;
            
            // Color logic for tiers
            let color = 'bg-slate-100 text-slate-600';
            if (tier === 1) color = 'bg-emerald-100 text-emerald-700 border-emerald-200';
            if (tier === 2) color = 'bg-blue-100 text-blue-700 border-blue-200';
            if (tier === 3) color = 'bg-orange-100 text-orange-700 border-orange-200';
            if (tier >= 4) color = 'bg-red-100 text-red-700 border-red-200';

            return `
                <div class="inline-flex items-center gap-2 px-2.5 py-1.5 bg-white border border-slate-200 rounded-md mb-2 mr-2 shadow-sm">
                    <span class="text-xs font-semibold text-slate-700">${providerName}</span>
                    <span class="px-1.5 py-0.5 ${color} border text-[10px] font-bold rounded">T${tier}</span>
                </div>
            `;
        }).join('');
    }

    setupEventHandlers() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        // Use event delegation for better performance with many inputs
        container.addEventListener('change', async (e) => {
            if (e.target.matches('input[type="range"]') || e.target.matches('input[data-item-id]')) {
                const input = e.target.matches('input[type="range"]') ? e.target : e.target.previousElementSibling; // Handle number input sync
                if (!input) return; 

                const productId = input.dataset.productId;
                const itemId = input.dataset.itemId;
                const providerId = parseInt(input.dataset.providerId);
                const mode = input.dataset.mode;
                const value = parseFloat(e.target.value) || 0;

                // Update model
                if (this.optimizedAllocations[productId]?.items[itemId]) {
                    const itemAlloc = this.optimizedAllocations[productId].items[itemId];
                    const alloc = itemAlloc.allocations.find(a => a.provider_id === providerId);
                    if (alloc) alloc.value = value;
                }

                // Recalculate
                await this.runComparison();
                this.updateOptimizedDisplay();
            }
        });
    }

    updateOptimizedDisplay() {
        const container = document.getElementById(this.containerId);
        const costEl = container.querySelector('#optimizedCost');
        const impactEl = costEl.parentElement.nextElementSibling.querySelector('div'); // Impact value div
        const providersEl = container.querySelector('#optimizedProviders');
        const simulatorCard = container.querySelector('.bg-card.border-2'); // The simulator card

        if (costEl) costEl.textContent = this.formatCurrency(this.optimizedResult.total_cost);
        
        if (impactEl) {
            const deltaClass = this.delta.amount < 0 ? 'text-green-600' : 'text-red-600';
            const deltaIcon = this.delta.amount < 0 ? '↓' : '↑';
            impactEl.className = `${deltaClass} text-lg font-bold flex items-center gap-1`;
            impactEl.innerHTML = `${deltaIcon} ${this.formatCurrency(Math.abs(this.delta.amount))} <span class="text-sm font-normal opacity-80">(${this.delta.percent > 0 ? '+' : ''}${this.delta.percent.toFixed(1)}%)</span>`;
        }

        if (providersEl) providersEl.innerHTML = this.renderProviderBadges(this.optimizedResult);

        // Update border color
        if (simulatorCard) {
            simulatorCard.classList.remove('border-green-500', 'border-red-500');
            simulatorCard.classList.add(this.delta.amount < 0 ? 'border-green-500' : 'border-red-500');
        }
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    }
}
