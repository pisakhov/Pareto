/**
 * Contract Adjustments - Manages price multipliers per product-item
 */
const contractAdjustments = {
    multipliers: {},

    renderAdjustments(selectedItems) {
        const container = document.getElementById('pricingAdjustmentsContainer');
        if (!container) return;

        if (!selectedItems || selectedItems.length === 0) {
            container.innerHTML = '<p class="text-sm text-muted-foreground text-center py-8">Select items above to configure pricing adjustments</p>';
            this.multipliers = {};
            return;
        }

        let html = '<div class="space-y-3">';
        html += '<p class="text-xs text-muted-foreground mb-3">Set multipliers: &lt; 1.0 = Discount, 1.0 = Standard (default), &gt; 1.0 = Premium</p>';
        
        selectedItems.forEach(item => {
            if (!this.multipliers[item.id]) {
                this.multipliers[item.id] = { multiplier: 1.0, notes: '' };
            }
            
            const multiplier = this.multipliers[item.id].multiplier;
            const notes = this.multipliers[item.id].notes;
            const percentage = ((multiplier - 1) * 100).toFixed(1);
            const label = multiplier < 1 ? `${Math.abs(percentage)}% discount` : 
                         multiplier > 1 ? `+${percentage}% premium` : 
                         'Standard pricing';
            const labelColor = multiplier < 1 ? 'text-green-600' : 
                              multiplier > 1 ? 'text-amber-600' : 
                              'text-muted-foreground';

            html += `
                <div class="border border-border rounded-md p-3">
                    <div class="flex items-center gap-3 mb-2">
                        <label class="font-medium text-sm flex-1">${this.escapeHtml(item.name)}</label>
                        <div class="flex items-center gap-2">
                            <input type="number" 
                                   value="${multiplier}" 
                                   step="0.01" 
                                   min="0.01"
                                   max="10"
                                   onchange="contractAdjustments.handleMultiplierChange(${item.id}, this.value)"
                                   class="w-20 px-2 py-1 text-sm border border-input rounded-md focus:ring-2 focus:ring-ring">
                            <span class="text-xs ${labelColor} font-medium w-28">${label}</span>
                        </div>
                    </div>
                    <input type="text" 
                           placeholder="Notes (optional)"
                           value="${this.escapeHtml(notes)}"
                           onchange="contractAdjustments.handleNotesChange(${item.id}, this.value)"
                           class="w-full px-2 py-1 text-xs border border-input rounded-md focus:ring-2 focus:ring-ring">
                </div>
            `;
        });
        
        html += '</div>';
        container.innerHTML = html;
    },

    handleMultiplierChange(itemId, value) {
        const numValue = parseFloat(value) || 1.0;
        if (!this.multipliers[itemId]) {
            this.multipliers[itemId] = { multiplier: 1.0, notes: '' };
        }
        this.multipliers[itemId].multiplier = Math.max(0.01, Math.min(10, numValue));
        
        // Re-render to update label using current items from itemManager
        if (window.itemManager) {
            const selectedItems = Array.from(window.itemManager.itemAllocations.entries()).map(([id, data]) => ({
                id: id,
                name: data.item.item_name
            }));
            this.renderAdjustments(selectedItems);
        }
    },

    handleNotesChange(itemId, value) {
        if (!this.multipliers[itemId]) {
            this.multipliers[itemId] = { multiplier: 1.0, notes: '' };
        }
        this.multipliers[itemId].notes = value;
    },

    getMultiplierData() {
        const data = {};
        for (const [itemId, info] of Object.entries(this.multipliers)) {
            // Only include non-default multipliers
            if (info.multiplier !== 1.0 || info.notes) {
                data[itemId] = {
                    multiplier: info.multiplier,
                    notes: info.notes
                };
            }
        }
        return data;
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

window.contractAdjustments = contractAdjustments;
