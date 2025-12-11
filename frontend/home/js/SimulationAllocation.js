/**
 * SimulationAllocation - Cost Strategy Simulator
 * Visualizes cost impact against provider allocations using bar charts.
 * View Mode: Sidebar Process Navigation (Master-Detail) - Inspired by SimulationLookupStrategyForecast.js
 */
class SimulationAllocation {
    constructor(containerId) {
        window.simulationAllocation = this;
        this.containerId = containerId;
        this.processes = [];
        this.selectedProcessId = null;
        this.charts = [];
        this.referenceDateKey = null;
        this.tierMode = 'billed'; // default: 'raw' | 'effective' | 'billed'
    }

    async init() {
        if (document.getElementById('sim_cost_content')) {
            const urlParams = new URLSearchParams(window.location.search);
            let processId = parseInt(urlParams.get('processId'));
            if (processId && processId !== this.selectedProcessId) {
                this.selectProcess(processId);
            }
            return;
        }

        this.renderLoading();
        try {
            await this.loadProcesses();
            this.renderInitialState();

            const urlParams = new URLSearchParams(window.location.search);
            let processId = parseInt(urlParams.get('processId'));
            const processExists = this.processes.some(p => p.process_id === processId);

            if (!processExists && this.processes.length > 0) {
                processId = this.processes[0].process_id;
            }

            if (processId) {
                this.selectProcess(processId);
            }
        } catch (error) {
            console.error("Cost Simulation Init Error:", error);
            this.renderError(error.message);
        }
    }

    updateUrl(processId) {
        if (window.history.pushState) {
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.set('processId', processId);
            window.history.pushState({ path: newUrl.href }, '', newUrl.href);
        }
    }

    renderLoading() {
        const container = document.getElementById(this.containerId);
        if (container) {
            container.innerHTML = `
                <div class="text-center py-12">
                    <div class="animate-pulse text-muted-foreground">Loading cost simulation data...</div>
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
        if (!response.ok) throw new Error("Failed to load processes");
        const allProcesses = await response.json();
        this.processes = allProcesses.filter(p => p.status === 'active');
    }

    renderInitialState() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="flex flex-col h-[800px] border border-slate-200 rounded-xl bg-white overflow-hidden shadow-sm relative isolate">
                <!-- Top Navigation Bar -->
                <div class="shrink-0 bg-white border-b border-slate-200 flex flex-col z-20 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]">
                    <div class="px-6 py-4 flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <div class="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </div>
                            <div>
                                <h2 class="text-sm font-bold text-slate-800 uppercase tracking-wider">Cost Strategy</h2>
                                <p class="text-xs text-slate-500">Select a process below to simulate costs</p>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Process Tabs (Horizontal Scroll) -->
                    <div class="px-6 pb-4 overflow-x-auto custom-scrollbar">
                        <div id="sim_cost_process_list" class="flex items-center gap-3 min-w-max">
                            <!-- Items rendered via renderProcessList() -->
                        </div>
                    </div>
                </div>

                <!-- Main Content: Analysis Area -->
                <div class="flex-1 flex flex-col bg-slate-50/50 overflow-hidden min-h-0 relative">
                    <div id="sim_cost_header" class="hidden h-14 border-b border-slate-200/60 flex items-center px-8 bg-white/80 backdrop-blur-sm z-10 shrink-0 justify-between">
                         <!-- Header content injected dynamically -->
                    </div>
                    
                    <div id="sim_cost_content" class="flex-1 overflow-y-auto custom-scrollbar p-8 min-h-0 max-h-full">
                        <div class="h-full flex flex-col items-center justify-center text-slate-400">
                            <div class="w-16 h-16 mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                                <svg class="w-8 h-8 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                            </div>
                            <p class="text-lg font-medium text-slate-600">Select a process from the tabs above</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.renderProcessList();
    }

    renderProcessList() {
        const listContainer = document.getElementById('sim_cost_process_list');
        if (!listContainer) return;

        listContainer.innerHTML = '';

        if (this.processes.length === 0) {
            listContainer.innerHTML = `<div class="text-sm text-slate-400 italic px-2">No active processes found.</div>`;
            return;
        }

        this.processes.forEach(p => {
            const isSelected = String(p.process_id) === String(this.selectedProcessId);

            const btn = document.createElement('button');
            const baseClass = "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all border shadow-sm whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-emerald-500";
            const selectedClass = "bg-slate-800 text-white border-slate-800 hover:bg-slate-700";
            const defaultClass = "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-900 hover:shadow";

            btn.className = `${baseClass} ${isSelected ? selectedClass : defaultClass}`;
            btn.innerHTML = `
                <span>${p.process_name}</span>
                ${isSelected ? '<svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>' : ''}
            `;

            btn.addEventListener('click', () => this.selectProcess(p.process_id));
            listContainer.appendChild(btn);
        });
    }

    selectProcess(processId) {
        this.selectedProcessId = processId;
        this.updateUrl(processId);
        this.renderProcessList();
        this.loadAndRenderProcessAnalysis(processId);
    }

    async loadAndRenderProcessAnalysis(processId) {
        const content = document.getElementById('sim_cost_content');
        const header = document.getElementById('sim_cost_header');

        const process = this.processes.find(p => String(p.process_id) === String(processId));
        if (!process) {
            content.innerHTML = '<div class="p-4 text-red-600">Error: Process data not found.</div>';
            return;
        }

        header.classList.remove('hidden');
        header.innerHTML = `
            <div>
                <h3 class="text-xl font-bold text-slate-800">${process.process_name}</h3>
                <p class="text-sm text-slate-500">Provider Cost Analysis & Allocation Strategy</p>
            </div>
            <div class="text-xs text-slate-400">
                Tier mode per provider below
            </div>
        `;

        content.innerHTML = '<div class="h-full flex items-center justify-center"><div class="flex flex-col items-center gap-3"><div class="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div><p class="text-sm text-slate-500">Calculating costs...</p></div></div>';

        this.charts.forEach(c => c.destroy());
        this.charts = [];

        try {
            // 1. Fetch Contracts (Providers)
            const contractsRes = await fetch(`/api/contracts/by-process/${processId}`);
            const contracts = await contractsRes.json();

            if (contracts.length === 0) {
                content.innerHTML = `
                    <div class="flex flex-col items-center justify-center h-64 text-center">
                        <div class="w-12 h-12 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mb-3">
                             <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        </div>
                        <h3 class="text-lg font-medium text-slate-900">No Contracts Found</h3>
                        <p class="text-slate-500 max-w-xs mt-1">Add contracts to this process to begin cost analysis.</p>
                    </div>`;
                return;
            }

            // 2. Fetch Products with actuals/forecasts
            const productsRes = await fetch('/api/products');
            const allProducts = await productsRes.json();
            const activeProducts = allProducts.filter(p => p.status === 'active');

            // 3. Build timeline from actuals
            const actualsRes = await fetch('/api/actuals');
            const allActuals = await actualsRes.json();
            const processActuals = allActuals.filter(a => String(a.process_id) === String(processId));

            const forecastsRes = await fetch('/api/forecasts');
            const allForecasts = await forecastsRes.json();
            const processForecasts = allForecasts.filter(f => String(f.process_id) === String(processId));

            const timelineMap = new Map();
            processActuals.forEach(a => {
                const key = `${a.year}-${a.month}`;
                timelineMap.set(key, {
                    year: a.year,
                    month: a.month,
                    label: `${new Date(a.year, a.month - 1).toLocaleDateString('en-US', { month: 'short' })} '${String(a.year).slice(2)}`,
                    source: 'actual'
                });
            });
            processForecasts.forEach(f => {
                const key = `${f.year}-${f.month}`;
                if (!timelineMap.has(key)) {
                    timelineMap.set(key, {
                        year: f.year,
                        month: f.month,
                        label: `${new Date(f.year, f.month - 1).toLocaleDateString('en-US', { month: 'short' })} '${String(f.year).slice(2)}`,
                        source: 'forecast'
                    });
                }
            });

            const timeline = Array.from(timelineMap.values())
                .sort((a, b) => (a.year - b.year) || (a.month - b.month));

            if (timeline.length === 0) {
                content.innerHTML = `
                    <div class="flex flex-col items-center justify-center h-64 text-center">
                        <div class="w-12 h-12 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-3">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <h3 class="text-lg font-medium text-slate-900">No Volume Data</h3>
                        <p class="text-slate-500 max-w-sm mt-1">No actuals or forecasts found for this process.</p>
                    </div>`;
                return;
            }

            // Default to current month
            const now = new Date();
            const currentPeriod = timeline.find(t => t.year === now.getFullYear() && t.month === now.getMonth() + 1);
            this.referenceDateKey = currentPeriod
                ? `${currentPeriod.year}-${currentPeriod.month}`
                : `${timeline[timeline.length - 1].year}-${timeline[timeline.length - 1].month}`;

            // 4. Build providers with strategy info and tier data
            const providers = await Promise.all(contracts.map(async (contract, idx) => {
                const lookupRes = await fetch(`/api/contract-lookups/${contract.contract_id}`);
                const lookupData = await lookupRes.json();

                // Fetch tier data
                const tiersRes = await fetch(`/api/contract-tiers/${contract.contract_id}`);
                const tiersData = await tiersRes.json();
                const selectedTier = tiersData.find(t => t.is_selected);
                const billedTierNum = selectedTier ? selectedTier.tier_number : 1;

                // Fetch Offers for this provider
                const offersRes = await fetch(`/api/offers/provider/${contract.provider_id}`);
                const offersData = await offersRes.json();
                
                // Map offers: itemId -> tierNum -> price
                const offerMap = {};
                offersData.forEach(o => {
                    // Filter by process if needed, assuming generic items for now or strict process match
                    if (o.process_id === processId) {
                        if (!offerMap[o.item_id]) offerMap[o.item_id] = {};
                        offerMap[o.item_id][o.tier_number] = o.price_per_unit;
                    }
                });

                return {
                    id: contract.provider_id,
                    name: contract.provider_name || contract.contract_name,
                    contractId: contract.contract_id,
                    tierMode: 'billed', // per-provider: 'raw' | 'effective' | 'billed' | 'manual'
                    tiers: tiersData.sort((a, b) => a.threshold_units - b.threshold_units),
                    billedTier: billedTierNum,
                    rawTier: 1, // calculated later
                    effectiveTier: 1, // calculated later
                    manualTier: 1, // default manual tier
                    offerMap: offerMap,
                    strategy: {
                        method: lookupData.method || 'SUM',
                        lookback: (lookupData.lookback_months || 0) + 1
                    },
                    color: this.getProviderColor(idx),
                    costHistory: []
                };
            }));

            // 5. Build products with allocations
            const uniqueProductIds = [...new Set([...processActuals.map(a => a.product_id), ...processForecasts.map(f => f.product_id)])];

            const products = await Promise.all(uniqueProductIds.map(async (pid) => {
                const detailRes = await fetch(`/api/products/${pid}`);
                const details = await detailRes.json();
                
                // Ensure item_ids is available (it comes from the API response structure)
                // If not directly on top, check if it's in the response structure from router
                // Based on router code: _format_product_summary includes 'item_ids'
                const itemIds = details.item_ids || [];
                const multipliers = details.price_multipliers || {};

                const pActuals = processActuals.filter(a => a.product_id === pid);
                const pForecasts = processForecasts.filter(f => f.product_id === pid);

                const stream = timeline.map(t => {
                    const act = pActuals.find(a => a.year === t.year && a.month === t.month);
                    if (act) return Number(act.actual_units);
                    const fc = pForecasts.find(f => f.year === t.year && f.month === t.month);
                    return fc ? Number(fc.forecast_units) : 0;
                });

                const actualStream = timeline.map(t => {
                    const act = pActuals.find(a => a.year === t.year && a.month === t.month);
                    return act ? Number(act.actual_units) : null;
                });

                const forecastStream = timeline.map(t => {
                    const fc = pForecasts.find(f => f.year === t.year && f.month === t.month);
                    return fc ? Number(fc.forecast_units) : null;
                });

                // Parse allocations
                const allocations = {};
                let allocMode = 'percentage';

                if (details.allocations) {
                    if (details.allocations.providers) {
                        allocMode = details.allocations.mode || 'percentage';
                        details.allocations.providers.forEach(p => {
                            allocations[p.provider_id] = p.value;
                        });
                    } else {
                        const itemKeys = Object.keys(details.allocations).filter(k => !isNaN(parseInt(k)));
                        if (itemKeys.length > 0) {
                            const firstKey = itemKeys[0];
                            if (details.allocations[firstKey]?.providers) {
                                allocMode = details.allocations[firstKey].mode || 'percentage';
                                details.allocations[firstKey].providers.forEach(p => {
                                    allocations[p.provider_id] = p.value;
                                });
                            }
                        }
                    }
                }

                providers.forEach(p => {
                    if (allocations[p.id] === undefined) {
                        allocations[p.id] = providers.length === 1 ? (allocMode === 'percentage' ? 100 : 0) : 0;
                    }
                });

                return {
                    id: pid,
                    name: details.name,
                    description: details.description,
                    itemIds,
                    multipliers,
                    allocMode,
                    allocations,
                    rawStream: stream,
                    actualStream,
                    forecastStream,
                    totalVolume: stream.reduce((a, b) => a + b, 0)
                };
            }));

            // 6. Render Layout
            content.innerHTML = `
                <div class="flex flex-col lg:flex-row h-full gap-6">
                    <!-- Left: Provider Cost Charts -->
                    <div class="lg:w-[60%] flex flex-col min-h-0">
                        <div class="flex items-center justify-between mb-3 px-1">
                            <h4 class="font-bold text-slate-700 flex items-center gap-2">
                                <span class="bg-slate-100 p-1 rounded text-slate-500">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                                </span>
                                Provider Cost History
                            </h4>
                            <span class="text-xs text-slate-400">${providers.length} Providers</span>
                        </div>
                        <div id="provider_cost_charts" class="flex-1 overflow-y-auto custom-scrollbar space-y-6 pr-2 pb-4">
                            <!-- Charts injected here -->
                        </div>
                    </div>

                    <!-- Right: Product Allocations -->
                    <div class="lg:w-[40%] flex flex-col min-h-0 border-t lg:border-t-0 lg:border-l border-slate-200 lg:pl-6 pt-6 lg:pt-0">
                        <div class="flex items-center justify-between mb-3 px-1">
                            <h4 class="font-bold text-slate-700 flex items-center gap-2">
                                <span class="bg-slate-100 p-1 rounded text-slate-500">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                </span>
                                Product Allocations
                            </h4>
                            <span class="text-xs text-slate-400">${products.length} Products</span>
                        </div>
                        <div id="product_alloc_controls" class="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2 pb-4">
                            <!-- Controls injected here -->
                        </div>
                    </div>
                </div>
            `;

            // 7. Initialize Views
            this.renderProviderCostCharts(providers, products, timeline);
            this.renderProductAllocControls(products, providers, timeline);

            // 8. Initial Calculation
            this.updateCostSimulation(providers, products, timeline);

        } catch (error) {
            console.error("Analysis Error:", error);
            content.innerHTML = `<div class="p-6 bg-red-50 text-red-600 rounded-lg border border-red-100">Analysis failed: ${error.message}</div>`;
        }
    }

    renderProviderCostCharts(providers, products, timeline) {
        const container = document.getElementById('provider_cost_charts');
        container.innerHTML = '';

        providers.forEach(p => {
            const card = document.createElement('div');
            card.className = "bg-white border border-slate-200 rounded-xl shadow-sm p-4 relative group";
            card.id = `provider-card-${p.id}`;
            card.innerHTML = `
                <div class="flex justify-between items-start mb-4">
                    <div class="flex-1">
                        <h5 class="font-bold text-slate-800">${p.name}</h5>
                        
                        <!-- Per-Provider Tier Mode Toggle -->
                        <div class="flex items-center gap-1.5 mt-2 tier-mode-toggle" data-provider-id="${p.id}">
                            <button data-mode="raw" class="tier-mode-btn px-2 py-0.5 text-[10px] font-bold rounded transition-all ${p.tierMode === 'raw' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}">
                                Raw <span class="tier-num" id="raw-tier-${p.id}">T${p.rawTier}</span>
                            </button>
                            <button data-mode="effective" class="tier-mode-btn px-2 py-0.5 text-[10px] font-bold rounded transition-all ${p.tierMode === 'effective' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}">
                                Eff <span class="tier-num" id="eff-tier-${p.id}">T${p.effectiveTier}</span>
                            </button>
                            <button data-mode="billed" class="tier-mode-btn px-2 py-0.5 text-[10px] font-bold rounded transition-all ${p.tierMode === 'billed' ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}">
                                Billed <span class="tier-num" id="billed-tier-${p.id}">T${p.billedTier}</span>
                            </button>
                            <button data-mode="manual" class="tier-mode-btn px-2 py-0.5 text-[10px] font-bold rounded transition-all ${p.tierMode === 'manual' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}">
                                Manual <span class="tier-num" id="manual-tier-badge-${p.id}">T${p.manualTier}</span>
                            </button>
                        </div>
                        
                        <!-- Strategy Controls - Only active in Effective mode -->
                        <div class="flex items-center gap-2 mt-2 strategy-controls ${p.tierMode === 'effective' ? '' : 'hidden'}" data-provider-id="${p.id}">
                            <div class="flex bg-slate-100 rounded-md p-0.5 shrink-0">
                                <button class="px-2 py-0.5 rounded text-[10px] font-bold transition-all strategy-btn ${p.strategy.method === 'SUM' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}" 
                                        data-provider-id="${p.id}" data-method="SUM">SUM</button>
                                <button class="px-2 py-0.5 rounded text-[10px] font-bold transition-all strategy-btn ${p.strategy.method === 'AVG' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}" 
                                        data-provider-id="${p.id}" data-method="AVG">AVG</button>
                            </div>
                            
                            <div class="flex items-center bg-slate-100 rounded-md px-2 py-0.5 border border-transparent focus-within:border-emerald-300 focus-within:ring-1 focus-within:ring-emerald-200 transition-all">
                                <input type="number" 
                                    class="w-8 bg-transparent text-[10px] font-bold text-slate-700 text-center outline-none p-0 strategy-lookback" 
                                    data-provider-id="${p.id}"
                                    value="${p.strategy.lookback}" 
                                    min="1">
                                <span class="text-[10px] text-slate-400 ml-1">mo</span>
                            </div>
                        </div>

                        <!-- Manual Controls - Only active in Manual mode -->
                        <div class="flex items-center gap-2 mt-2 manual-controls ${p.tierMode === 'manual' ? '' : 'hidden'}" data-provider-id="${p.id}">
                             <select class="manual-tier-select text-[10px] font-bold text-slate-700 bg-slate-100 rounded-md border-0 py-0.5 pl-2 pr-6 focus:ring-1 focus:ring-purple-500 cursor-pointer" data-provider-id="${p.id}">
                                ${p.tiers.map(t => `<option value="${t.tier_number}" ${t.tier_number === p.manualTier ? 'selected' : ''}>Tier ${t.tier_number}</option>`).join('')}
                             </select>
                        </div>

                        <!-- Cost Mix Chart Toggle -->
                        <button class="mix-toggle-btn ml-2 p-1 rounded text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all" 
                                data-provider-id="${p.id}" title="Toggle Cost Breakdown">
                            <svg class="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>
                        </button>
                    </div>
                    <div class="text-right">
                        <div class="text-2xl font-bold text-slate-900" id="cost-total-${p.id}">$0</div>
                        <div class="text-[10px] text-slate-400 uppercase tracking-wider">Month Cost</div>
                        <div class="text-[10px] mt-1 px-2 py-0.5 rounded font-bold" id="active-tier-badge-${p.id}">
                            Using T${p.billedTier}
                        </div>
                    </div>
                </div>
                <div class="flex h-[200px] relative">
                    <div class="flex-1 min-w-0 transition-all duration-300 ease-out">
                        <canvas id="chart-cost-${p.id}"></canvas>
                    </div>
                    <!-- Cost Mix Pie (Slide-Out) -->
                    <div id="mix-chart-wrapper-${p.id}" class="w-0 opacity-0 transition-all duration-300 ease-out flex flex-col border-l border-slate-100 bg-slate-50/50 overflow-hidden whitespace-nowrap">
                         <div class="text-[9px] font-bold text-slate-400 mb-1 text-center uppercase tracking-wider truncate mt-2 px-2">
                            Cost Mix
                         </div>
                         <div class="flex-1 flex items-center justify-center min-h-0 pb-1">
                             <div class="relative w-32 h-32">
                                 <canvas id="chart-cost-mix-${p.id}"></canvas>
                                 <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <span class="text-[10px] font-bold text-slate-400" id="mix-total-${p.id}"></span>
                                 </div>
                             </div>
                         </div>
                    </div>
                </div>
            `;
            container.appendChild(card);

            // Create Bar Chart
            const ctx = document.getElementById(`chart-cost-${p.id}`).getContext('2d');
            const chart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: timeline.map(t => t.label),
                    datasets: []
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: { mode: 'index', intersect: false },
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            titleColor: '#1e293b',
                            bodyColor: '#475569',
                            borderColor: '#e2e8f0',
                            borderWidth: 1,
                            callbacks: {
                                label: (ctx) => {
                                    let label = ctx.dataset.label || '';
                                    if (label) label += ': ';
                                    label += new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(ctx.parsed.y);
                                    return label;
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: { color: '#f8fafc' },
                            ticks: {
                                font: { size: 10 },
                                callback: (value) => '$' + value.toLocaleString()
                            }
                        },
                        x: {
                            grid: { display: false },
                            ticks: { maxTicksLimit: 8, font: { size: 10 } }
                        }
                    }
                }
            });

            // Create Mix Chart Instance
            const mixCtx = document.getElementById(`chart-cost-mix-${p.id}`).getContext('2d');
            p.mixChartInstance = new Chart(mixCtx, {
                type: 'doughnut',
                data: { labels: [], datasets: [] },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '70%',
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                title: (tooltipItems) => {
                                    return tooltipItems[0].label;
                                },
                                label: (ctx) => {
                                    let val = ctx.parsed;
                                    let total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                                    let pct = total > 0 ? (val / total) * 100 : 0;
                                    return [
                                        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val),
                                        `${pct.toFixed(1)}%`
                                    ];
                                }
                            }
                        }
                    }
                }
            });

            p.chartInstance = chart;
            this.charts.push(chart);
            this.charts.push(p.mixChartInstance);
        });

        // Event Delegation for per-provider tier mode toggle
        container.addEventListener('click', (e) => {
            const tierBtn = e.target.closest('.tier-mode-btn');
            if (tierBtn) {
                const toggle = tierBtn.closest('.tier-mode-toggle');
                const provId = parseInt(toggle.dataset.providerId);
                const mode = tierBtn.dataset.mode;

                const provider = providers.find(p => p.id === provId);
                if (provider) {
                    provider.tierMode = mode;
                    this.setProviderTierMode(provider, providers, products, timeline);
                }
                return;
            }

            // Strategy button handler
            if (e.target.classList.contains('strategy-btn')) {
                const provId = parseInt(e.target.dataset.providerId);
                const method = e.target.dataset.method;

                const provider = providers.find(p => p.id === provId);
                if (provider) {
                    provider.strategy.method = method;

                    const parent = e.target.parentElement;
                    parent.querySelectorAll('.strategy-btn').forEach(b => {
                        const isSelected = b.dataset.method === method;
                        b.className = `px-2 py-0.5 rounded text-[10px] font-bold transition-all strategy-btn ${isSelected ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}`;
                    });

                    this.updateCostSimulation(providers, products, timeline);
                }
            }

            // Mix Toggle Button
            const mixBtn = e.target.closest('.mix-toggle-btn');
            if (mixBtn) {
                const provId = parseInt(mixBtn.dataset.providerId);
                const wrapper = document.getElementById(`mix-chart-wrapper-${provId}`);
                
                if (wrapper) {
                    const isClosed = wrapper.classList.contains('w-0');
                    
                    if (isClosed) {
                        wrapper.classList.remove('w-0', 'opacity-0');
                        wrapper.classList.add('w-40', 'opacity-100', 'pl-2');
                        mixBtn.classList.add('bg-emerald-50', 'text-emerald-600');
                        mixBtn.classList.remove('text-slate-400');
                    } else {
                        wrapper.classList.add('w-0', 'opacity-0');
                        wrapper.classList.remove('w-40', 'opacity-100', 'pl-2');
                        mixBtn.classList.remove('bg-emerald-50', 'text-emerald-600');
                        mixBtn.classList.add('text-slate-400');
                    }
                }
            }
        });

        container.addEventListener('input', (e) => {
            if (e.target.classList.contains('strategy-lookback')) {
                const provId = parseInt(e.target.dataset.providerId);
                const val = parseInt(e.target.value) || 1;

                const provider = providers.find(p => p.id === provId);
                if (provider) {
                    provider.strategy.lookback = val;
                    this.updateCostSimulation(providers, products, timeline);
                }
            }
            
            // Manual tier select change
            if (e.target.classList.contains('manual-tier-select')) {
                const provId = parseInt(e.target.dataset.providerId);
                const val = parseInt(e.target.value);
                
                const provider = providers.find(p => p.id === provId);
                if (provider) {
                    provider.manualTier = val;
                    this.updateCostSimulation(providers, products, timeline);
                }
            }
        });

        // Store session data
        this.currentSessionData = { providers, products, timeline };
    }

    renderProductAllocControls(products, providers, timeline) {
        const container = document.getElementById('product_alloc_controls');
        container.innerHTML = '';

        const refIndex = timeline.findIndex(t => `${t.year}-${t.month}` === this.referenceDateKey);

        // Month Selector Header
        const header = document.createElement('div');
        header.className = "sticky top-0 bg-white/95 backdrop-blur-sm pb-4 border-b border-slate-100 mb-4 z-10";

        const selectHtml = timeline.map(t => {
            const key = `${t.year}-${t.month}`;
            return `<option value="${key}" ${key === this.referenceDateKey ? 'selected' : ''}>${t.label} (${t.source === 'actual' ? 'Act' : 'Fcst'})</option>`;
        }).join('');

        header.innerHTML = `
            <div class="flex justify-between items-center">
                <label class="text-xs font-bold text-slate-500 uppercase tracking-wider">Analysis Month</label>
                <div class="relative">
                    <select id="ref-cost-month-select" class="appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium rounded-md pl-3 pr-8 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer">
                        ${selectHtml}
                    </select>
                    <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                        <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(header);

        // Product Cards
        products.forEach(prod => {
            const card = document.createElement('div');
            card.className = "bg-white border border-slate-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow mb-4";

            const monthVol = refIndex >= 0 && prod.rawStream[refIndex] !== undefined ? prod.rawStream[refIndex] : 0;

            const slidersHtml = providers.map(prov => {
                const share = prod.allocations[prov.id] || 0;

                return `
                <div class="mb-3 last:mb-0">
                    <div class="flex justify-between items-center mb-1">
                        <label class="text-xs font-medium text-slate-600 flex items-center gap-1.5">
                            <span class="w-2 h-2 rounded-full" style="background-color: ${prov.color}"></span>
                            ${prov.name}
                        </label>
                        <span class="text-xs font-mono font-bold text-slate-700" id="alloc-disp-${prod.id}-${prov.id}">
                            ${prod.allocMode === 'percentage' ? share + '%' : share.toLocaleString() + ' u'}
                        </span>
                    </div>
                    <div class="flex items-center gap-2">
                        <input type="range" 
                            class="flex-1 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-600 allocation-slider"
                            data-prod-id="${prod.id}"
                            data-prov-id="${prov.id}"
                            min="0" 
                            max="${prod.allocMode === 'percentage' ? 100 : 100000}" 
                            step="${prod.allocMode === 'percentage' ? 1 : 100}"
                            value="${share}">
                    </div>
                </div>
            `}).join('');

            card.innerHTML = `
                <div class="flex justify-between items-start mb-3">
                    <div>
                        <div class="font-bold text-sm text-slate-800">${prod.name}</div>
                        <div class="text-xs text-slate-400 truncate max-w-[200px]">${prod.description || ''}</div>
                    </div>
                    <div class="flex flex-col items-end">
                        <div class="text-[10px] font-bold text-emerald-600">
                            ${timeline[refIndex]?.label}: ${monthVol.toLocaleString()}
                        </div>
                    </div>
                </div>
                <div class="bg-slate-50/50 rounded-lg p-3 border border-slate-100">
                    ${slidersHtml}
                </div>
            `;

            container.appendChild(card);
        });

        // Month Selector Listener
        const select = document.getElementById('ref-cost-month-select');
        if (select) {
            select.addEventListener('change', (e) => {
                this.referenceDateKey = e.target.value;
                this.renderProductAllocControls(products, providers, timeline);
                this.updateCostSimulation(providers, products, timeline);
            });
        }

        // Slider Listeners
        container.querySelectorAll('.allocation-slider').forEach(slider => {
            slider.addEventListener('input', (e) => {
                const prodId = parseInt(e.target.dataset.prodId);
                const provId = parseInt(e.target.dataset.provId);
                const val = parseFloat(e.target.value);

                const product = products.find(p => p.id === prodId);
                if (product) {
                    product.allocations[provId] = val;

                    // Update display
                    const disp = document.getElementById(`alloc-disp-${prodId}-${provId}`);
                    if (disp) {
                        disp.textContent = product.allocMode === 'percentage' ? val + '%' : val.toLocaleString() + ' u';
                    }

                    this.updateCostSimulation(providers, products, timeline);
                }
            });
        });
    }

    updateCostSimulation(providers, products, timeline) {
        const refIndex = timeline.findIndex(t => `${t.year}-${t.month}` === this.referenceDateKey);

        // 1. Calculate Raw Volume Stream per Provider (for all months)
        // This is needed first because 'Effective' tier calculation relies on historical raw volumes
        providers.forEach(p => {
            p.rawVolumeStream = timeline.map((t, idx) => {
                let totalVol = 0;
                products.forEach(prod => {
                    const alloc = prod.allocations[p.id] || 0;
                    
                    // Dynamic Volume Selection based on Simulation Horizon
                    // If month is <= selected Analysis Month: Treat as Actual (Past/Present)
                    // If month is > selected Analysis Month: Treat as Forecast (Future)
                    let monthVol = 0;
                    if (idx <= refIndex) {
                        // Priority: Actual > Forecast
                        monthVol = prod.actualStream[idx] !== null ? prod.actualStream[idx] : (prod.forecastStream[idx] || 0);
                    } else {
                        // Priority: Forecast > Actual
                        monthVol = prod.forecastStream[idx] !== null ? prod.forecastStream[idx] : (prod.actualStream[idx] || 0);
                    }

                    let allocatedVol = 0;
                    if (prod.allocMode === 'percentage') {
                        allocatedVol = monthVol * (alloc / 100.0);
                    } else {
                        allocatedVol = alloc;
                    }
                    totalVol += allocatedVol;
                });
                return totalVol;
            });
        });

        // 2. Calculate Cost per Provider per Month
        providers.forEach(p => {
            const costHistory = timeline.map((t, idx) => {
                
                // --- Step A: Determine Tier ---
                let activeTier = 1;

                if (p.tierMode === 'billed') {
                    activeTier = p.billedTier;
                } else if (p.tierMode === 'manual') {
                    activeTier = p.manualTier;
                } else {
                    // Calculate Volume for Tier Lookup
                    let lookupVol = p.rawVolumeStream[idx];

                    if (p.tierMode === 'effective') {
                        // Apply Strategy (Lookback)
                        const lookback = p.strategy.lookback || 1;
                        let sum = 0;
                        let count = 0;

                        // Sum previous months (including current)
                        for (let i = 0; i < lookback; i++) {
                            const histIdx = idx - i;
                            if (histIdx >= 0) {
                                sum += p.rawVolumeStream[histIdx];
                                count++;
                            }
                        }

                        if (p.strategy.method === 'AVG' && count > 0) {
                            lookupVol = sum / count;
                        } else {
                            lookupVol = sum; // Default SUM
                        }
                    }

                    // Find matching tier
                    // Tiers are sorted by threshold ASC (e.g. 0, 1000, 5000)
                    // We want the highest threshold that is <= lookupVol? 
                    // Usually tiers are "Up to X" or "From X". 
                    // Database schema: "threshold_units". Usually "Volume > Threshold -> Tier X".
                    // Let's assume standard: Tier 1 (0+), Tier 2 (1000+)...
                    // We find the last tier where threshold <= lookupVol
                    
                    let foundTier = p.tiers[0]; // Default to lowest
                    for (let i = 0; i < p.tiers.length; i++) {
                        if (lookupVol >= p.tiers[i].threshold_units) {
                            foundTier = p.tiers[i];
                        } else {
                            break; 
                        }
                    }
                    activeTier = foundTier ? foundTier.tier_number : 1;
                }

                // Store calculated tiers for current reference month for display
                if (idx === refIndex) {
                    if (p.tierMode === 'raw') p.rawTier = activeTier;
                    if (p.tierMode === 'effective') p.effectiveTier = activeTier;
                    // Billed is static
                }

                // --- Step B: Calculate Cost using Active Tier ---
                let totalCost = 0;

                products.forEach(prod => {
                    const alloc = prod.allocations[p.id] || 0;
                    
                    // Dynamic Volume Selection (Same as Step 1)
                    let monthVol = 0;
                    if (idx <= refIndex) {
                        monthVol = prod.actualStream[idx] !== null ? prod.actualStream[idx] : (prod.forecastStream[idx] || 0);
                    } else {
                        monthVol = prod.forecastStream[idx] !== null ? prod.forecastStream[idx] : (prod.actualStream[idx] || 0);
                    }

                    let allocatedVol = 0;
                    if (prod.allocMode === 'percentage') {
                        allocatedVol = monthVol * (alloc / 100.0);
                    } else {
                        allocatedVol = alloc;
                    }

                    if (allocatedVol <= 0) return;

                    // Calculate Price for this Product's Items
                    // We assume 1 Product Unit = 1 Unit of EACH Item in the product
                    // (Bundle pricing logic)
                    let productCompositePrice = 0;
                    
                    if (prod.itemIds && prod.itemIds.length > 0) {
                        prod.itemIds.forEach(itemId => {
                            // Check if provider has offer for this item
                            if (p.offerMap[itemId]) {
                                const price = p.offerMap[itemId][activeTier] || 0;
                                // Apply multiplier if exists
                                const multiplierInfo = prod.multipliers[itemId];
                                const multiplier = multiplierInfo ? (typeof multiplierInfo === 'object' ? multiplierInfo.multiplier : multiplierInfo) : 1.0;
                                
                                productCompositePrice += price * multiplier;
                            }
                        });
                    }

                    totalCost += allocatedVol * productCompositePrice;
                });

                return totalCost;
            });

            p.costHistory = costHistory;
            
            // Calculate Current Cost and Sum for this provider
            const currentCost = costHistory[refIndex] || 0;
            const sum = costHistory.reduce((a, b) => a + b, 0);

            // Update chart
            if (p.chartInstance) {
                p.chartInstance.data.datasets = [{
                    label: 'Cost',
                    data: costHistory,
                    backgroundColor: timeline.map((t, i) =>
                        i <= refIndex ? p.color : p.color + '60'
                    ),
                    borderRadius: 4,
                    barPercentage: 0.7
                }];
                p.chartInstance.update('none');
            }

            // Update Mix Chart (Cost Breakdown for Selected Month)
            if (p.mixChartInstance) {
                const mixData = [];
                const mixLabels = [];
                const mixColors = [];
                
                // Colors for products in pie
                const palette = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#ec4899', '#14b8a6'];
                
                products.forEach((prod, idx) => {
                    const alloc = prod.allocations[p.id] || 0;
                    
                    // Re-calculate cost for THIS specific month (refIndex) for this product
                    let monthVol = 0;
                    // Use priority logic (Actual > Forecast) for current month
                    if (refIndex <= refIndex) { // Tautology, but keeping logic consistent
                         monthVol = prod.actualStream[refIndex] !== null ? prod.actualStream[refIndex] : (prod.forecastStream[refIndex] || 0);
                    }
                    
                    let allocatedVol = 0;
                    if (prod.allocMode === 'percentage') {
                        allocatedVol = monthVol * (alloc / 100.0);
                    } else {
                        allocatedVol = alloc;
                    }

                    if (allocatedVol > 0) {
                        // Calculate Price (copied from main loop logic)
                        let productCompositePrice = 0;
                        let activeTier = 1;
                        
                        // Determine Active Tier (Recalculate or store from previous loop?)
                        // Since we are inside the provider loop, we have p.rawTier/eff/manual etc.
                        if (p.tierMode === 'raw') activeTier = p.rawTier;
                        else if (p.tierMode === 'effective') activeTier = p.effectiveTier;
                        else if (p.tierMode === 'manual') activeTier = p.manualTier;
                        else activeTier = p.billedTier;

                        if (prod.itemIds && prod.itemIds.length > 0) {
                            prod.itemIds.forEach(itemId => {
                                if (p.offerMap[itemId]) {
                                    const price = p.offerMap[itemId][activeTier] || 0;
                                    const multiplierInfo = prod.multipliers[itemId];
                                    const multiplier = multiplierInfo ? (typeof multiplierInfo === 'object' ? multiplierInfo.multiplier : multiplierInfo) : 1.0;
                                    productCompositePrice += price * multiplier;
                                }
                            });
                        }
                        
                        const prodCost = allocatedVol * productCompositePrice;
                        if (prodCost > 0) {
                            mixLabels.push(prod.name);
                            mixData.push(prodCost);
                            mixColors.push(palette[idx % palette.length]);
                        }
                    }
                });
                
                p.mixChartInstance.data = {
                    labels: mixLabels,
                    datasets: [{
                        data: mixData,
                        backgroundColor: mixColors,
                        borderWidth: 0,
                        hoverOffset: 4
                    }]
                };
                p.mixChartInstance.update('none');
                
                // Update Center Text
                const mixTotalEl = document.getElementById(`mix-total-${p.id}`);
                if (mixTotalEl) {
                    mixTotalEl.textContent = new Intl.NumberFormat('en-US', { 
                        style: 'currency', 
                        currency: 'USD', 
                        maximumFractionDigits: 0,
                        notation: "compact"
                    }).format(currentCost);
                }
            }

            // Update total (Main KPI now shows Selected Month Cost)
            const totalEl = document.getElementById(`cost-total-${p.id}`);

            if (totalEl) {
                totalEl.textContent = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(currentCost);
            }
            
            // Update active tier badge text to reflect dynamic changes
            const badge = document.getElementById(`active-tier-badge-${p.id}`);
            if (badge) {
                let displayTier = 1;
                if (p.tierMode === 'raw') displayTier = p.rawTier;
                else if (p.tierMode === 'effective') displayTier = p.effectiveTier;
                else if (p.tierMode === 'manual') displayTier = p.manualTier;
                else displayTier = p.billedTier;
                
                badge.textContent = `Using T${displayTier}`;
            }
            
            // Update the tier number badges on the buttons
            const rawBadge = document.getElementById(`raw-tier-${p.id}`);
            if (rawBadge) rawBadge.textContent = `T${p.rawTier}`;
            
            const effBadge = document.getElementById(`eff-tier-${p.id}`);
            if (effBadge) effBadge.textContent = `T${p.effectiveTier}`;

            const manBadge = document.getElementById(`manual-tier-badge-${p.id}`);
            if (manBadge) manBadge.textContent = `T${p.manualTier}`;
        });
    }

    setProviderTierMode(provider, providers, products, timeline) {
        const mode = provider.tierMode;
        const provId = provider.id;

        // Update tier mode buttons for this provider
        const card = document.getElementById(`provider-card-${provId}`);
        if (card) {
            const toggle = card.querySelector('.tier-mode-toggle');
            if (toggle) {
                toggle.querySelectorAll('.tier-mode-btn').forEach(btn => {
                    const btnMode = btn.dataset.mode;
                    const isSelected = btnMode === mode;

                    let selectedClass = 'bg-slate-100 text-slate-500 hover:bg-slate-200';
                    if (isSelected) {
                        if (btnMode === 'raw') selectedClass = 'bg-slate-800 text-white';
                        else if (btnMode === 'effective') selectedClass = 'bg-emerald-600 text-white';
                        else if (btnMode === 'billed') selectedClass = 'bg-orange-500 text-white';
                        else if (btnMode === 'manual') selectedClass = 'bg-purple-600 text-white';
                    }
                    btn.className = `tier-mode-btn px-2 py-0.5 text-[10px] font-bold rounded transition-all ${selectedClass}`;
                });
            }

            // Update strategy controls visibility for this provider only
            const strategyControls = card.querySelector('.strategy-controls');
            if (strategyControls) {
                if (mode === 'effective') {
                    strategyControls.classList.remove('hidden');
                } else {
                    strategyControls.classList.add('hidden');
                }
            }

            // Update manual controls visibility
            const manualControls = card.querySelector('.manual-controls');
            if (manualControls) {
                 if (mode === 'manual') {
                    manualControls.classList.remove('hidden');
                } else {
                    manualControls.classList.add('hidden');
                }
            }

            // Update active tier badge
            const badge = document.getElementById(`active-tier-badge-${provId}`);
            if (badge) {
                let tierNum, color;
                if (mode === 'raw') {
                    tierNum = provider.rawTier;
                    color = 'bg-slate-100 text-slate-700';
                } else if (mode === 'effective') {
                    tierNum = provider.effectiveTier;
                    color = 'bg-emerald-50 text-emerald-700';
                } else if (mode === 'manual') {
                    tierNum = provider.manualTier;
                    color = 'bg-purple-50 text-purple-700';
                } else {
                    tierNum = provider.billedTier;
                    color = 'bg-orange-50 text-orange-700';
                }
                badge.textContent = `Using T${tierNum}`;
                badge.className = `text-[10px] mt-1 px-2 py-0.5 rounded font-bold ${color}`;
            }
        }

        // Re-run cost simulation
        this.updateCostSimulation(providers, products, timeline);
    }

    getProviderColor(index) {
        const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];
        return colors[index % colors.length];
    }
}

// Initialize instance
window.addEventListener('DOMContentLoaded', () => {
    window.simulationAllocationInstance = new SimulationAllocation('simulationAllocationContainer');
});