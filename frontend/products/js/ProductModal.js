/**
 * Product Modal - Handles product creation/editing modal
 * Combines: itemManager, contractAdjustments, forecastManager, chartManager, formHandler, modalManager
 */

// Pricing Adjustments Manager
class PricingAdjustments {
    constructor() {
        this.multipliers = {};
    }

    handleMultiplierChange(itemId, value) {
        const numValue = parseFloat(value) || 1.0;
        this.multipliers[itemId] = {
            multiplier: Math.max(0.01, Math.min(10, numValue)),
            notes: this.multipliers[itemId]?.notes || ''
        };
        // Pass self to render to avoid global dependency inside ItemManager
        if (productModal && productModal.itemManager) {
            productModal.itemManager.render(this);
        }
    }

    handleNotesChange(itemId, value) {
        if (!this.multipliers[itemId]) this.multipliers[itemId] = { multiplier: 1.0, notes: '' };
        this.multipliers[itemId].notes = value;
    }

    getData() {
        const data = {};
        for (const [itemId, info] of Object.entries(this.multipliers)) {
            if (info.multiplier !== 1.0 || (info.notes && info.notes.trim() !== '')) {
                data[itemId] = { multiplier: info.multiplier, notes: info.notes || '' };
            }
        }
        return data;
    }
}

// Forecasting Manager
class ForecastManager {
    constructor() {
        // Data: Map<processId, { forecast: [], actual: [] }>
        this.processData = new Map();
        this.currentYear = new Date().getFullYear();
        this.months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        // Store chart instances: Map<processId, Chart>
        this.charts = new Map();

        this.config = {
            forecast: { 
                key: 'forecast_units', 
                colorClass: 'text-orange-600', 
                ringClass: 'focus:ring-orange-400',
                borderClass: 'focus:border-orange-400'
            },
            actual: { 
                key: 'actual_units', 
                colorClass: 'text-[#255be3]', 
                ringClass: 'focus:ring-[#255be3]',
                borderClass: 'focus:border-[#255be3]'
            }
        };
    }

    reset() {
        this.processData.clear();
        this.currentYear = new Date().getFullYear();
        this.charts.forEach(chart => chart.destroy());
        this.charts.clear();
    }

    ensureProcessData(processId) {
        if (!this.processData.has(processId)) {
            this.processData.set(processId, { forecast: [], actual: [] });
        }
        return this.processData.get(processId);
    }

    updateData(processId, type, year, month, units) {
        const data = this.ensureProcessData(processId);
        year = parseInt(year);
        month = parseInt(month);
        const key = this.config[type].key;

        const updated = data[type].filter(f => !(f.year === year && f.month === month));
        if (units !== '' && units !== null && !isNaN(parseInt(units))) {
            updated.push({ year, month, [key]: parseInt(units) });
        }
        data[type] = updated;
        
        this.updateChart(processId);
    }
    
    applyAll(processId, type) {
        const data = this.ensureProcessData(processId);
        const key = this.config[type].key;
        
        // Get Jan value for current year
        const janEntry = data[type].find(f => f.year === this.currentYear && f.month === 1);
        if (!janEntry) return;
        
        const val = janEntry[key];
        
        // Create entries for all months
        const newEntries = [];
        for (let m = 1; m <= 12; m++) {
             newEntries.push({ year: this.currentYear, month: m, [key]: val });
        }
        
        // Filter out current year entries from existing data and append new ones
        data[type] = data[type].filter(f => f.year !== this.currentYear).concat(newEntries);
        
        // Re-render
        if (productModal && productModal.itemManager) {
            productModal.itemManager.render(productModal.pricing);
        }
    }
    
    clearAll(processId, type) {
        const data = this.ensureProcessData(processId);
        
        // Remove all entries for current year
        data[type] = data[type].filter(f => f.year !== this.currentYear);
        
        // Re-render
        if (productModal && productModal.itemManager) {
            productModal.itemManager.render(productModal.pricing);
        }
    }

    getData() {
        const forecasts = [];
        const actuals = [];

        this.processData.forEach((data, processId) => {
            data.forecast.forEach(f => forecasts.push({ ...f, process_id: processId }));
            data.actual.forEach(a => actuals.push({ ...a, process_id: processId }));
        });

        return { forecasts, actuals };
    }

    loadFromProduct(product) {
        this.reset();
        
        if (product.forecasts) {
            product.forecasts.forEach(f => {
                this.updateData(f.process_id, 'forecast', f.year, f.month, f.forecast_units);
            });
        }

        if (product.actuals) {
            product.actuals.forEach(a => {
                this.updateData(a.process_id, 'actual', a.year, a.month, a.actual_units);
            });
        }

        // Determine max year from all data
        let maxYear = new Date().getFullYear();
        this.processData.forEach(data => {
            data.forecast.forEach(f => maxYear = Math.max(maxYear, f.year));
            data.actual.forEach(a => maxYear = Math.max(maxYear, a.year));
        });
        this.currentYear = maxYear;
    }

    getHtml(processId, processName) {
        const data = this.ensureProcessData(processId);
        
        const renderTimeline = (type) => {
            const key = this.config[type].key;
            const timelineHtml = Array.from({ length: 12 }, (_, i) => {
                const month = i + 1;
                const entry = data[type].find(f => f.year === this.currentYear && f.month === month);
                const value = entry ? entry[key] : '';
                const cfg = this.config[type];
                const hasValue = value !== '';
                
                // Pre-calculate style classes
                let classes = "w-full text-center text-sm font-semibold bg-transparent border border-border rounded px-2 py-2 focus:outline-none transition-colors";
                let style = "";
                
                if (hasValue) {
                    classes += ` ${cfg.colorClass} ${cfg.ringClass} ${cfg.borderClass} ring-1 border-transparent`;
                    if (type === 'actual') style = "color: #255be3; border-color: #255be3;";
                } else {
                    classes += ` text-muted-foreground ${cfg.ringClass} ${cfg.borderClass} focus:ring-2`;
                }

                return `
                    <div class="month-cell">
                        <input type="number" min="0" placeholder="0" value="${value}"
                               class="${classes}" style="${style}"
                               data-month="${month}" data-type="${type}" data-process="${processId}" />
                    </div>
                `;
            }).join('');
            return timelineHtml;
        };

        return `
            <div class="mt-6 bg-slate-50/50 border border-slate-200 rounded-lg p-4">
                <div class="flex items-center justify-between mb-4">
                    <h4 class="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <svg class="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                        Volume Forecasting & Actuals - ${dataService.escapeHtml(processName)}
                    </h4>
                    <div class="flex items-center gap-3 bg-white rounded-lg border border-slate-200 p-1 shadow-sm">
                        <button type="button" class="p-1 hover:bg-slate-100 rounded text-slate-500" onclick="productModal.forecast.changeYear(-1)">
                            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <span class="text-sm font-bold text-slate-700 w-12 text-center select-none">${this.currentYear}</span>
                        <button type="button" class="p-1 hover:bg-slate-100 rounded text-slate-500" onclick="productModal.forecast.changeYear(1)">
                            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
                        </button>
                    </div>
                </div>
                
                <div class="grid grid-cols-[auto_1fr] gap-4 mb-3">
                     <!-- Header -->
                    <div class="w-24"></div>
                    <div class="grid grid-cols-12 gap-2">
                        ${this.months.map(m => `<div class="text-center"><div class="text-xs font-medium text-muted-foreground">${m}</div></div>`).join('')}
                    </div>

                    <!-- Forecast Row -->
                    <div class="flex flex-col items-end gap-1 justify-center w-24">
                        <div class="text-xs font-semibold text-orange-600 text-right">Forecast</div>
                        <div class="flex gap-1">
                             <button type="button" onclick="productModal.forecast.applyAll(${processId}, 'forecast')" class="text-[10px] px-1.5 py-0.5 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded border border-orange-200 transition-colors">Apply</button>
                             <button type="button" onclick="productModal.forecast.clearAll(${processId}, 'forecast')" class="text-[10px] px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded border border-slate-200 transition-colors">Clear</button>
                        </div>
                    </div>
                    <div class="grid grid-cols-12 gap-2" id="forecastTimeline_${processId}">
                        ${renderTimeline('forecast')}
                    </div>

                    <!-- Actual Row -->
                    <div class="flex flex-col items-end gap-1 justify-center w-24">
                        <div class="text-xs font-semibold text-[#255be3] text-right">Actuals</div>
                        <div class="flex gap-1">
                             <button type="button" onclick="productModal.forecast.applyAll(${processId}, 'actual')" class="text-[10px] px-1.5 py-0.5 bg-blue-50 hover:bg-blue-100 text-[#255be3] rounded border border-blue-100 transition-colors">Apply</button>
                             <button type="button" onclick="productModal.forecast.clearAll(${processId}, 'actual')" class="text-[10px] px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded border border-slate-200 transition-colors">Clear</button>
                        </div>
                    </div>
                    <div class="grid grid-cols-12 gap-2" id="actualTimeline_${processId}">
                        ${renderTimeline('actual')}
                    </div>
                </div>
                
                 <!-- Chart -->
                <div class="mt-4">
                    <div class="bg-white border border-slate-200 rounded-lg p-4">
                        <div class="flex items-center justify-between mb-4">
                            <h4 class="text-sm font-semibold text-slate-700">Forecast vs Actuals Trend</h4>
                            <div class="flex items-center gap-4">
                                <div class="flex items-center gap-2">
                                    <div class="w-3 h-3 rounded-full" style="background-color: rgb(251, 146, 60);"></div>
                                    <span class="text-xs text-slate-600">Forecast</span>
                                </div>
                                <div class="flex items-center gap-2">
                                    <div class="w-3 h-3 rounded-full" style="background-color: rgb(37, 91, 227);"></div>
                                    <span class="text-xs text-slate-600">Actuals</span>
                                </div>
                            </div>
                        </div>
                        <div class="relative" style="height: 200px;">
                            <canvas id="forecastActualsChart_${processId}"></canvas>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    changeYear(delta) {
        this.currentYear += delta;
        // Re-render all
        if (productModal && productModal.itemManager) {
            productModal.itemManager.render(productModal.pricing);
        }
    }

    updateInputStyle(input) {
        const type = input.dataset.type;
        const hasValue = input.value !== '' && input.value !== null;
        const cfg = this.config[type];

        // Reset base classes
        input.className = "w-full text-center text-sm font-semibold bg-transparent border border-border rounded px-2 py-2 focus:outline-none transition-colors";
        input.style = "";
        
        // Apply active/inactive state
        if (hasValue) {
            input.classList.add(cfg.colorClass, cfg.ringClass, cfg.borderClass, 'ring-1', 'border-transparent');
             // Specifically for blue (actuals) which uses hex
            if (type === 'actual') {
                input.style.color = '#255be3';
                input.style.borderColor = '#255be3';
            }
        } else {
            input.classList.add('text-muted-foreground', cfg.ringClass, cfg.borderClass, 'focus:ring-2');
        }
    }

    setupHandlers() {
        // This is called after global render, so we attach to all process inputs
        const inputs = document.querySelectorAll('input[data-process][data-month]');
        
        inputs.forEach(input => {
            input.addEventListener('input', (e) => {
                const processId = parseInt(input.dataset.process);
                const month = parseInt(input.dataset.month);
                const type = input.dataset.type;
                
                this.updateInputStyle(input);
                this.updateData(processId, type, this.currentYear, month, e.target.value);
            });
        });
        
        // Initialize charts
        const charts = document.querySelectorAll('canvas[id^="forecastActualsChart_"]');
        charts.forEach(canvas => {
            const processId = parseInt(canvas.id.split('_')[1]);
            this.initChart(processId);
        });
    }
    
    initChart(processId) {
        const ctx = document.getElementById(`forecastActualsChart_${processId}`);
        if (!ctx) return;
        
        // Destroy existing if any
        if (this.charts.has(processId)) {
            this.charts.get(processId).destroy();
        }

        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Forecast',
                        data: [],
                        borderColor: 'rgb(251, 146, 60)',
                        backgroundColor: 'rgba(251, 146, 60, 0.15)',
                        borderWidth: 3,
                        tension: 0.4,
                        fill: true,
                        pointRadius: 4,
                        pointHoverRadius: 6
                    },
                    {
                        label: 'Actuals',
                        data: [],
                        borderColor: 'rgb(37, 91, 227)',
                        backgroundColor: 'rgba(37, 91, 227, 0.15)',
                        borderWidth: 3,
                        tension: 0.4,
                        fill: true,
                        pointRadius: 4,
                        pointHoverRadius: 6
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(0, 0, 0, 0.05)' }, ticks: { font: { size: 10 } } },
                    x: { grid: { display: false }, ticks: { font: { size: 10 } } }
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                }
            }
        });
        
        this.charts.set(processId, chart);
        this.updateChart(processId);
    }
    
    updateChart(processId) {
        const chart = this.charts.get(processId);
        if (!chart) return;
        
        const data = this.ensureProcessData(processId);
        
        const forecastMap = new Map();
        const actualMap = new Map();

        data.forecast.forEach(f => {
            forecastMap.set(`${f.year}-${f.month}`, f.forecast_units);
        });

        data.actual.forEach(a => {
            actualMap.set(`${a.year}-${a.month}`, a.actual_units);
        });

        const allDates = [...new Set([...forecastMap.keys(), ...actualMap.keys()])].sort((a, b) => {
            const [y1, m1] = a.split('-').map(Number);
            const [y2, m2] = b.split('-').map(Number);
            return y1 - y2 || m1 - m2;
        });
        
        let labels, displayDates;
        
        if (allDates.length === 0) {
             displayDates = Array.from({length: 12}, (_, i) => `${this.currentYear}-${i+1}`);
        } else {
            displayDates = allDates;
        }

        labels = displayDates.map(date => {
            const [year, month] = date.split('-');
            return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        });

        chart.data.labels = labels;
        chart.data.datasets[0].data = displayDates.map(d => forecastMap.get(d) || null);
        chart.data.datasets[1].data = displayDates.map(d => actualMap.get(d) || null);
        chart.update('none');
    }
}

// Item/Process Manager
class ItemManager {
    constructor() {
        this.selectedItems = [];
        this.contracts = new Map();
        this.allContracts = [];
        this.allProviders = [];
    }

    setContracts(contracts) {
        this.allContracts = contracts;
    }

    setProviders(providers) {
        this.allProviders = providers;
    }

    async addProcess(processData) {
        const providers = this.getUniqueProviders(processData.items);
        this.contracts.set(processData.process_id, {
            data: processData,
            selectedItems: [...processData.items],
            allocation: {
                mode: 'percentage',
                providers,
                providerValues: new Map(providers.map(p => [p.provider_id, 0]))
            }
        });

        this.rebuildSelectedItems();
        this.render(productModal.pricing);

        if (window.productModal) {
            window.productModal.renderProcessSelect(this.allContracts);
        }
    }

    removeProcess(processId) {
        this.contracts.delete(processId);
        this.rebuildSelectedItems();
        this.render(productModal.pricing);

        if (window.productModal) {
            window.productModal.renderProcessSelect(this.allContracts);
        }
    }

    toggleProcessItem(processId, itemId, checked) {
        const contract = this.contracts.get(processId);
        if (!contract) return;

        if (checked) {
            const item = contract.data.items.find(i => i.item_id === itemId);
            if (item && !contract.selectedItems.find(i => i.item_id === itemId)) {
                contract.selectedItems.push(item);
            }
        } else {
            contract.selectedItems = contract.selectedItems.filter(i => i.item_id !== itemId);
        }

        this.rebuildSelectedItems();
        this.render(productModal.pricing);
    }

    toggleProcessSelectAll(processId, checked) {
        const contract = this.contracts.get(processId);
        if (!contract) return;

        contract.selectedItems = checked ? [...contract.data.items] : [];
        this.rebuildSelectedItems();
        this.render(productModal.pricing);
    }

    updateProviderValue(processId, providerId, value) {
        const contract = this.contracts.get(processId);
        if (!contract) return;

        const numValue = parseFloat(value) || 0;
        contract.allocation.providerValues.set(parseInt(providerId), numValue);
        this.render(productModal.pricing);
    }

    toggleAllocationMode(processId, mode) {
        const contract = this.contracts.get(processId);
        if (!contract) return;

        contract.allocation.mode = mode;
        contract.allocation.providerValues.forEach((_, id) => {
            contract.allocation.providerValues.set(id, 0);
        });
        this.render(productModal.pricing);
    }

    lockProvider(processId, providerId) {
        const contract = this.contracts.get(processId);
        if (!contract || contract.allocation.mode !== 'percentage') return;

        contract.allocation.providerValues.forEach((_, id) => {
            contract.allocation.providerValues.set(id, id == providerId ? 100 : 0);
        });
        this.render(productModal.pricing);
    }

    rebuildSelectedItems() {
        this.selectedItems = [];
        this.contracts.forEach(c => this.selectedItems.push(...c.selectedItems));
    }

    getUniqueProviders(items) {
        const unique = new Map();
        items.forEach(item => {
            item.providers.forEach(p => {
                if (!unique.has(p.provider_id)) {
                    unique.set(p.provider_id, { provider_id: p.provider_id, company_name: p.provider_name });
                }
            });
        });

        return Array.from(unique.values());
    }

    getAllocations() {
        const allocations = {};
        this.contracts.forEach((contract, processId) => {
            const providers = [];
            contract.allocation.providerValues.forEach((value, providerId) => {
                const provider = contract.allocation.providers.find(p => p.provider_id === providerId);
                providers.push({
                    provider_id: providerId,
                    provider_name: provider?.company_name,
                    value
                });
            });

            contract.selectedItems.forEach(item => {
                allocations[item.item_id] = {
                    mode: contract.allocation.mode,
                    providers
                };
            });
        });
        return allocations;
    }

    validate() {
        for (const [_, contract] of this.contracts) {
            if (contract.allocation.mode === 'percentage') {
                const total = Array.from(contract.allocation.providerValues.values()).reduce((a, b) => a + b, 0);
                if (total !== 100) return false;
            }
        }
        return true;
    }

    reset() {
        this.selectedItems = [];
        this.contracts.clear();
        this.render(productModal.pricing);
    }

    render(pricingManager) {
        const container = document.getElementById('productItemsContainer');
        if (!container) return;

        if (this.contracts.size === 0) {
            container.innerHTML = '<p class="text-sm text-muted-foreground text-center py-4">No items added yet</p>';
            return;
        }

        let html = '<div class="space-y-6">';

        this.contracts.forEach((contract, processId) => {
            html += this.renderContract(processId, contract, pricingManager);
        });

        container.innerHTML = html + '</div>';

        // Re-bind forecast handlers after render
        if (productModal && productModal.forecast) {
            productModal.forecast.setupHandlers();
        }
    }

    renderContract(processId, contract, pricingManager) {
        const headerId = `selectAll_${processId}`;

        let html = `
            <div class="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                <div class="px-6 py-4 bg-gradient-to-r from-[#fb923c]/5 to-[#fb923c]/10 border-b border-border">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <div class="p-2 bg-white rounded-lg border border-slate-200 shadow-sm">
                                <svg class="w-5 h-5 text-[#fb923c]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
                            </div>
                            <div>
                                <h3 class="text-lg font-semibold text-slate-900">${dataService.escapeHtml(contract.data.process_name)}</h3>
                                <p class="text-sm text-slate-600 mt-0.5">Configure items and allocations</p>
                            </div>
                        </div>
                        <button type="button" onclick="productModal.removeProcess(${processId})"
                                class="text-red-600 hover:text-red-800 text-sm font-medium px-3 py-1.5 hover:bg-red-50 rounded-md transition-colors">
                            Remove
                        </button>
                    </div>
                </div>

                <div class="p-6">
                    <div class="mb-6">
                        <div class="flex items-center justify-between mb-3">
                            <h4 class="text-sm font-semibold text-slate-700">Items in Process</h4>
                            <label for="${headerId}" class="text-sm font-medium cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
                                <input type="checkbox" id="${headerId}" ${contract.selectedItems.length === contract.data.items.length ? 'checked' : ''}
                                       onchange="productModal.toggleProcessSelectAll(${processId}, this.checked)"
                                       class="focus:ring-2 focus:ring-[#fb923c] rounded">
                                <span>Select All (${contract.data.items.length})</span>
                            </label>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        `;

        contract.data.items.forEach(item => {
            const isSelected = contract.selectedItems.find(i => i.item_id === item.item_id);
            const providers = item.providers.map(p => dataService.escapeHtml(p.provider_name)).join(' · ');

            let pricingHtml = '';
            if (isSelected && pricingManager) {
                if (!pricingManager.multipliers[item.item_id]) {
                    pricingManager.multipliers[item.item_id] = { multiplier: 1.0, notes: '' };
                }
                const pricing = pricingManager.multipliers[item.item_id];
                
                const pct = ((pricing.multiplier - 1) * 100).toFixed(1);
                const label = pricing.multiplier < 1 ? `${Math.abs(pct)}% discount` :
                             pricing.multiplier > 1 ? `+${pct}% premium` : 'Standard';
                const color = pricing.multiplier < 1 ? 'text-green-600' : pricing.multiplier > 1 ? 'text-amber-600' : 'text-muted-foreground';

                pricingHtml = `
                    <div class="mt-3 pt-3 border-t border-[#fb923c]/20" onclick="event.preventDefault()">
                        <div class="flex items-center gap-2 mb-2">
                            <div class="flex items-center gap-2 bg-white rounded-md border border-[#fb923c]/30 px-2 py-1 shadow-sm">
                                <span class="text-xs text-slate-500 font-medium">Price:</span>
                                <input type="number" value="${pricing.multiplier}" step="0.01" min="0.01" max="10"
                                       onchange="productModal.pricing.handleMultiplierChange(${item.item_id}, this.value)"
                                       class="w-16 text-sm font-bold text-slate-700 bg-transparent border-none p-0 focus:ring-0 text-center">
                            </div>
                            <span class="text-xs font-semibold ${color} px-2 py-1 rounded-md bg-white/50 border border-transparent">${label}</span>
                        </div>
                        <input type="text" placeholder="Add notes..." value="${dataService.escapeHtml(pricing.notes || '')}"
                               onchange="productModal.pricing.handleNotesChange(${item.item_id}, this.value)"
                               class="w-full text-xs border border-[#fb923c]/30 rounded px-2 py-1.5 focus:ring-2 focus:ring-[#fb923c] focus:border-[#fb923c] bg-white/80">
                    </div>
                `;
            }

            html += `
                <div class="border-2 rounded-xl p-4 transition-all duration-200 hover:shadow-md ${isSelected ? 'border-[#fb923c] bg-gradient-to-br from-[#fb923c]/5 to-[#fb923c]/10 shadow-sm' : 'border-slate-200 hover:border-slate-300'}">
                    <label class="flex items-start gap-3 cursor-pointer">
                        <input type="checkbox" ${isSelected ? 'checked' : ''}
                               onchange="productModal.toggleProcessItem(${processId}, ${item.item_id}, this.checked)"
                               class="mt-1 w-5 h-5 text-[#fb923c] focus:ring-2 focus:ring-[#fb923c] rounded border-2 border-slate-300 flex-shrink-0">
                        <div class="flex-1 min-w-0">
                            <div class="text-sm font-semibold text-slate-900 mb-1">${dataService.escapeHtml(item.item_name)}</div>
                            <div class="text-xs text-slate-600 flex items-center gap-1">
                                <svg class="w-3.5 h-3.5 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" stroke="currentColor"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/></svg>
                                <span>${providers}</span>
                            </div>
                        </div>
                    </label>
                    ${pricingHtml}
                </div>
            `;
        });

        html += `
                        </div>
                    </div>
        `;

        if (contract.selectedItems.length > 0) {
            html += this.renderAllocationSection(processId, contract);
            
            // Insert Forecast Section for this process
            if (productModal && productModal.forecast) {
                html += productModal.forecast.getHtml(processId, contract.data.process_name);
            }
        }

        html += '</div></div>';
        return html;
    }

    renderAllocationSection(processId, contract) {
        const allocation = contract.allocation;
        const suffix = allocation.mode === 'percentage' ? '%' : 'units';
        const total = Array.from(allocation.providerValues.values()).reduce((a, b) => a + b, 0);
        const isValid = allocation.mode === 'percentage' ? total === 100 : true;

        let html = `
            <div class="bg-gradient-to-r from-[#fb923c]/5 to-[#fb923c]/10 border border-[#fb923c]/20 rounded-lg p-4">
                <div class="mb-4 flex items-center justify-between">
                    <h4 class="text-sm font-semibold text-slate-700">Provider Allocations</h4>
                    <div class="flex gap-2 text-sm bg-white rounded-lg p-1 border border-[#fb923c]/20">
                        <button type="button" onclick="productModal.toggleAllocationMode(${processId}, 'percentage')"
                                class="px-3 py-1 rounded-md ${allocation.mode === 'percentage' ? 'bg-[#fb923c] text-white' : 'text-slate-700 hover:bg-slate-50'}">
                            %
                        </button>
                        <button type="button" onclick="productModal.toggleAllocationMode(${processId}, 'units')"
                                class="px-3 py-1 rounded-md ${allocation.mode === 'units' ? 'bg-[#fb923c] text-white' : 'text-slate-700 hover:bg-slate-50'}">
                            Units
                        </button>
                    </div>
                </div>

                <div class="space-y-2">
        `;

        allocation.providers.forEach(provider => {
            const value = allocation.providerValues.get(provider.provider_id) || 0;
            html += `
                <div class="flex items-center justify-between py-2 px-3 bg-white rounded-lg border border-[#fb923c]/20">
                    <span class="font-medium text-slate-900">${dataService.escapeHtml(provider.company_name || 'Unknown Provider')}</span>
                    <div class="flex items-center gap-2">
                        <input type="number" value="${value}" min="0"
                               onchange="productModal.updateProviderValue(${processId}, ${provider.provider_id}, this.value)"
                               class="w-20 px-2 py-1 border border-slate-300 rounded text-center text-sm font-medium focus:ring-2 focus:ring-[#fb923c]">
                        <span class="text-sm text-slate-600 w-12 text-left">${suffix}</span>
                        ${allocation.mode === 'percentage' ? `
                            <button type="button" onclick="productModal.lockProvider(${processId}, ${provider.provider_id})"
                                    class="text-xs text-slate-500 hover:text-[#fb923c] px-2 py-1 hover:bg-slate-50 rounded transition-colors">
                                🔒 Lock
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        });

        html += `
                </div>
                <div class="mt-3 pt-3 border-t border-[#fb923c]/30 flex items-center justify-between">
                    <span class="text-sm font-semibold text-slate-700">Total:</span>
                    <span class="text-sm font-semibold ${isValid ? 'text-green-600' : 'text-amber-600'}">${total.toLocaleString()} ${suffix} ${isValid ? '✓' : '⚠️'}</span>
                </div>
            </div>
        `;

        return html;
    }
}

// Main Product Modal
const productModal = {
    editingId: null,
    itemManager: new ItemManager(),
    pricing: new PricingAdjustments(),
    forecast: new ForecastManager(),

    show(isEdit = false) {
        const modal = document.getElementById('productModal');
        if (!modal) return;

        if (!isEdit) {
            this.reset();
            document.getElementById('productModalTitle').textContent = 'Add Product';

            // Load contracts to populate the Select Process dropdown
            this.loadContracts();
        } else {
            // In edit mode, we don't want to reset the data because editProduct() has already loaded it.
        }

        modal.classList.remove('hidden');
        modal.classList.add('flex');

        setTimeout(() => {
            document.getElementById('productName')?.focus();
        }, 100);
    },

    async loadContracts() {
        try {
            const contracts = await dataService.getAllContracts();
            const providers = await dataService.loadProviders();
            this.itemManager.setContracts(contracts);
            this.itemManager.setProviders(providers);
            this.renderProcessSelect(contracts);
        } catch (error) {
            console.error('Failed to load contracts:', error);
        }
    },

    renderProcessSelect(contracts) {
        const select = document.getElementById('contractSelect');
        if (!select) return;

        select.innerHTML = '';

        // Get IDs of already-added processes
        const addedProcessIds = Array.from(this.itemManager.contracts.keys());

        // Show only processes that haven't been added yet
        const availableContracts = contracts.filter(c => !addedProcessIds.includes(c.process_id));

        availableContracts.forEach(contract => {
            const option = document.createElement('option');
            option.value = contract.process_id;
            option.textContent = contract.process_name;
            select.appendChild(option);
        });

        // Hide/show elements based on whether all processes are added
        const allAdded = availableContracts.length === 0;
        const processSelectionCard = document.getElementById('processSelectionCard');
        const addProcessButtonContainer = document.getElementById('addProcessButtonContainer');
        const allProcessesAddedMsg = document.getElementById('allProcessesAddedMsg');

        if (processSelectionCard) {
            processSelectionCard.style.display = allAdded ? 'none' : 'block';
        }
        if (addProcessButtonContainer) {
            addProcessButtonContainer.style.display = allAdded ? 'none' : 'flex';
        }
        if (allProcessesAddedMsg) {
            allProcessesAddedMsg.classList.toggle('hidden', !allAdded);
        }

        // Setup Add Process button handler
        const addBtn = document.getElementById('addContractBtn');
        if (addBtn) {
            addBtn.style.display = allAdded ? 'none' : 'inline-flex';
            addBtn.onclick = async () => {
                const processId = parseInt(select.value);
                if (!processId) {
                    Toast.show('Please select a process', 'warning');
                    return;
                }

                const processData = contracts.find(c => c.process_id === processId);
                if (processData) {
                    await this.itemManager.addProcess(processData);
                    // renderProcessSelect will be called from addProcess()
                }
            };
        }
    },

    close() {
        const modal = document.getElementById('productModal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            this.reset();
        }
    },

    reset() {
        this.editingId = null;
        this.itemManager.reset();
        this.pricing.multipliers = {};
        this.forecast.reset();

        // Reset UI elements
        const processSelectionCard = document.getElementById('processSelectionCard');
        const addProcessButtonContainer = document.getElementById('addProcessButtonContainer');
        const allProcessesAddedMsg = document.getElementById('allProcessesAddedMsg');

        if (processSelectionCard) processSelectionCard.style.display = 'none';
        if (addProcessButtonContainer) addProcessButtonContainer.style.display = 'none';
        if (allProcessesAddedMsg) allProcessesAddedMsg.classList.add('hidden');
    },

    setupHandlers() {
        // Status toggle
        const statusToggle = document.getElementById('productStatusToggle');
        if (statusToggle) {
            statusToggle.onchange = function() {
                const isActive = this.checked;
                document.getElementById('productStatus').value = isActive ? 'active' : 'inactive';
                document.getElementById('productStatusLabel').textContent = isActive ? 'Active' : 'Inactive';
            };
        }

        // Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.close();
        });

        // Forecast handlers
        this.forecast.setupHandlers();

        // Form submit
        document.getElementById('productForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (!this.itemManager.validate()) {
                Toast.show('Invalid allocations: All percentage items must total 100%', 'error');
                return;
            }

            // Ensure at least one process is added
            if (this.itemManager.contracts.size === 0) {
                Toast.show('Please add at least one process with items', 'error');
                return;
            }

            const formData = new FormData(e.target);
            const contractSelections = this.getContractSelections();
            const allocations = this.itemManager.getAllocations();
            const priceMultipliers = this.pricing.getData();

            const data = {
                name: formData.get('name'),
                description: formData.get('description') || '',
                status: formData.get('status'),
                contract_selections: contractSelections,
                allocations: allocations,
                price_multipliers: priceMultipliers,
                ...this.forecast.getData()
            };

            // Capture editingId before calling close() which resets it
            const isEditingId = this.editingId;

            try {
                await dataService.saveProduct(data, isEditingId);

                this.close();

                // Full refresh strategy (like Contracts app)
                if (window.productsPage) {
                    await window.productsPage.refresh();
                }

                Toast.show(isEditingId ? 'Product updated successfully' : 'Product created successfully', 'success');
            } catch (error) {
                Toast.show(error.message, 'error');
            }
        });
    },

    getContractSelections() {
        const selections = {};
        this.itemManager.contracts.forEach((contract, processId) => {
            selections[contract.data.process_id] = contract.selectedItems.map(i => i.item_id);
        });
        return selections;
    },

    async editProduct(productId) {
        try {
            const product = await dataService.getProduct(productId);
            this.editingId = productId;

            document.getElementById('productModalTitle').textContent = 'Edit Product';
            document.getElementById('productName').value = product.name;
            document.getElementById('productDescription').value = product.description;
            document.getElementById('productStatus').value = product.status;

            const isActive = product.status === 'active';
            document.getElementById('productStatusToggle').checked = isActive;
            document.getElementById('productStatusLabel').textContent = isActive ? 'Active' : 'Inactive';

            // Load contracts for dropdown
            const allContracts = await dataService.getAllContracts();
            const providers = await dataService.loadProviders();
            this.itemManager.setContracts(allContracts);
            this.itemManager.setProviders(providers);

            // Restore processes - reconstruct from item_ids
            const itemIds = product.item_ids || [];

            // Group items by their process_id to reconstruct contracts
            const processGroups = {};
            itemIds.forEach(itemId => {
                // Find which process this item belongs to
                const contract = allContracts.find(c => c.items && c.items.some(item => item.item_id === itemId));
                if (contract) {
                    if (!processGroups[contract.process_id]) {
                        processGroups[contract.process_id] = {
                            process_id: contract.process_id,
                            process_name: contract.process_name,
                            items: []
                        };
                    }
                    // Add the specific item to this process group
                    const item = contract.items.find(i => i.item_id === itemId);
                    if (item && !processGroups[contract.process_id].items.some(i => i.item_id === itemId)) {
                        processGroups[contract.process_id].items.push(item);
                    }
                }
            });

            // Add each process group to the item manager
            for (const processIdStr of Object.keys(processGroups)) {
                const processId = parseInt(processIdStr);
                const processInfo = processGroups[processIdStr];  // Access by string key
                const fullProcess = allContracts.find(c => c.process_id === processId);
                if (fullProcess) {
                    // Temporarily override the addProcess behavior to select only specific items
                    await this.itemManager.addProcess(fullProcess);

                    // Set selected items for this process based on the saved data
                    const addedProcess = this.itemManager.contracts.get(processId);
                    if (addedProcess) {
                        // Replace selectedItems with only the items that were selected in the saved product
                        const savedItemIds = processInfo.items.map(i => i.item_id);
                        addedProcess.selectedItems = fullProcess.items.filter(i => savedItemIds.includes(i.item_id));
                    }
                }
            }

            // After setting up all the processes, rebuild the main selected items array
            this.itemManager.rebuildSelectedItems();

            // Restore allocations
            if (product.allocations) {
                this.itemManager.contracts.forEach((contract, processId) => {
                    contract.allocation.providerValues.clear();

                    // Try to get collective allocation first (same for all items)
                    let allocation = null;
                    if (product.allocations.mode && product.allocations.providers) {
                        // Collective format
                        allocation = product.allocations;
                    } else {
                        // Per-item format - try to find allocation for first item
                        const firstItem = contract.selectedItems[0];
                        if (firstItem) {
                            const itemAllocation = product.allocations[firstItem.item_id];
                            if (itemAllocation && itemAllocation.mode && itemAllocation.providers) {
                                allocation = itemAllocation;
                            }
                        }
                    }

                    if (allocation) {
                        contract.allocation.mode = allocation.mode || 'percentage';
                        contract.allocation.providers.forEach(provider => {
                            const allocationData = allocation.providers?.find(p => String(p.provider_id) === String(provider.provider_id));
                            const value = allocationData ? allocationData.value : 0;
                            contract.allocation.providerValues.set(provider.provider_id, value);
                        });
                    } else {
                        // Default to percentage mode with 0 values
                        contract.allocation.mode = 'percentage';
                    }
                });
            }

            // Restore pricing
            if (product.price_multipliers) {
                this.pricing.multipliers = product.price_multipliers;
            } else {
                this.pricing.multipliers = {};
            }

            // Restore forecasting
            this.forecast.loadFromProduct(product);

            // After adding processes, render dropdown to show remaining processes
            this.renderProcessSelect(allContracts);

            // Render UI once after all data is loaded
            this.itemManager.render(this.pricing);
            this.show(true);
        } catch (error) {
            console.error('Error in editProduct:', error);
            Toast.show('Failed to load product: ' + error.message, 'error');
        }
    },

    // Delegate methods for inline handlers
    removeProcess: (processId) => productModal.itemManager.removeProcess(processId),
    toggleProcessItem: (processId, itemId, checked) => productModal.itemManager.toggleProcessItem(processId, itemId, checked),
    toggleProcessSelectAll: (processId, checked) => productModal.itemManager.toggleProcessSelectAll(processId, checked),
    updateProviderValue: (processId, providerId, value) => productModal.itemManager.updateProviderValue(processId, providerId, value),
    toggleAllocationMode: (processId, mode) => productModal.itemManager.toggleAllocationMode(processId, mode),
    lockProvider: (processId, providerId) => productModal.itemManager.lockProvider(processId, providerId)
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    productModal.setupHandlers();
    window.productModal = productModal;
});