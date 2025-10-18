/**
 * Tier Status Manager - Manages provider tier status display
 */
const tierStatusManager = {
    async fetchTierStatus(productQuantities) {
        const response = await fetch('/api/optimization/tier-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ product_quantities: productQuantities })
        });
        
        if (!response.ok) throw new Error('Failed to fetch tier status');
        return await response.json();
    },

    renderTierStatus(tierStatusData) {
        const panel = document.getElementById('tierStatusPanel');
        const container = document.getElementById('tierStatusList');
        
        if (!tierStatusData || Object.keys(tierStatusData).length === 0) {
            panel.classList.add('hidden');
            return;
        }

        panel.classList.remove('hidden');
        
        const cards = Object.entries(tierStatusData).map(([providerName, status]) => {
            const hasOverride = status.override_tier !== null;
            const tierDifference = hasOverride ? 
                status.override_tier - status.calculated_tier : 0;
            
            return `
                <div class="border border-border rounded-lg p-4 ${hasOverride ? 'bg-yellow-50 dark:bg-yellow-950/20' : ''}">
                    <h3 class="font-semibold text-lg mb-3">${this.escapeHtml(providerName)}</h3>
                    
                    <div class="space-y-2 text-sm">
                        <div class="flex justify-between">
                            <span class="text-muted-foreground">Calculated Tier:</span>
                            <span class="font-medium">Tier ${status.calculated_tier}</span>
                        </div>
                        
                        ${hasOverride ? `
                            <div class="flex justify-between text-yellow-700 dark:text-yellow-400">
                                <span>Override Tier:</span>
                                <span class="font-medium">Tier ${status.override_tier}</span>
                            </div>
                        ` : ''}
                        
                        <div class="flex justify-between pt-2 border-t border-border">
                            <span class="text-muted-foreground">Effective Tier:</span>
                            <span class="font-bold text-foreground">Tier ${status.effective_tier}</span>
                        </div>
                        
                        <div class="flex justify-between">
                            <span class="text-muted-foreground">Credit Files:</span>
                            <span class="font-medium">${status.total_credit_files.toLocaleString()}</span>
                        </div>
                        
                        ${hasOverride && status.override_notes ? `
                            <div class="pt-2 border-t border-border">
                                <span class="text-muted-foreground text-xs">Note:</span>
                                <p class="text-xs mt-1 text-muted-foreground italic">${this.escapeHtml(status.override_notes)}</p>
                            </div>
                        ` : ''}
                        
                        ${hasOverride ? `
                            <div class="pt-2 flex items-center gap-1 text-xs">
                                <svg class="w-4 h-4 text-yellow-600 dark:text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                                </svg>
                                <span class="text-yellow-700 dark:text-yellow-400">Manual override active</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
        
        container.innerHTML = cards;
    },

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

window.tierStatusManager = tierStatusManager;
