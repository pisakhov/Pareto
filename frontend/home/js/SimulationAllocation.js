/**
 * SimulationAllocation - Allocation Optimizer Calculator
 * Allows simulating different provider allocations to see cost/tier impact.
 * Supports "Steady State" (Volume-based Tiering with Strategy) vs "Selected Tier" (Manual) modes.
 */
class SimulationAllocation {
    constructor(containerId) {
        window.simulationAllocation = this;
        this.containerId = containerId;
        this.selectedProcessId = null;
        this.processesList = [];
        this.processItemIds = new Set(); // Items belonging to the selected process

        this.currentAllocations = {};
        this.optimizedAllocations = {};
        
        this.quantities = {}; // Latest actuals for cost calc
        this.productHistory = {}; // Full history for strategy calc (productId -> [{year, month, actual_units}])
        
        this.items = [];
        this.providers = [];
        this.itemProvidersMap = {};
        
        this.currentResult = null;
        this.optimizedResult = null;
        this.delta = { amount: 0, percent: 0 };
        
        this.useManualTiers = false;
        this.strategies = {}; // provider_id -> { method: 'SUM'|'AVG', lookback: int }
    }

    async init() {
        this.renderLoading();
        try {
            await this.loadProcesses();
            
            // Check URL for processId
            const urlParams = new URLSearchParams(window.location.search);
            let processId = parseInt(urlParams.get('processId'));

            // Validate if processId exists in loaded processes
            const processExists = this.processesList.some(p => p.process_id === processId);
            
            if (!processExists && this.processesList.length > 0) {
                processId = this.processesList[0].process_id;
            }

            if (processId) {
                this.updateUrl(processId);
                await this.handleProcessSelection(processId);
            } else {
                this.renderError("No processes available.");
            }
        } catch (error) {
            console.error("SimulationAllocation Init Error:", error);
            this.renderError(error.message);
        }
    }

    updateUrl(processId) {
        if (window.history.pushState) {
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.set('processId', processId);
            window.history.pushState({path: newUrl.href}, '', newUrl.href);
        }
    }

    renderLoading() {
        const container = document.getElementById(this.containerId);
        if (container) {
            container.innerHTML = `
                <div class="text-center py-12">
                    <div class="animate-pulse text-muted-foreground">Loading processes...</div>
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

    async loadProcesses() {
        const response = await fetch('/api/processes');
        if (!response.ok) throw new Error('Failed to fetch processes');
        this.processesList = await response.json();
    }

    async handleProcessSelection(processId) {
        this.selectedProcessId = processId;
        this.updateUrl(processId);
        this.renderLoadingSimulation();
        try {
            await this.loadProcessItems();
            await this.loadSimulationData();
        } catch (error) {
            console.error("Simulation Data Load Error:", error);
            this.renderError(error.message);
        }
    }

    renderLoadingSimulation() {
        const container = document.getElementById(this.containerId);
        if (container) {
            container.innerHTML = `
                <div class="text-center py-12">
                    <div class="animate-pulse text-muted-foreground">Initializing simulation for process...</div>
                </div>`;
        }
    }

    async loadProcessItems() {
        // Fetch contracts structure to find items belonging to this process
        const response = await fetch('/api/contracts');
        if (!response.ok) throw new Error('Failed to load process items');
        
        const allProcessesData = await response.json();
        const currentProcessData = allProcessesData.find(p => p.process_id === this.selectedProcessId);
        
        this.processItemIds.clear();
        if (currentProcessData && currentProcessData.items) {
            currentProcessData.items.forEach(item => {
                this.processItemIds.add(item.item_id);
            });
        }
        
        // Also initialize defaults for contracts if possible (or do it lazy)
    }

    async loadSimulationData() {
        await this.loadProductsAndQuantities();
        await this.loadItemsAndProviders();
        await this.loadItemProviders();
        await this.loadCurrentAllocations();
        
        // Initialize strategies for providers used in this process
        // We can iterate contracts to get default lookups
        await this.initializeStrategies();

        await this.fetchBaseAndCompare();
        this.render();
        this.setupEventHandlers();
    }

    async initializeStrategies() {
        // Fetch contracts for this process to get default strategies
        try {
            const res = await fetch(`/api/contracts/by-process/${this.selectedProcessId}`);
            if (res.ok) {
                const contracts = await res.json();
                for (const contract of contracts) {
                    // Fetch lookup config
                    try {
                        const lookupRes = await fetch(`/api/contract-lookups/${contract.contract_id}`);
                        if (lookupRes.ok) {
                            const lookup = await lookupRes.json();
                            this.strategies[contract.provider_id] = {
                                method: lookup.method || 'SUM',
                                lookback: (lookup.lookback_months || 0) + 1
                            };
                        }
                    } catch (e) {
                        console.warn("Failed to load strategy for contract", contract.contract_id);
                    }
                }
            }
        } catch (e) {
            console.error("Error initializing strategies", e);
        }
    }

    async loadProductsAndQuantities() {
        const response = await fetch('/api/products');
        const products = await response.json();
        
        this.quantities = {};
        this.productHistory = {};
        
        const activeProducts = products.filter(p => p.status === 'active');
        
        await Promise.all(activeProducts.map(async (p) => {
            try {
                const detailRes = await fetch(`/api/products/${p.product_id}`);
                if (detailRes.ok) {
                    const detail = await detailRes.json();
                    const actuals = (detail.actuals || []).filter(a => a.process_id === this.selectedProcessId);
                    
                    if (actuals.length > 0) {
                        // Store history sorted by date desc
                        actuals.sort((a, b) => {
                            if (a.year !== b.year) return b.year - a.year;
                            return b.month - a.month;
                        });
                        
                        this.productHistory[p.product_id] = actuals;

                        // Use latest month's volume for Base Cost calculation
                        const latest = actuals[0];
                        if (latest.actual_units > 0) {
                            this.quantities[p.product_id] = latest.actual_units;
                        }
                    }
                }
            } catch (e) {
                console.warn(`Failed to load details for product ${p.product_id}`, e);
            }
        }));
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
        // Base calc always uses default logic (no overrides)
        const baseRes = await fetch('/api/optimization/cost', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                product_quantities: this.quantities,
                use_manual_tiers: this.useManualTiers
            })
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

    calculateStrategyVolumes() {
        const overrides = {};
        
        // Identify which providers need calculation (those used in optimization)
        const usedProviders = new Set();
        Object.values(this.optimizedAllocations).forEach(p => {
            Object.values(p.items).forEach(i => {
                i.allocations.forEach(a => usedProviders.add(a.provider_id));
            });
        });

        // Ensure strategy defaults exist
        usedProviders.forEach(pid => {
            if (!this.strategies[pid]) {
                this.strategies[pid] = { method: 'SUM', lookback: 3 };
            }
        });

        // Calculate effective volume per provider
        // Logic: For each product, get history. Apply allocation %. Sum up for provider. Then apply Strategy (Rolling).
        // This is complex because allocation % might differ per item.
        // SIMPLIFICATION: Assume Allocation applies uniformly to history as it does to current.
        
        // 1. Build Provider History Stream (aggregated across all products/items)
        // Map<providerId, Map<dateKey, volume>>
        const providerStreams = new Map();
        
        Object.entries(this.optimizedAllocations).forEach(([pid, pdata]) => {
            const productId = parseInt(pid);
            const history = this.productHistory[productId] || [];
            
            Object.values(pdata.items).forEach(itemData => {
                itemData.allocations.forEach(alloc => {
                    const provId = alloc.provider_id;
                    const share = alloc.value; // % or fixed
                    const mode = itemData.mode || 'percentage';
                    
                    if (!providerStreams.has(provId)) providerStreams.set(provId, new Map());
                    const stream = providerStreams.get(provId);
                    
                    history.forEach(h => {
                        const dateKey = `${h.year}-${h.month}`;
                        let allocatedVol = 0;
                        if (mode === 'percentage') {
                            allocatedVol = h.actual_units * (share / 100.0);
                        } else {
                            allocatedVol = share; // Fixed
                        }
                        
                        stream.set(dateKey, (stream.get(dateKey) || 0) + allocatedVol);
                    });
                });
            });
        });

        // 2. Apply Strategy (Rolling Window on the latest date)
        // We assume "Steady State" means "What would be the Tier NOW if we used this Strategy?".
        // So we look at the latest months in the stream.
        
        providerStreams.forEach((stream, provId) => {
            const strategy = this.strategies[provId];
            const lookback = strategy.lookback || 1;
            const method = strategy.method || 'SUM';
            
            // Sort dates desc
            const dates = Array.from(stream.keys()).sort((a, b) => {
                const [y1, m1] = a.split('-').map(Number);
                const [y2, m2] = b.split('-').map(Number);
                return (y2 - y1) || (m2 - m1);
            });
            
            let sum = 0;
            let count = 0;
            
            for (let i = 0; i < lookback; i++) {
                if (i < dates.length) {
                    sum += stream.get(dates[i]);
                    count++;
                }
            }
            
            const effectiveVol = method === 'AVG' ? (count > 0 ? sum / count : 0) : sum;
            overrides[provId] = effectiveVol;
        });

        return overrides;
    }

    async runComparison() {
        let tierOverrides = null;
        if (!this.useManualTiers) {
            tierOverrides = this.calculateStrategyVolumes();
        }

        const response = await fetch('/api/optimization/compare', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                product_quantities: this.quantities,
                optimized_allocations: this.optimizedAllocations,
                use_manual_tiers: this.useManualTiers,
                tier_volume_overrides: tierOverrides
            })
        });
        if (!response.ok) throw new Error('Comparison failed');
        const data = await response.json();
        this.optimizedResult = data.optimized;
        
        // Calculate Delta based on FILTERED totals (Client Side)
        const currentFilteredTotal = this.calculateFilteredTotal(this.currentResult);
        const optimizedFilteredTotal = this.calculateFilteredTotal(this.optimizedResult);
        
        const deltaAmount = optimizedFilteredTotal - currentFilteredTotal;
        const deltaPercent = currentFilteredTotal > 0 ? (deltaAmount / currentFilteredTotal * 100) : 0;

        this.delta = { amount: deltaAmount, percent: deltaPercent };
        
        // Store filtered totals for rendering
        this.currentResult.filteredTotal = currentFilteredTotal;
        this.optimizedResult.filteredTotal = optimizedFilteredTotal;
    }

    calculateFilteredTotal(result) {
        return result.total_cost; // Using backend total
    }

    toggleTierMode(useManual) {
        this.useManualTiers = useManual;
        this.fetchBaseAndCompare().then(() => {
            this.render();
            this.setupEventHandlers();
        });
    }

    updateStrategy(providerId, key, value) {
        if (!this.strategies[providerId]) this.strategies[providerId] = { method: 'SUM', lookback: 3 };
        this.strategies[providerId][key] = value;
        
        // Re-run comparison
        this.runComparison().then(() => {
            this.updateOptimizedDisplay();
        });
    }

    render() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        const processOptions = this.processesList.map(p => 
            `<option value="${p.process_id}" ${p.process_id === this.selectedProcessId ? 'selected' : ''}>${p.process_name}</option>`
        ).join('');

        const deltaClass = this.delta.amount < 0 ? 'text-green-600' : 'text-red-600';
        const deltaIcon = this.delta.amount < 0 ? '↓' : '↑';
        const borderClass = this.delta.amount < 0 ? 'border-green-500' : 'border-red-500';

        container.innerHTML = `
            <div class="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                <div class="flex items-center gap-4">
                    <h2 class="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <span class="text-muted-foreground font-normal">Simulation:</span> 
                    </h2>
                    <select onchange="window.simulationAllocation.handleProcessSelection(parseInt(this.value))" class="px-3 py-1.5 bg-white border border-slate-300 rounded-md text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#023047] focus:border-[#023047]">
                        ${processOptions}
                    </select>
                </div>
                
                <div class="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                    <button onclick="window.simulationAllocation.toggleTierMode(false)" class="px-3 py-1.5 text-sm font-medium rounded-md transition-all ${!this.useManualTiers ? 'bg-white text-[#023047] shadow-sm' : 'text-slate-500 hover:text-slate-700'}">
                        Steady State
                    </button>
                    <button onclick="window.simulationAllocation.toggleTierMode(true)" class="px-3 py-1.5 text-sm font-medium rounded-md transition-all ${this.useManualTiers ? 'bg-white text-[#023047] shadow-sm' : 'text-slate-500 hover:text-slate-700'}">
                        Selected Tier
                    </button>
                </div>
            </div>

            <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <!-- Base Column (Read Only) -->
                <div class="bg-card rounded-lg border border-border p-6 opacity-75">
                    <div class="flex items-center justify-between mb-4">
                        <h2 class="text-xl font-semibold text-muted-foreground">Current State</h2>
                        <span class="text-xs bg-secondary px-2 py-1 rounded text-muted-foreground">Read Only</span>
                    </div>
                    
                    <div class="mb-6">
                        <div class="text-sm text-muted-foreground mb-1">Total Cost (Global)</div>
                        <div class="text-3xl font-bold text-slate-700">${this.formatCurrency(this.currentResult.filteredTotal || this.currentResult.total_cost)}</div>
                    </div>
                    
                    <!-- Detailed Pricing Table for Base -->
                    <div class="mb-6 max-h-[600px] overflow-y-auto pr-2">
                        ${this.renderPricingTable(this.currentResult, false)}
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
                                <div class="text-sm text-muted-foreground mb-1">Simulated Cost (Global)</div>
                                <div class="text-3xl font-bold text-slate-900" id="optimizedCost">${this.formatCurrency(this.optimizedResult.filteredTotal || this.optimizedResult.total_cost)}</div>
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
                    
                    <!-- Editor Controls -->
                    <div class="mb-6">
                        ${this.renderOptimizedControls()}
                    </div>

                    <div class="border-t border-slate-200 pt-4">
                        <h3 class="text-sm font-semibold text-slate-700 mb-3">Simulated Breakdown</h3>
                        <div class="max-h-[400px] overflow-y-auto pr-2" id="simulatedBreakdownContainer">
                            ${this.renderPricingTable(this.optimizedResult, true)}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderPricingTable(result, isSimulated) {
        const breakdown = result.provider_breakdown || {};
        if (Object.keys(breakdown).length === 0) return '<div class="text-sm text-muted-foreground p-4 text-center">No cost data available</div>';

        let html = `
            <div class="overflow-x-auto border border-slate-200 rounded-lg bg-white">
                <table class="w-full text-sm text-left">
                    <thead class="bg-slate-50 text-xs text-slate-500 uppercase border-b border-slate-200">
                        <tr>
                            <th class="px-4 py-3 font-medium border-r border-slate-200">Provider</th>
                            <th class="px-4 py-3 font-medium">Item</th>
                            <th class="px-4 py-3 font-medium text-right">Price</th>
                            <th class="px-4 py-3 font-medium text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 bg-white">
        `;

        Object.entries(breakdown).forEach(([providerName, data]) => {
            const tier = data.tier_info.effective_tier;
            const source = data.tier_info.source || 'calculated';
            const isManual = source === 'manual';
            const rows = data.rows || [];
            
            // Lookup Provider ID (need to find from providers list or from contract)
            const providerObj = this.providers.find(p => p.company_name === providerName);
            const providerId = providerObj ? providerObj.provider_id : null;
            const strategy = providerId ? (this.strategies[providerId] || {method:'SUM', lookback:3}) : null;

            let tierBadgeClass = 'bg-slate-100 text-slate-600 border-slate-200';
            if (tier === 1) tierBadgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
            if (tier === 2) tierBadgeClass = 'bg-blue-50 text-blue-700 border-blue-200';
            if (tier === 3) tierBadgeClass = 'bg-orange-50 text-orange-700 border-orange-200';
            if (tier >= 4) tierBadgeClass = 'bg-red-50 text-red-700 border-red-200';

            // Strategy Controls (Only for Simulated && Steady State)
            let strategyControls = '';
            if (isSimulated && !this.useManualTiers && strategy && providerId) {
                strategyControls = `
                    <div class="mt-3 pt-3 border-t border-slate-100">
                        <div class="flex flex-col gap-2">
                            <div class="flex items-center justify-between text-[10px] uppercase tracking-wider font-bold text-slate-400">
                                <span>Strategy Vol</span>
                                <span class="text-slate-600">${(data.tier_info.lookup_volume || 0).toLocaleString(undefined, {maximumFractionDigits:0})}</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <div class="flex items-center bg-slate-100 p-0.5 rounded text-[10px]">
                                    <button class="px-2 py-1 rounded font-medium transition-all ${strategy.method === 'SUM' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}"
                                        onclick="window.simulationAllocation.updateStrategy(${providerId}, 'method', 'SUM')">SUM</button>
                                    <button class="px-2 py-1 rounded font-medium transition-all ${strategy.method === 'AVG' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}"
                                        onclick="window.simulationAllocation.updateStrategy(${providerId}, 'method', 'AVG')">AVG</button>
                                </div>
                                <div class="flex items-center relative w-14">
                                    <input type="number" value="${strategy.lookback}" min="1"
                                        class="w-full text-center text-[10px] border border-slate-200 rounded px-1 py-1 outline-none focus:border-blue-500"
                                        onchange="window.simulationAllocation.updateStrategy(${providerId}, 'lookback', parseInt(this.value))">
                                    <span class="absolute right-1 text-[8px] text-slate-400 pointer-events-none">m</span>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }

            // Render Rows for this Provider
            rows.forEach((row, index) => {
                const isFirst = index === 0;
                const itemPrice = row.price_per_unit;
                const multiplier = row.multiplier_display;
                
                html += `
                    <tr class="hover:bg-slate-50 transition-colors">
                        ${isFirst ? `
                            <td class="px-4 py-3 font-medium text-slate-900 border-r border-slate-100 bg-slate-50/30 align-top" rowspan="${rows.length}">
                                <div class="font-semibold text-slate-800 mb-2">${providerName}</div>
                                
                                <div class="space-y-1 mb-2">
                                    <div class="flex justify-between items-center text-xs">
                                        <span class="text-slate-400 font-normal">Total Vol</span>
                                        <span class="text-slate-600">${data.total_units.toLocaleString()}</span>
                                    </div>
                                    <div class="flex justify-between items-center text-xs pt-1">
                                        <span class="text-slate-400 font-normal">Tier</span>
                                        <span class="inline-flex items-center gap-1 px-1.5 py-0.5 border text-[10px] font-bold rounded ${tierBadgeClass}">
                                            T${tier}
                                            ${isManual ? '<span title="Manual Override">🔒</span>' : ''}
                                        </span>
                                    </div>
                                </div>
                                
                                <div class="pt-2 border-t border-slate-100 flex justify-between items-baseline">
                                    <span class="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Total</span>
                                    <span class="text-sm font-bold text-slate-700">${this.formatCurrency(data.total_cost)}</span>
                                </div>

                                ${strategyControls}
                            </td>
                        ` : ''}
                        <td class="px-4 py-3 text-slate-600">
                            <div class="font-medium text-xs">${row.item_name}</div>
                            <div class="text-[10px] text-slate-400 mt-0.5">Vol: ${row.allocated_units.toLocaleString()}</div>
                        </td>
                        <td class="px-4 py-3 text-right text-slate-600 align-middle">
                            <div class="font-medium text-xs text-slate-700">$${parseFloat(itemPrice.toFixed(4))}</div>
                            ${multiplier !== '-' ? `<div class="text-[10px] text-orange-500">x${multiplier}</div>` : ''}
                        </td>
                        <td class="px-4 py-3 text-right font-bold text-xs text-slate-700 align-middle">
                            ${this.formatCurrency(row.total_cost)}
                        </td>
                    </tr>
                `;
            });
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;
        return html;
    }

    renderOptimizedControls() {
        const sections = Object.entries(this.optimizedAllocations || {}).map(([productId, pdata]) => {
            const items = (pdata && pdata.items) || {};
            
            const relevantItemIds = Object.keys(items).filter(id => this.processItemIds.has(parseInt(id)));
            if (relevantItemIds.length === 0) return '';

            const firstItemId = relevantItemIds[0];
            const masterAlloc = items[firstItemId];
            const mode = masterAlloc.mode || 'percentage';
            const itemNames = relevantItemIds.map(id => items[id].item_name).join(', ');

            const inputs = (masterAlloc.allocations || []).map((a, idx) => {
                const prov = this.providers.find(p => p.provider_id === a.provider_id);
                const name = prov ? prov.company_name : `Provider ${a.provider_id}`;
                return `
                    <div class="flex items-center gap-2 mb-3 last:mb-0">
                        <span class="text-xs w-24 truncate text-slate-600 font-medium" title="${name}">${name}</span>
                        <div class="flex-1 flex items-center gap-2">
                            <input type="range" min="0" max="${mode === 'percentage' ? 100 : 100000}" step="${mode === 'percentage' ? 1 : 100}" 
                                value="${a.value}" 
                                class="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#023047] hover:accent-[#fb923c] transition-all"
                                oninput="this.nextElementSibling.value = this.value"
                                data-product-id="${productId}" data-provider-id="${a.provider_id}" data-mode="${mode}"
                            >
                            <input type="number" min="0" step="${mode === 'percentage' ? '1' : '100'}" value="${a.value}" 
                                class="w-14 px-1 py-1 border border-slate-200 rounded text-xs text-center font-medium focus:ring-2 focus:ring-[#023047] focus:outline-none"
                                onchange="this.previousElementSibling.value = this.value; this.previousElementSibling.dispatchEvent(new Event('change', {bubbles: true}))"
                            >
                            <span class="text-[10px] text-slate-400 w-3 font-medium">${mode === 'percentage' ? '%' : '#'}</span>
                        </div>
                    </div>
                `;
            }).join('');

            return `
                <div class="mb-4 border-l-4 border-[#023047] pl-3 py-2 bg-slate-50 rounded-r-md">
                    <div class="flex items-center justify-between mb-2">
                        <div class="text-sm font-bold text-slate-800 truncate pr-2">${pdata.product_name}</div>
                        <span class="text-[10px] bg-white border border-slate-200 text-slate-500 px-1.5 py-0.5 rounded uppercase font-bold">${mode}</span>
                    </div>
                    <div class="mb-2">
                        ${inputs || '<span class="text-xs text-muted-foreground">No providers</span>'}
                    </div>
                    <div class="text-[10px] text-slate-400 truncate" title="${itemNames}">
                        Applying to: ${itemNames}
                    </div>
                </div>
            `;
        }).join('');
        return sections || '<div class="text-sm text-muted-foreground">No allocations to edit</div>';
    }

    setupEventHandlers() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        // Use event delegation for better performance with many inputs
        container.addEventListener('change', async (e) => {
            if (e.target.matches('input[type="range"]') || (e.target.matches('input[type="number"]') && e.target.previousElementSibling?.matches('input[type="range"]'))) {
                const input = e.target.matches('input[type="range"]') ? e.target : e.target.previousElementSibling; // Handle number input sync
                if (!input) return; 

                const productId = input.dataset.productId;
                const providerId = parseInt(input.dataset.providerId);
                const value = parseFloat(e.target.value) || 0;

                // Update model for ALL relevant items in this product
                const pdata = this.optimizedAllocations[productId];
                if (pdata && pdata.items) {
                    Object.keys(pdata.items).forEach(itemId => {
                        if (this.processItemIds.has(parseInt(itemId))) {
                            const itemAlloc = pdata.items[itemId];
                            const alloc = itemAlloc.allocations.find(a => a.provider_id === providerId);
                            if (alloc) {
                                alloc.value = value;
                            }
                        }
                    });
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
        const breakdownContainer = container.querySelector('#simulatedBreakdownContainer');
        const simulatorCard = container.querySelector('.bg-card.border-2'); // The simulator card

        if (costEl) costEl.textContent = this.formatCurrency(this.optimizedResult.filteredTotal || this.optimizedResult.total_cost);
        
        if (impactEl) {
            const deltaClass = this.delta.amount < 0 ? 'text-green-600' : 'text-red-600';
            const deltaIcon = this.delta.amount < 0 ? '↓' : '↑';
            impactEl.className = `${deltaClass} text-lg font-bold flex items-center gap-1`;
            impactEl.innerHTML = `${deltaIcon} ${this.formatCurrency(Math.abs(this.delta.amount))} <span class="text-sm font-normal opacity-80">(${this.delta.percent > 0 ? '+' : ''}${this.delta.percent.toFixed(1)}%)</span>`;
        }

        if (breakdownContainer) {
            breakdownContainer.innerHTML = this.renderPricingTable(this.optimizedResult, true);
        }

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