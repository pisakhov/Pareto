/**
 * Comparison View - Two-column Current vs Optimized comparison
 */
class ComparisonView {
    constructor() {
        this.currentAllocations = {};
        this.optimizedAllocations = {};
        this.quantities = {};
        this.items = [];
        this.providers = [];
        this.itemProvidersMap = {};
        this.currentResult = null;
        this.optimizedResult = null;
    }

    async init() {
        await this.loadProductsAndQuantities();
        await this.loadItemsAndProviders();
        await this.loadItemProviders();
        await this.loadCurrentAllocations();
        await this.calculate();
        this.render();
        this.setupEventHandlers();
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
        // Build item -> providers map using bulk endpoint
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
        // Do not initialize here; we'll mirror base allocations after first compare
        this.optimizedAllocations = {};
    }

    async calculate() {
        // Initialize optimized allocations from base if empty
        if (!this.optimizedAllocations || Object.keys(this.optimizedAllocations).length === 0) {
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
        }

        const response = await fetch('/api/optimization/compare', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                product_quantities: this.quantities,
                optimized_allocations: this.optimizedAllocations
            })
        });

        if (!response.ok) throw new Error('Calculation failed');

        const data = await response.json();
        this.currentResult = data.current;
        this.optimizedResult = data.optimized;
        this.delta = data.delta;
        this.currentAllocations = data.current.allocations;
        
        // Initialize optimized allocations with base if missing
        Object.keys(this.currentAllocations).forEach(itemIdStr => {
            const itemId = parseInt(itemIdStr);
            if (!this.optimizedAllocations[itemId]) {
                this.optimizedAllocations[itemId] = this.currentAllocations[itemId];
            }
        });
        
        // If optimized result is empty, recalc once with initialized allocations
        if (!Object.keys(this.optimizedResult.provider_breakdown || {}).length) {
            const response2 = await fetch('/api/optimization/compare', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    product_quantities: this.quantities,
                    optimized_allocations: this.optimizedAllocations
                })
            });
            if (response2.ok) {
                const data2 = await response2.json();
                this.optimizedResult = data2.optimized;
                this.delta = data2.delta;
            }
        }
    }

    render() {
        const container = document.getElementById('comparisonContainer');
        if (!container) return;

        const deltaClass = this.delta.amount < 0 ? 'text-green-600' : 'text-red-600';
        const deltaIcon = this.delta.amount < 0 ? '↓' : '↑';
        const borderClass = this.delta.amount < 0 ? 'border-green-500' : 'border-red-500';

        container.innerHTML = `
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <!-- Base Column -->
                <div class="bg-card rounded-lg border border-border p-6 opacity-75">
                    <h2 class="text-xl font-semibold mb-4 text-muted-foreground">Base Strategy</h2>
                    
                    <div class="mb-6">
                        <div class="text-sm text-muted-foreground mb-1">Total Cost</div>
                        <div class="text-3xl font-bold">${this.formatCurrency(this.currentResult.total_cost)}</div>
                    </div>
                    
                    <div class="space-y-2 mb-6">
                        <div class="text-sm font-medium text-muted-foreground mb-2">Allocations</div>
                        ${this.renderBaseHierarchy(this.currentResult)}
                    </div>
                    
                    <div class="pt-4 border-t border-border">
                        <div class="text-sm font-medium text-muted-foreground mb-2">Providers Used</div>
                        ${this.renderProviderBadges(this.currentResult)}
                    </div>
                    ${this.renderProductBreakdown(this.currentResult)}
                </div>
                
                <!-- Optimized Column -->
                <div class="bg-card rounded-lg border-2 ${borderClass} p-6">
                    <div class="flex items-center justify-between mb-4">
                        <h2 class="text-xl font-semibold">Optimized Strategy</h2>
                    </div>
                    
                    <div class="mb-6">
                        <div class="text-sm text-muted-foreground mb-1">Total Cost</div>
                        <div class="text-3xl font-bold" id="optimizedCost">${this.formatCurrency(this.optimizedResult.total_cost)}</div>
                        <div class="${deltaClass} text-sm font-medium">
                            ${deltaIcon} $${Math.abs(this.delta.amount).toLocaleString()} (${this.delta.percent > 0 ? '+' : ''}${this.delta.percent.toFixed(1)}%)
                        </div>
                    </div>
                    
                    <div class="space-y-2 mb-6">
                        <div class="text-sm font-medium text-muted-foreground mb-2">Allocations</div>
                        ${this.renderOptimizedHierarchy()}
                    </div>
                    
                    <div class="pt-4 border-t border-border">
                        <div class="text-sm font-medium text-muted-foreground mb-2">Providers Used</div>
                        <div id="optimizedProviders">
                            ${this.renderProviderBadges(this.optimizedResult)}
                        </div>
                    </div>
                    <div id="optimizedProductBreakdown">
                        ${this.renderProductBreakdown(this.optimizedResult)}
                    </div>
                </div>
            </div>
        `;
    }

    renderBaseHierarchy(result) {
        const details = result.allocation_details || {};
        const sections = Object.entries(details).map(([productId, pdata]) => {
            const items = pdata.items || {};
            const rows = Object.entries(items).map(([itemId, idata]) => {
                const allocs = idata.allocations || [];
                const mode = allocs.length ? (allocs[0].mode || 'percentage') : 'percentage';
                const providers = allocs.map(a => `<span class="inline-flex items-center gap-2 px-2 py-0.5 bg-secondary/20 rounded mr-2 mb-1">
                    <span class="text-xs">${a.provider_name}</span>
                    <span class="text-xs text-muted-foreground">${mode === 'percentage' ? a.value + '%' : a.value.toLocaleString()}</span>
                </span>`).join('');
                return `
                    <div class="py-1.5">
                        <div class="text-sm font-medium mb-1">${idata.item_name}</div>
                        <div>${providers || '<span class=\'text-xs text-muted-foreground\'>No providers</span>'}</div>
                    </div>
                `;
            }).join('');
            return `
                <div class="mb-3">
                    <div class="text-sm font-semibold">${pdata.product_name}</div>
                    <div class="ml-2">
                        ${rows}
                    </div>
                </div>
            `;
        }).join('');
        return sections || '<div class="text-sm text-muted-foreground">No allocation details</div>';
    }

    renderOptimizedHierarchy() {
        // Build editor from this.optimizedAllocations (nested)
        const sections = Object.entries(this.optimizedAllocations || {}).map(([productId, pdata]) => {
            const items = (pdata && pdata.items) || {};
            const rows = Object.entries(items).map(([itemId, idata]) => {
                const mode = idata.mode || 'percentage';
                const inputs = (idata.allocations || []).map((a, idx) => {
                    const prov = this.providers.find(p => p.provider_id === a.provider_id);
                    const name = prov ? prov.company_name : `Provider ${a.provider_id}`;
                    return `
                        <div class="flex items-center gap-2 mb-1">
                            <span class="text-xs w-40 truncate">${name}</span>
                            <input type="number" min="0" step="${mode === 'percentage' ? '1' : '1000'}" value="${a.value}" 
                                class="w-24 px-2 py-1 border border-input rounded text-sm"
                                data-product-id="${productId}" data-item-id="${itemId}" data-provider-id="${a.provider_id}" data-mode="${mode}">
                            <span class="text-xs text-muted-foreground">${mode === 'percentage' ? '%' : 'files'}</span>
                        </div>
                    `;
                }).join('');
                return `
                    <div class="py-1.5">
                        <div class="text-sm font-medium mb-1">${idata.item_name}</div>
                        <div>${inputs || '<span class=\'text-xs text-muted-foreground\'>No providers</span>'}</div>
                    </div>
                `;
            }).join('');
            return `
                <div class="mb-3">
                    <div class="text-sm font-semibold">${pdata.product_name}</div>
                    <div class="ml-2">
                        ${rows}
                    </div>
                </div>
            `;
        }).join('');
        return sections || '<div class="text-sm text-muted-foreground">No allocations</div>';
    }

    renderCurrentAllocations() {
        return this.items.map(item => {
            const providerId = this.currentAllocations[item.item_id];
            const provider = this.providers.find(p => p.provider_id === providerId);
            const providerName = provider ? provider.company_name : 'Not assigned';
            
            return `
                <div class="flex items-center justify-between py-1.5">
                    <span class="text-sm font-medium">${item.item_name}</span>
                    <div class="px-3 py-1 bg-secondary/20 rounded text-sm">
                        ${providerName}
                    </div>
                </div>
            `;
        }).join('');
    }

    renderOptimizedAllocations() {
        return this.items.map(item => {
            const providerIds = this.itemProvidersMap[item.item_id] || [];
            let itemProviders = this.providers.filter(p => providerIds.includes(p.provider_id));
            
            if (itemProviders.length === 0) {
                itemProviders = this.providers; // fallback to all
            }
            
            const currentSelection = this.optimizedAllocations[item.item_id];
            
            return `
                <div class="flex items-center justify-between py-1.5">
                    <span class="text-sm font-medium">${item.item_name}</span>
                    <select 
                        class="provider-dropdown px-3 py-1 border border-border rounded text-sm bg-background focus:ring-2 focus:ring-ring focus:outline-none"
                        data-item-id="${item.item_id}">
                        ${itemProviders.map(p => `
                            <option value="${p.provider_id}" ${p.provider_id === currentSelection ? 'selected' : ''}>
                                ${p.company_name}
                            </option>
                        `).join('')}
                    </select>
                </div>
            `;
        }).join('');
    }

    renderProductBreakdown(result) {
        const products = result.product_breakdown || {};
        if (!Object.keys(products).length) return '';
        return `
            <div class="mt-6 pt-4 border-t border-border">
                <div class="text-sm font-medium text-muted-foreground mb-2">Products</div>
                <div class="space-y-1">
                    ${Object.values(products).map(p => `
                        <div class="flex items-center justify-between text-sm">
                            <span class="text-muted-foreground">${p.product_name}</span>
                            <span class="font-medium">${this.formatCurrency(p.cost)}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    renderProviderBadges(result) {
        const usedProviders = Object.keys(result.provider_breakdown);
        
        if (usedProviders.length === 0) {
            return '<div class="text-sm text-muted-foreground">No providers used</div>';
        }
        
        return usedProviders.map(providerName => {
            const providerData = result.provider_breakdown[providerName];
            const tier = providerData.tier_info.effective_tier;
            const tierColors = {
                1: 'bg-red-500',
                2: 'bg-orange-500',
                3: 'bg-yellow-500',
                4: 'bg-blue-500',
                5: 'bg-green-500'
            };
            const colorClass = tierColors[tier] || 'bg-gray-500';
            
            return `
                <div class="inline-flex items-center gap-2 px-3 py-1.5 bg-secondary/20 rounded mb-2 mr-2">
                    <span class="text-sm font-medium">${providerName}</span>
                    <span class="px-2 py-0.5 ${colorClass} text-white text-xs rounded">T${tier}</span>
                </div>
            `;
        }).join('');
    }

    setupEventHandlers() {
        // Inputs in optimized hierarchy
        document.querySelectorAll('input[data-item-id][data-provider-id]').forEach(input => {
            input.addEventListener('change', async (e) => {
                const productId = e.target.dataset.productId;
                const itemId = e.target.dataset.itemId;
                const providerId = parseInt(e.target.dataset.providerId);
                const mode = e.target.dataset.mode;
                const value = parseFloat(e.target.value) || 0;
                if (!this.optimizedAllocations[productId]) this.optimizedAllocations[productId] = { items: {} };
                if (!this.optimizedAllocations[productId].items[itemId]) this.optimizedAllocations[productId].items[itemId] = { mode, allocations: [] };
                const itemAlloc = this.optimizedAllocations[productId].items[itemId];
                itemAlloc.mode = mode;
                const idx = itemAlloc.allocations.findIndex(a => a.provider_id === providerId);
                if (idx >= 0) itemAlloc.allocations[idx].value = value; else itemAlloc.allocations.push({ provider_id: providerId, value });
                await this.recalculate();
            });
        });
        const dropdowns = document.querySelectorAll('.provider-dropdown');
        dropdowns.forEach(dropdown => {
            dropdown.addEventListener('change', async (e) => {
                const itemId = parseInt(e.target.dataset.itemId);
                const providerId = parseInt(e.target.value);
                
                this.optimizedAllocations[itemId] = providerId;
                await this.recalculate();
            });
        });
    }

    async recalculate() {
        const optimizedCost = document.getElementById('optimizedCost');
        if (optimizedCost) {
            optimizedCost.innerHTML = '<span class="animate-pulse">Calculating...</span>';
        }

        try {
            await this.calculate();
            this.updateOptimizedDisplay();
        } catch (error) {
            console.error('Recalculation failed:', error);
            if (optimizedCost) {
                optimizedCost.textContent = 'Error';
            }
        }
    }

    updateOptimizedDisplay() {
        const optimizedCost = document.getElementById('optimizedCost');
        const optimizedProviders = document.getElementById('optimizedProviders');
        const optimizedProductBreakdown = document.getElementById('optimizedProductBreakdown');
        const container = document.getElementById('comparisonContainer');
        
        if (optimizedCost) {
            optimizedCost.textContent = this.formatCurrency(this.optimizedResult.total_cost);
        }
        
        if (optimizedProviders) {
            optimizedProviders.innerHTML = this.renderProviderBadges(this.optimizedResult);
        }
        if (optimizedProductBreakdown) {
            optimizedProductBreakdown.innerHTML = this.renderProductBreakdown(this.optimizedResult);
        }
        
        const deltaClass = this.delta.amount < 0 ? 'text-green-600' : 'text-red-600';
        const deltaIcon = this.delta.amount < 0 ? '↓' : '↑';
        const borderClass = this.delta.amount < 0 ? 'border-green-500' : 'border-red-500';
        
        const optimizedCard = container.querySelector('.lg\\:grid-cols-2 > div:last-child');
        if (optimizedCard) {
            optimizedCard.className = `bg-card rounded-lg border-2 ${borderClass} p-6`;
        }
        
        const deltaDisplay = optimizedCost.nextElementSibling;
        if (deltaDisplay) {
            deltaDisplay.className = `${deltaClass} text-sm font-medium`;
            deltaDisplay.innerHTML = `
                ${deltaIcon} $${Math.abs(this.delta.amount).toLocaleString()} (${this.delta.percent > 0 ? '+' : ''}${this.delta.percent.toFixed(1)}%)
            `;
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

    show() {
        const container = document.getElementById('comparisonContainer');
        const emptyState = document.getElementById('emptyState');
        
        if (container) container.classList.remove('hidden');
        if (emptyState) emptyState.classList.add('hidden');
    }

    hide() {
        const container = document.getElementById('comparisonContainer');
        const emptyState = document.getElementById('emptyState');
        
        if (container) container.classList.add('hidden');
        if (emptyState) emptyState.classList.remove('hidden');
    }
}

window.comparisonView = new ComparisonView();
