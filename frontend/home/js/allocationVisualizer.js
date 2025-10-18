/**
 * Allocation Visualizer - Renders provider breakdown with stacked bars
 */
const allocationVisualizer = {
    renderProviderBreakdown(providerBreakdown) {
        const container = document.getElementById('providerBreakdown');
        if (!providerBreakdown || Object.keys(providerBreakdown).length === 0) {
            container.innerHTML = '<p class="text-muted-foreground text-center py-8">No allocations found</p>';
            return;
        }

        const html = Object.entries(providerBreakdown).map(([providerName, data]) => {
            return this.createProviderCard(providerName, data);
        }).join('');

        container.innerHTML = html;
    },

    createProviderCard(providerName, data) {
        const totalCost = data.total_cost.toFixed(2);
        const totalCreditFiles = data.total_units;
        const tierInfo = data.tier_info || {};
        
        const tierBadge = tierInfo.effective_tier ? 
            `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                Tier ${tierInfo.effective_tier}
            </span>` : '';

        let itemsHtml = '';
        for (const [itemName, allocations] of Object.entries(data.items)) {
            itemsHtml += `
                <div class="mt-4">
                    <div class="flex items-center justify-between mb-2">
                        <h4 class="text-sm font-medium">${this.escapeHtml(itemName)}</h4>
                    </div>
                    <div class="space-y-2">
                        ${allocations.map(alloc => this.createAllocationBar(alloc)).join('')}
                    </div>
                </div>
            `;
        }

        return `
            <div class="bg-card border border-border rounded-lg p-6">
                <div class="flex items-center justify-between mb-4">
                    <div>
                        <h3 class="text-lg font-semibold">${this.escapeHtml(providerName)}</h3>
                        ${tierBadge}
                    </div>
                    <div class="text-right">
                        <div class="text-2xl font-bold text-foreground">$${totalCost}</div>
                        <div class="text-sm text-muted-foreground">${totalCreditFiles} credit files</div>
                    </div>
                </div>
                ${itemsHtml}
            </div>
        `;
    },

    createAllocationBar(alloc) {
        const isLocked = alloc.locked;
        const barClass = isLocked ? 'bg-[#023047]' : 'bg-secondary';
        const lockIcon = isLocked ? '🔒 ' : '';
        const creditFiles = alloc.credit_files || alloc.quantity || 0;
        const tier = alloc.tier || 1;
        
        return `
            <div class="bg-secondary/20 rounded p-3">
                <div class="flex items-center justify-between text-sm mb-2">
                    <span class="font-medium">${lockIcon}${this.escapeHtml(alloc.product_name)}</span>
                    <span class="text-muted-foreground">${creditFiles} files × $${alloc.unit_price.toFixed(2)} (Tier ${tier})</span>
                </div>
                <div class="w-full bg-muted rounded-full h-2">
                    <div class="${barClass} h-2 rounded-full" style="width: 100%"></div>
                </div>
                <div class="flex items-center justify-between text-xs mt-1">
                    <span class="text-muted-foreground">
                        ${isLocked ? 'Locked allocation' : 'Flexible'}
                        ${alloc.multiplier !== 1 ? ` • ${alloc.multiplier}x multiplier` : ''}
                    </span>
                    <span class="font-semibold">$${alloc.cost.toFixed(2)}</span>
                </div>
            </div>
        `;
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

window.allocationVisualizer = allocationVisualizer;
console.log('✓ allocationVisualizer loaded and assigned to window');
