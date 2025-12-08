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

                return {
                    id: contract.provider_id,
                    name: contract.provider_name || contract.contract_name,
                    contractId: contract.contract_id,
                    tierMode: 'billed', // per-provider: 'raw' | 'effective' | 'billed'
                    tiers: tiersData,
                    billedTier: billedTierNum,
                    rawTier: 1, // calculated later
                    effectiveTier: 1, // calculated later
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

                const pActuals = processActuals.filter(a => a.product_id === pid);
                const pForecasts = processForecasts.filter(f => f.product_id === pid);

                const stream = timeline.map(t => {
                    const act = pActuals.find(a => a.year === t.year && a.month === t.month);
                    if (act) return Number(act.actual_units);
                    const fc = pForecasts.find(f => f.year === t.year && f.month === t.month);
                    return fc ? Number(fc.forecast_units) : 0;
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
                    allocMode,
                    allocations,
                    rawStream: stream,
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
                        </div>
                        
                        <!-- Strategy Controls - Only active in Effective mode -->
                        <div class="flex items-center gap-2 mt-2 strategy-controls ${p.tierMode === 'effective' ? '' : 'opacity-40 pointer-events-none'}" data-provider-id="${p.id}">
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
                    </div>
                    <div class="text-right">
                        <div class="text-2xl font-bold text-slate-900" id="cost-total-${p.id}">$0</div>
                        <div class="text-[10px] text-slate-400 uppercase tracking-wider">Total Cost</div>
                        <div class="text-[10px] mt-1 px-2 py-0.5 rounded font-bold" id="active-tier-badge-${p.id}">
                            Using T${p.billedTier}
                        </div>
                    </div>
                </div>
                <div class="h-[200px]">
                    <canvas id="chart-cost-${p.id}"></canvas>
                </div>
                
                <!-- Cost breakdown footer -->
                <div class="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-2 text-xs" id="cost-status-${p.id}">
                    <!-- Injected dynamically -->
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

            p.chartInstance = chart;
            this.charts.push(chart);
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

        // Calculate cost per provider per month
        providers.forEach(p => {
            const costHistory = timeline.map((t, idx) => {
                let totalCost = 0;

                products.forEach(prod => {
                    const alloc = prod.allocations[p.id] || 0;
                    const monthVol = prod.rawStream[idx] || 0;

                    let allocatedVol = 0;
                    if (prod.allocMode === 'percentage') {
                        allocatedVol = monthVol * (alloc / 100.0);
                    } else {
                        allocatedVol = alloc;
                    }

                    // Simplified cost calculation (would normally use tier pricing)
                    // For now, use a placeholder rate
                    const costPerUnit = 0.05; // Placeholder - should fetch from offers
                    totalCost += allocatedVol * costPerUnit;
                });

                return totalCost;
            });

            p.costHistory = costHistory;

            // Update chart
            if (p.chartInstance) {
                p.chartInstance.data.datasets = [{
                    label: 'Cost',
                    data: costHistory,
                    backgroundColor: timeline.map((t, i) =>
                        t.source === 'actual' ? p.color : p.color + '60'
                    ),
                    borderRadius: 4,
                    barPercentage: 0.7
                }];
                p.chartInstance.update('none');
            }

            // Update total
            const totalEl = document.getElementById(`cost-total-${p.id}`);
            if (totalEl) {
                const sum = costHistory.reduce((a, b) => a + b, 0);
                totalEl.textContent = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(sum);
            }

            // Update status footer
            const statusEl = document.getElementById(`cost-status-${p.id}`);
            if (statusEl) {
                const currentCost = costHistory[refIndex] || 0;
                const avgCost = costHistory.length > 0 ? costHistory.reduce((a, b) => a + b, 0) / costHistory.length : 0;

                statusEl.innerHTML = `
                    <span class="px-2 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-100 font-medium">
                        Current: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(currentCost)}
                    </span>
                    <span class="px-2 py-1 rounded bg-slate-50 text-slate-600 border border-slate-100 font-medium">
                        Avg: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(avgCost)}
                    </span>
                `;
            }
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
                    }
                    btn.className = `tier-mode-btn px-2 py-0.5 text-[10px] font-bold rounded transition-all ${selectedClass}`;
                });
            }

            // Update strategy controls visibility for this provider only
            const strategyControls = card.querySelector('.strategy-controls');
            if (strategyControls) {
                if (mode === 'effective') {
                    strategyControls.classList.remove('opacity-40', 'pointer-events-none');
                } else {
                    strategyControls.classList.add('opacity-40', 'pointer-events-none');
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