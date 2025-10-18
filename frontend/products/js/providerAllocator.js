/**
 * Provider Allocator - Manages provider allocation UI and state per item
 */
const providerAllocator = {
    allocations: {},

    renderAllocationPanels(selectedItemsWithProviders) {
        const container = document.getElementById('providerAllocationContainer');
        if (!container) return;

        if (!selectedItemsWithProviders || selectedItemsWithProviders.length === 0) {
            container.innerHTML = '<p class="text-sm text-muted-foreground text-center py-8">Select items above to configure provider allocations</p>';
            this.allocations = {};
            return;
        }

        container.innerHTML = '';
        selectedItemsWithProviders.forEach(item => {
            if (!this.allocations[item.id]) {
                this.allocations[item.id] = {
                    mode: 'percentage',
                    locked: false,
                    lockedProviderId: null,
                    providers: item.providers.map(p => ({ provider_id: p.provider_id, provider_name: p.company_name, value: 0 }))
                };
            } else {
                this.allocations[item.id].providers = item.providers.map(p => {
                    const existing = this.allocations[item.id].providers.find(ep => ep.provider_id === p.provider_id);
                    return existing || { provider_id: p.provider_id, provider_name: p.company_name, value: 0 };
                });
            }
            const panel = this.createItemPanel(item);
            container.appendChild(panel);
        });
    },

    createItemPanel(item) {
        const panel = document.createElement('div');
        panel.className = 'border border-border rounded-lg p-4';
        panel.id = `allocation-panel-${item.id}`;

        const allocation = this.allocations[item.id];
        const total = this.calculateTotal(item.id);
        const isValid = allocation.mode === 'percentage' ? total === 100 : true;

        panel.innerHTML = `
            <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2">
                    <h4 class="font-semibold text-foreground">${this.escapeHtml(item.name)}</h4>
                    <span class="px-2 py-0.5 text-xs rounded-full bg-secondary text-secondary-foreground">
                        ${item.providers.length} ${item.providers.length === 1 ? 'provider' : 'providers'}
                    </span>
                </div>
                <div role="radiogroup" class="flex gap-2 text-sm">
                    <label class="flex items-center gap-1 cursor-pointer">
                        <input type="radio" name="mode-${item.id}" value="percentage" 
                               ${allocation.mode === 'percentage' ? 'checked' : ''}
                               onchange="providerAllocator.handleModeToggle(${item.id}, 'percentage')"
                               class="focus:ring-2 focus:ring-ring">
                        <span>Percentage</span>
                    </label>
                    <label class="flex items-center gap-1 cursor-pointer">
                        <input type="radio" name="mode-${item.id}" value="units"
                               ${allocation.mode === 'units' ? 'checked' : ''}
                               onchange="providerAllocator.handleModeToggle(${item.id}, 'units')"
                               class="focus:ring-2 focus:ring-ring">
                        <span>Units</span>
                    </label>
                </div>
            </div>
            
            ${allocation.locked ? `
                <div class="mb-3 px-3 py-2 rounded-md bg-amber-50 border border-amber-200 text-amber-900 text-sm flex items-center gap-2">
                    <span>🔒</span>
                    <span><strong>Non-negotiable constraint:</strong> Locked to ${this.getProviderName(item.id, allocation.lockedProviderId)}</span>
                </div>
            ` : ''}
            
            <div class="overflow-x-auto">
                <table class="w-full text-sm">
                    <thead class="border-b border-border">
                        <tr>
                            <th class="text-left py-2 font-medium text-muted-foreground">Provider</th>
                            <th class="text-left py-2 font-medium text-muted-foreground">Allocation</th>
                            <th class="text-right py-2 font-medium text-muted-foreground">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${allocation.providers.map(provider => this.createProviderRow(item.id, provider, allocation)).join('')}
                    </tbody>
                </table>
            </div>
            
            ${allocation.mode === 'percentage' ? `
                <div class="mt-3 pt-3 border-t border-border flex items-center justify-between">
                    <span class="font-medium">Total:</span>
                    <span class="flex items-center gap-2">
                        <span class="font-semibold">${total}%</span>
                        ${isValid ? '<span class="text-green-600">✓</span>' : (total < 100 ? '<span class="text-yellow-600">⚠️</span>' : '<span class="text-red-600">❌</span>')}
                    </span>
                </div>
            ` : `
                <div class="mt-3 pt-3 border-t border-border flex items-center justify-between">
                    <span class="font-medium">Total:</span>
                    <span class="font-semibold">${total} units</span>
                </div>
            `}
        `;

        return panel;
    },

    createProviderRow(itemId, provider, allocation) {
        const isLocked = allocation.locked && allocation.lockedProviderId === provider.provider_id;
        const isDisabled = allocation.locked && !isLocked;
        const suffix = allocation.mode === 'percentage' ? '%' : 'units';

        return `
            <tr class="${isDisabled ? 'opacity-50' : ''}">
                <td class="py-2">${this.escapeHtml(provider.provider_name)}</td>
                <td class="py-2">
                    <input type="number" 
                           value="${provider.value}" 
                           min="0" 
                           max="${allocation.mode === 'percentage' ? '100' : ''}"
                           ${isDisabled ? 'disabled' : ''}
                           onchange="providerAllocator.handleAllocationChange(${itemId}, ${provider.provider_id}, this.value)"
                           class="w-24 px-2 py-1 border border-input rounded-md focus:ring-2 focus:ring-ring ${isDisabled ? 'bg-muted' : ''}">
                    <span class="ml-1 text-muted-foreground">${suffix}</span>
                </td>
                <td class="py-2 text-right">
                    ${isLocked ? `
                        <button type="button" 
                                onclick="providerAllocator.handleUnlock(${itemId})"
                                title="Unlock allocation"
                                class="px-3 py-1 text-sm rounded-md border border-input hover:bg-accent">
                            🔓 Unlock
                        </button>
                    ` : `
                        <button type="button" 
                                onclick="providerAllocator.handleLockProvider(${itemId}, ${provider.provider_id})"
                                title="Lock to this provider"
                                ${isDisabled ? 'disabled' : ''}
                                class="px-3 py-1 text-sm rounded-md border border-input hover:bg-accent ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}">
                            🔒 Lock
                        </button>
                    `}
                </td>
            </tr>
        `;
    },

    handleModeToggle(itemId, mode) {
        if (!this.allocations[itemId]) return;
        this.allocations[itemId].mode = mode;
        
        if (this.allocations[itemId].locked && mode === 'percentage') {
            const lockedProviderId = this.allocations[itemId].lockedProviderId;
            this.allocations[itemId].providers.forEach(p => {
                p.value = p.provider_id === lockedProviderId ? 100 : 0;
            });
        }
        
        this.rerenderPanel(itemId);
    },

    handleLockProvider(itemId, providerId) {
        if (!this.allocations[itemId]) return;
        
        this.allocations[itemId].locked = true;
        this.allocations[itemId].lockedProviderId = providerId;
        
        if (this.allocations[itemId].mode === 'percentage') {
            this.allocations[itemId].providers.forEach(p => {
                p.value = p.provider_id === providerId ? 100 : 0;
            });
        }
        
        this.rerenderPanel(itemId);
    },

    handleUnlock(itemId) {
        if (!this.allocations[itemId]) return;
        
        this.allocations[itemId].locked = false;
        this.allocations[itemId].lockedProviderId = null;
        
        this.rerenderPanel(itemId);
    },

    handleAllocationChange(itemId, providerId, value) {
        if (!this.allocations[itemId]) return;
        
        const numValue = parseFloat(value) || 0;
        const provider = this.allocations[itemId].providers.find(p => p.provider_id === providerId);
        
        if (provider) {
            provider.value = numValue;
        }
        
        this.rerenderPanel(itemId);
    },

    calculateTotal(itemId) {
        if (!this.allocations[itemId]) return 0;
        return this.allocations[itemId].providers.reduce((sum, p) => sum + p.value, 0);
    },

    getProviderName(itemId, providerId) {
        if (!this.allocations[itemId]) return '';
        const provider = this.allocations[itemId].providers.find(p => p.provider_id === providerId);
        return provider ? provider.provider_name : '';
    },

    rerenderPanel(itemId) {
        const panel = document.getElementById(`allocation-panel-${itemId}`);
        if (!panel) return;
        
        const item = {
            id: itemId,
            name: panel.querySelector('h4').textContent,
            providers: this.allocations[itemId].providers.map(p => ({
                provider_id: p.provider_id,
                company_name: p.provider_name
            }))
        };
        
        const newPanel = this.createItemPanel(item);
        panel.replaceWith(newPanel);
    },

    validateAllocations() {
        for (const itemId in this.allocations) {
            const allocation = this.allocations[itemId];
            if (allocation.mode === 'percentage') {
                const total = this.calculateTotal(itemId);
                if (total !== 100) {
                    return false;
                }
            }
        }
        return true;
    },

    getAllocationData() {
        return this.allocations;
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

window.providerAllocator = providerAllocator;
