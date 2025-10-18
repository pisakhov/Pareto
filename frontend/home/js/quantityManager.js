/**
 * Quantity Manager - Manages product quantity inputs
 */
const quantityManager = {
    products: [],
    quantities: {},
    providers: [],

    async loadProducts() {
        try {
            const [productsResponse, providersResponse] = await Promise.all([
                fetch('/api/products'),
                fetch('/api/providers')
            ]);
            
            if (!productsResponse.ok) throw new Error('Failed to load products');
            if (!providersResponse.ok) throw new Error('Failed to load providers');
            
            this.products = await productsResponse.json();
            this.providers = await providersResponse.json();
            
            // Initialize quantities with proxy_quantity values
            this.products.forEach(product => {
                this.quantities[product.product_id] = product.proxy_quantity || 0;
            });
            
            this.renderQuantityInputs();
            await this.updateTierSummary();
        } catch (error) {
            console.error('Error loading products:', error);
            document.getElementById('productQuantities').innerHTML = 
                '<p class="text-red-600 col-span-full text-center py-8">Failed to load products</p>';
        }
    },

    renderQuantityInputs() {
        const container = document.getElementById('productQuantities');
        if (!this.products.length) {
            container.innerHTML = '<p class="text-muted-foreground col-span-full text-center py-8">No products available</p>';
            return;
        }

        container.innerHTML = this.products.map(product => {
            const hasProxyQty = product.proxy_quantity > 0;
            return `
                <div class="border border-border rounded-lg p-4 hover:border-blue-500 transition-colors ${hasProxyQty ? 'bg-blue-50/50 dark:bg-blue-950/10' : ''}">
                    <div class="flex items-center justify-between mb-2">
                        <label class="block text-sm font-medium">${this.escapeHtml(product.name)}</label>
                        ${hasProxyQty ? '<span class="text-xs text-blue-600 font-medium">From Config</span>' : ''}
                    </div>
                    <input type="number" 
                           min="0" 
                           value="${this.quantities[product.product_id] || 0}"
                           placeholder="0"
                           onchange="quantityManager.updateQuantity(${product.product_id}, this.value)"
                           class="w-full px-3 py-2 border border-input rounded-md focus:ring-2 focus:ring-ring">
                    <div class="flex items-center justify-between mt-2">
                        <p class="text-xs text-muted-foreground">${product.item_ids.length} items</p>
                        <span class="text-xs font-medium text-blue-600">${(this.quantities[product.product_id] || 0).toLocaleString()} files</span>
                    </div>
                </div>
            `;
        }).join('');
    },

    async updateQuantity(productId, value) {
        const quantity = parseInt(value) || 0;
        this.quantities[productId] = quantity;
        await this.updateTierSummary();
    },

    async updateTierSummary() {
        const totalFiles = Object.values(this.quantities).reduce((sum, qty) => sum + (qty || 0), 0);
        const tierSummaryEl = document.getElementById('tierSummary');
        
        if (!tierSummaryEl) return;
        
        // Fetch tier thresholds for all providers
        const providerTiers = await Promise.all(
            this.providers.map(async (provider) => {
                try {
                    const response = await fetch(`/api/providers/${provider.provider_id}/tier-thresholds`);
                    const tierData = await response.json();
                    return { provider, tierData };
                } catch (error) {
                    console.error(`Error fetching tiers for provider ${provider.provider_id}:`, error);
                    return { provider, tierData: { thresholds: {}, base_prices: {} } };
                }
            })
        );
        
        // Calculate tier for each provider
        const tierInfo = providerTiers.map(({ provider, tierData }) => {
            const thresholds = tierData.thresholds || {};
            const basePrices = tierData.base_prices || {};
            
            const sortedTiers = Object.entries(thresholds)
                .map(([tier, threshold]) => ({ tier: parseInt(tier), threshold: parseInt(threshold) }))
                .sort((a, b) => b.threshold - a.threshold);
            
            let currentTier = 1;
            for (const { tier, threshold } of sortedTiers) {
                if (totalFiles >= threshold) {
                    currentTier = tier;
                    break;
                }
            }
            
            const basePrice = basePrices[currentTier] || 0;
            
            return {
                providerName: provider.company_name,
                currentTier,
                totalFiles,
                basePrice,
                thresholds: sortedTiers
            };
        });
        
        tierSummaryEl.innerHTML = `
            <div class="flex items-center justify-between mb-2">
                <h3 class="text-lg font-semibold">Current Tier Status</h3>
                <div class="text-sm">
                    <span class="text-muted-foreground">Total Files:</span>
                    <span class="font-bold text-blue-600 ml-2">${totalFiles.toLocaleString()}</span>
                </div>
            </div>
            <p class="text-xs text-muted-foreground mb-4">Based on aggregated proxy quantities across all products</p>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                ${tierInfo.map(info => `
                    <div class="border border-border rounded-lg p-3 bg-secondary/20">
                        <div class="font-medium text-sm mb-1">${this.escapeHtml(info.providerName)}</div>
                        <div class="flex items-center justify-between">
                            <span class="text-xs text-muted-foreground">Tier</span>
                            <span class="font-bold text-lg text-blue-600">T${info.currentTier}</span>
                        </div>
                        ${info.basePrice > 0 ? `
                            <div class="flex items-center justify-between mt-1">
                                <span class="text-xs text-muted-foreground">Base</span>
                                <span class="text-xs font-semibold text-green-600">$${info.basePrice.toFixed(2)}</span>
                            </div>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
        `;
    },

    getQuantities() {
        return Object.fromEntries(
            Object.entries(this.quantities).filter(([_, qty]) => qty > 0)
        );
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

window.quantityManager = quantityManager;
