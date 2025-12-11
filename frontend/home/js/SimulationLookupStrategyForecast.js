/**
 * SimulationLookupStrategyForecast - Forecast Strategy Simulator
 * Visualizes forecasted effective volumes against tier thresholds to find opportunities.
 * View Mode: Sidebar Process Navigation (Master-Detail)
 */
class SimulationLookupStrategyForecast {
    constructor(containerId) {
        this.containerId = containerId;
        this.processes = [];
        this.filteredProcesses = [];
        this.selectedProcessId = null;
        this.charts = []; // Store active chart instances
    }

    async init() {
        // Prevent re-rendering layout if already initialized (OptimizationApp might call init multiple times)
        if (document.getElementById('sim_forecast_content')) {
             // Just handle URL/Selection update if needed
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

            // URL & Default Selection Logic
            const urlParams = new URLSearchParams(window.location.search);
            let processId = parseInt(urlParams.get('processId'));
            
            // Validate processId
            const processExists = this.processes.some(p => p.process_id === processId);
            
            // Default to first if invalid or missing
            if (!processExists && this.processes.length > 0) {
                processId = this.processes[0].process_id;
            }

            // Select if we have a valid ID
            if (processId) {
                this.selectProcess(processId);
            }
        } catch (error) {
            console.error("Forecast Simulation Init Error:", error);
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
                    <div class="animate-pulse text-muted-foreground">Loading forecast strategy data...</div>
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
        this.filteredProcesses = [...this.processes];
    }

    renderInitialState() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        // Top Menu Layout (Tabs) - Replaces Sidebar
        container.innerHTML = `
            <div class="flex flex-col h-[800px] border border-slate-200 rounded-xl bg-white overflow-hidden shadow-sm relative isolate">
                <!-- Top Navigation Bar -->
                <div class="shrink-0 bg-white border-b border-slate-200 flex flex-col z-20 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]">
                    <div class="px-6 py-4 flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <div class="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>
                            </div>
                            <div>
                                <h2 class="text-sm font-bold text-slate-800 uppercase tracking-wider">Forecast Strategy</h2>
                                <p class="text-xs text-slate-500">Select a process below to view product simulations</p>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Process Tabs (Horizontal Scroll) -->
                    <div class="px-6 pb-4 overflow-x-auto custom-scrollbar">
                        <div id="sim_process_list" class="flex items-center gap-3 min-w-max">
                            <!-- Items rendered via renderProcessList() -->
                        </div>
                    </div>
                </div>

                <!-- Main Content: Analysis Area -->
                <div class="flex-1 flex flex-col bg-slate-50/50 overflow-hidden min-h-0 relative">
                    <div id="sim_forecast_header" class="hidden h-14 border-b border-slate-200/60 flex items-center px-8 bg-white/80 backdrop-blur-sm z-10 shrink-0 justify-between">
                         <!-- Header content injected dynamically -->
                    </div>
                    
                    <div id="sim_forecast_content" class="flex-1 overflow-y-auto custom-scrollbar p-8 min-h-0 max-h-full">
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
        const listContainer = document.getElementById('sim_process_list');
        if (!listContainer) return;

        listContainer.innerHTML = ''; // Clear existing

        if (this.processes.length === 0) {
            listContainer.innerHTML = `
                <div class="text-sm text-slate-400 italic px-2">
                    No active processes found.
                </div>
            `;
            return;
        }

        this.processes.forEach(p => {
            const isSelected = String(p.process_id) === String(this.selectedProcessId);
            
            const btn = document.createElement('button');
            
            // Modern Pill/Chip Style
            const baseClass = "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all border shadow-sm whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500";
            const selectedClass = "bg-slate-800 text-white border-slate-800 hover:bg-slate-700";
            const defaultClass = "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-900 hover:shadow";
            
            btn.className = `${baseClass} ${isSelected ? selectedClass : defaultClass}`;
            
            btn.innerHTML = `
                <span>${p.process_name}</span>
                ${isSelected ? '<svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>' : ''}
            `;

            btn.addEventListener('click', () => {
                this.selectProcess(p.process_id);
            });

            listContainer.appendChild(btn);
        });
    }

    selectProcess(processId) {
        this.selectedProcessId = processId;
        this.updateUrl(processId);
        this.renderProcessList(); // Re-render to update active state styling
        this.loadAndRenderProcessAnalysis(processId);
    }

    async loadAndRenderProcessAnalysis(processId) {
        const content = document.getElementById('sim_forecast_content');
        const header = document.getElementById('sim_forecast_header');
        
        const process = this.processes.find(p => String(p.process_id) === String(processId));
        
        if (!process) {
            content.innerHTML = '<div class="p-4 text-red-600">Error: Process data not found.</div>';
            return;
        }
        
        // Update Header
        header.classList.remove('hidden');
        header.innerHTML = `
            <div>
                <h3 class="text-xl font-bold text-slate-800">${process.process_name}</h3>
                <p class="text-sm text-slate-500">Provider Tiers & Allocation Strategy</p>
            </div>
        `;

        content.innerHTML = '<div class="h-full flex items-center justify-center"><div class="flex flex-col items-center gap-3"><div class="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div><p class="text-sm text-slate-500">Analyzing data...</p></div></div>';
        
        // Reset charts
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
                        <p class="text-slate-500 max-w-xs mt-1">Add contracts to this process to begin.</p>
                    </div>`;
                return;
            }

            // 2. Fetch Forecasts & Actuals
            const [forecastsRes, actualsRes] = await Promise.all([
                fetch('/api/forecasts'),
                fetch('/api/actuals')
            ]);
            
            const allForecasts = await forecastsRes.json();
            const allActuals = await actualsRes.json();
            
            const processForecasts = allForecasts.filter(f => String(f.process_id) === String(processId));
            const processActuals = allActuals.filter(a => String(a.process_id) === String(processId));
            
            if (processForecasts.length === 0 && processActuals.length === 0) {
                content.innerHTML = `
                    <div class="flex flex-col items-center justify-center h-64 text-center">
                        <div class="w-12 h-12 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-3">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <h3 class="text-lg font-medium text-slate-900">No Volume Data</h3>
                        <p class="text-slate-500 max-w-sm mt-1">No forecasts or actuals found for this process.</p>
                    </div>`;
                return;
            }

            // 3. Setup Data Models
            
            // A. Global Timeline (Merge Actuals & Forecasts)
            // Logic: Actuals "overwrite" Forecasts for the same period to create a single "Effective Stream"
            const timelineMap = new Map();
            
            // 1. Add Actuals
            processActuals.forEach(a => {
                const key = `${a.year}-${a.month}`;
                timelineMap.set(key, {
                    year: a.year,
                    month: a.month,
                    label: `${new Date(a.year, a.month - 1).toLocaleDateString('en-US', { month: 'short' })} '${String(a.year).slice(2)}`,
                    source: 'actual' // Marker
                });
            });
            
            // 2. Add Forecasts (only if not present, or we can just assume union for keys)
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

            // Default Reference Month (Prioritize Today)
            const now = new Date();
            const currentYear = now.getFullYear();
            const currentMonth = now.getMonth() + 1; // JS months are 0-indexed
            
            const currentPeriod = timeline.find(t => t.year === currentYear && t.month === currentMonth);
            
            if (currentPeriod) {
                this.referenceDateKey = `${currentPeriod.year}-${currentPeriod.month}`;
            } else {
                // Fallback: First Forecast -> Last Available
                const firstForecast = timeline.find(t => t.source === 'forecast');
                this.referenceDateKey = firstForecast 
                    ? `${firstForecast.year}-${firstForecast.month}` 
                    : (timeline.length > 0 ? `${timeline[timeline.length-1].year}-${timeline[timeline.length-1].month}` : null);
            }
            const providers = await Promise.all(contracts.map(async (contract, idx) => {
                // Strategy
                const lookupRes = await fetch(`/api/contract-lookups/${contract.contract_id}`);
                const lookupData = await lookupRes.json();
                
                // Tiers
                const tiersRes = await fetch(`/api/contract-tiers/${contract.contract_id}`);
                let rawTiers = await tiersRes.json();
                // Sort by units ascending
                rawTiers = rawTiers.filter(t => t.threshold_units > 0).sort((a, b) => a.threshold_units - b.threshold_units);
                
                // Map to structured Tier Data
                const tierData = rawTiers.map(t => ({
                    units: t.threshold_units,
                    number: t.tier_number,
                    label: `T${t.tier_number}`,
                    selected: t.is_selected
                }));

                const palette = this.getProviderColor(idx);

                return {
                    id: contract.provider_id,
                    name: contract.provider_name || contract.contract_name,
                    contractId: contract.contract_id,
                    strategy: {
                        method: lookupData.method || 'SUM',
                        lookback: (lookupData.lookback_months || 0) + 1
                    },
                    tierData: tierData, // Store all tiers
                    thresholds: tierData.map(t => t.units), // Keep for backward compat in footer if needed
                    palette: palette,
                    color: palette.base,
                    // Arrays for plotting
                    totalEffectiveVolume: [],
                    totalRawVolume: []
                };
            }));

            // C. Products (Details + Forecast Stream + Allocations)
            const uniqueProductIds = [...new Set([...processForecasts.map(f => f.product_id), ...processActuals.map(a => a.product_id)])];
            
            const products = await Promise.all(uniqueProductIds.map(async (pid) => {
                const details = await this.getProductDetails(pid);
                
                // Build Streams aligned to Global Timeline
                const pForecasts = processForecasts.filter(f => f.product_id === pid);
                const pActuals = processActuals.filter(a => a.product_id === pid);
                
                // 1. Raw Stream (Priority: Actual > Forecast) - Used for Default/Init
                const stream = timeline.map(t => {
                    const act = pActuals.find(a => a.year === t.year && a.month === t.month);
                    if (act) return Number(act.actual_units);
                    const fc = pForecasts.find(f => f.year === t.year && f.month === t.month);
                    return fc ? Number(fc.forecast_units) : 0;
                });
                
                // 2. Separate Streams for Hybrid Simulation
                const actualStream = timeline.map(t => {
                    const act = pActuals.find(a => a.year === t.year && a.month === t.month);
                    return act ? Number(act.actual_units) : null;
                });

                const forecastStream = timeline.map(t => {
                    const fc = pForecasts.find(f => f.year === t.year && f.month === t.month);
                    return fc ? Number(fc.forecast_units) : null;
                });
                
                const totalVolume = stream.reduce((a, b) => a + b, 0);

                // Initialize Allocations (Map ProviderID -> Share)
                const allocations = {};
                let allocMode = 'percentage';
                
                // Load defaults from DB
                if (details.allocations) {
                    let rules = null;
                    
                    // 1. Collective Format (direct properties)
                    if (details.allocations.providers) {
                        rules = details.allocations.providers;
                        allocMode = details.allocations.mode || 'percentage';
                    } 
                    // 2. Legacy Per-Item Format (keys are item IDs)
                    else {
                        const itemKeys = Object.keys(details.allocations).filter(k => !isNaN(parseInt(k)));
                        if (itemKeys.length > 0) {
                            // Heuristic: Use the first item's allocation as the product-level default
                            const firstKey = itemKeys[0];
                            if (details.allocations[firstKey] && details.allocations[firstKey].providers) {
                                rules = details.allocations[firstKey].providers;
                                allocMode = details.allocations[firstKey].mode || 'percentage';
                            }
                        }
                    }

                    if (rules) {
                        rules.forEach(p => {
                            allocations[p.provider_id] = p.value;
                        });
                    }
                }
                
                // Ensure all current providers have an entry
                providers.forEach(p => {
                    if (allocations[p.id] === undefined) {
                        // Default logic: If only 1 provider, 100%, else 0
                        allocations[p.id] = providers.length === 1 ? (allocMode === 'percentage' ? 100 : 0) : 0;
                    }
                });

                return {
                    id: pid,
                    name: details.name,
                    description: details.description,
                    allocMode: allocMode,
                    allocations: allocations, // { providerId: value }
                    rawStream: stream,
                    actualStream: actualStream,
                    forecastStream: forecastStream,
                    totalVolume: totalVolume
                };
            }));

            // 4. Render Split Layout
            content.innerHTML = `
                <div class="flex flex-col lg:flex-row h-full gap-6">
                    <!-- Left: Provider Charts -->
                    <div class="lg:w-[60%] flex flex-col min-h-0">
                        <div class="flex items-center justify-between mb-3 px-1">
                            <h4 class="font-bold text-slate-700 flex items-center gap-2">
                                <span class="bg-slate-100 p-1 rounded text-slate-500">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>
                                </span>
                                Provider Views
                            </h4>
                            <span class="text-xs text-slate-400">${providers.length} Providers</span>
                        </div>
                        <div id="provider_charts_container" class="flex-1 overflow-y-auto custom-scrollbar space-y-6 pr-2 pb-4">
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
                        <div id="product_controls_container" class="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2 pb-4">
                            <!-- Controls injected here -->
                        </div>
                    </div>
                </div>
            `;

            // 5. Initialize Views
            this.renderProviderCharts(providers, timeline);
            this.renderProductControls(products, providers, timeline);
            
            // 6. Initial Calculation & Update
            this.updateSimulation(providers, products, timeline);

        } catch (error) {
            console.error("Analysis Error:", error);
            content.innerHTML = `<div class="p-6 bg-red-50 text-red-600 rounded-lg border border-red-100">Analysis failed: ${error.message}</div>`;
        }
    }

    async getProductDetails(productId) {
        const res = await fetch(`/api/products/${productId}`);
        return await res.json();
    }

    renderProviderCharts(providers, timeline) {
        const container = document.getElementById('provider_charts_container');
        container.innerHTML = '';
        
        // Inject Styles for Toggle
        const styleId = 'sim-forecast-styles';
        let style = document.getElementById(styleId);
        if (!style) {
            style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
                .raw-vol-toggle:checked + .toggle-bg { background-color: #3b82f6; }
                .raw-vol-toggle:checked + .toggle-bg + .toggle-dot { transform: translateX(12px); }
            `;
            document.head.appendChild(style);
        }

        providers.forEach(p => {
            const card = document.createElement('div');
            card.className = "bg-white border border-slate-200 rounded-xl shadow-sm p-4 relative group";
            card.innerHTML = `
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <h5 class="font-bold text-slate-800">${p.name}</h5>
                        
                        <!-- Interactive Strategy Controls -->
                        <div class="flex items-center gap-2 mt-2">
                            <div class="flex bg-slate-100 rounded-md p-0.5 shrink-0">
                                <button class="px-2 py-0.5 rounded text-[10px] font-bold transition-all strategy-btn ${p.strategy.method === 'SUM' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}" 
                                        data-provider-id="${p.id}" data-method="SUM">SUM</button>
                                <button class="px-2 py-0.5 rounded text-[10px] font-bold transition-all strategy-btn ${p.strategy.method === 'AVG' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}" 
                                        data-provider-id="${p.id}" data-method="AVG">AVG</button>
                            </div>
                            
                            <div class="flex items-center bg-slate-100 rounded-md px-2 py-0.5 border border-transparent focus-within:border-blue-300 focus-within:ring-1 focus-within:ring-blue-200 transition-all">
                                <input type="number" 
                                    class="w-8 bg-transparent text-[10px] font-bold text-slate-700 text-center outline-none p-0 strategy-lookback" 
                                    data-provider-id="${p.id}"
                                    value="${p.strategy.lookback}" 
                                    min="1">
                                <span class="text-[10px] text-slate-400 ml-1">mo</span>
                            </div>
                            
                            <!-- Raw Volume Toggle -->
                            <label class="flex items-center gap-1.5 ml-2 cursor-pointer group select-none" title="Show Raw Monthly Volume">
                                <div class="relative w-6 h-3">
                                    <input type="checkbox" class="sr-only raw-vol-toggle" data-provider-id="${p.id}">
                                    <div class="absolute inset-0 bg-slate-200 rounded-full shadow-inner transition-colors group-hover:bg-slate-300 toggle-bg"></div>
                                    <div class="absolute top-0.5 left-0.5 w-2 h-2 bg-white rounded-full shadow transition-transform toggle-dot"></div>
                                </div>
                                <span class="text-[9px] font-bold text-slate-400 group-hover:text-slate-600 uppercase tracking-wider">Raw</span>
                            </label>

                            <!-- Mix Chart Toggle -->
                            <button class="mix-toggle-btn ml-2 p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all" 
                                    data-provider-id="${p.id}" title="Toggle Product Mix">
                                <svg class="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>
                            </button>
                            
                            <span class="text-[10px] text-slate-400 ml-auto">ID: ${p.id}</span>
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="text-2xl font-bold text-slate-900" id="vol-total-${p.id}">0</div>
                        <div class="text-[10px] text-slate-400 uppercase tracking-wider">Month Eff. Vol</div>
                    </div>
                </div>
                <div class="flex h-[220px] relative">
                    <div class="flex-1 min-w-0 transition-all duration-300 ease-out">
                        <canvas id="chart-provider-${p.id}"></canvas>
                    </div>
                    <!-- Product Mix Pie (Slide-Out) -->
                    <div id="mix-chart-wrapper-${p.id}" class="w-0 opacity-0 transition-all duration-300 ease-out flex flex-col border-l border-slate-100 bg-slate-50/50 overflow-hidden whitespace-nowrap">
                         <div class="text-[9px] font-bold text-slate-400 mb-1 text-center uppercase tracking-wider truncate mt-2 px-2">
                            Mix: <span class="text-slate-700" id="mix-label-${p.id}">--</span>
                         </div>
                         <div class="flex-1 flex items-center justify-center min-h-0 pb-1">
                             <div class="relative w-32 h-32">
                                 <canvas id="chart-provider-mix-${p.id}"></canvas>
                                 <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <span class="text-[10px] font-bold text-slate-300" id="mix-total-${p.id}"></span>
                                 </div>
                             </div>
                         </div>
                    </div>
                </div>
                
                <!-- Tiers Legend/Status -->
                <div class="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-2 text-xs" id="tiers-status-${p.id}">
                    <!-- Injected dynamically -->
                </div>
            `;
            container.appendChild(card);

            const ctx = document.getElementById(`chart-provider-${p.id}`).getContext('2d');
            
            // Custom Plugin to draw Tier Labels (T1, T2, etc) on the right axis
            const tierLabelPlugin = {
                id: 'tierLabels',
                afterDatasetsDraw(chart, args, options) {
                    const { ctx, chartArea: { top, bottom, left, right }, scales: { y } } = chart;
                    
                    chart.data.datasets.forEach((dataset, i) => {
                        if (chart.isDatasetVisible(i) && dataset.isTierLine && dataset.tierLabel) {
                            const yPos = y.getPixelForValue(dataset.data[0]);
                            
                            // Only draw if visible within chart area
                            if (yPos >= top && yPos <= bottom) {
                                ctx.save();
                                
                                const label = dataset.tierLabel;
                                ctx.font = 'bold 10px sans-serif';
                                ctx.textBaseline = 'middle';
                                
                                const textWidth = ctx.measureText(label).width;
                                const padding = 4;
                                const boxWidth = textWidth + (padding * 2);
                                const boxHeight = 16;
                                
                                // Position: Right aligned inside the chart area
                                const xPos = right - boxWidth - 4; 
                                
                                // Draw Badge Background
                                ctx.fillStyle = dataset.borderColor;
                                ctx.beginPath();
                                if (ctx.roundRect) {
                                    ctx.roundRect(xPos, yPos - boxHeight/2, boxWidth, boxHeight, 3);
                                } else {
                                    ctx.fillStyle = dataset.borderColor;
                                    ctx.fillRect(xPos, yPos - boxHeight/2, boxWidth, boxHeight);
                                }
                                ctx.fill();
                                
                                // Draw Text
                                ctx.fillStyle = '#fff';
                                ctx.textAlign = 'center';
                                ctx.fillText(label, xPos + boxWidth/2, yPos);
                                
                                ctx.restore();
                            }
                        }
                    });
                }
            };
            
            // Create Main Chart Instance
            const chart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: timeline.map(t => t.label),
                    datasets: [] // Populated in updateSimulation
                },
                plugins: [tierLabelPlugin],
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
                                    const val = ctx.parsed.y.toLocaleString(undefined, {maximumFractionDigits: 0});
                                    label += val;
                                    
                                    // Add Source info
                                    const index = ctx.dataIndex;
                                    if (timeline && timeline[index]) {
                                        const type = timeline[index].source;
                                        label += ` (${type === 'actual' ? 'Act' : 'Fcst'})`;
                                    }
                                    
                                    return label;
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: { color: '#f8fafc' },
                            ticks: { font: { size: 10 } }
                        },
                        x: {
                            grid: { display: false },
                            ticks: { maxTicksLimit: 8, font: { size: 10 } }
                        }
                    }
                }
            });
            
            // Create Mix Chart Instance
            const mixCtx = document.getElementById(`chart-provider-mix-${p.id}`).getContext('2d');
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
                                        `${val.toLocaleString()} units`,
                                        `${pct.toFixed(1)}%`
                                    ];
                                }
                            }
                        }
                    }
                }
            });

            // Store ref for updates
            p.chartInstance = chart;
            this.charts.push(chart);
            this.charts.push(p.mixChartInstance); // Track for cleanup
        });

        // Event Delegation
        container.addEventListener('click', (e) => {
            const target = e.target;
            
            // Strategy Buttons
            if (target.classList.contains('strategy-btn')) {
                const provId = parseInt(target.dataset.providerId);
                const method = target.dataset.method;
                
                const provider = providers.find(p => p.id === provId);
                if (provider) {
                    provider.strategy.method = method;
                    
                    // Update UI classes (Basic Toggle)
                    const parent = target.parentElement;
                    parent.querySelectorAll('.strategy-btn').forEach(b => {
                        const isSelected = b.dataset.method === method;
                        if (isSelected) {
                            b.className = 'px-2 py-0.5 rounded text-[10px] font-bold transition-all strategy-btn bg-white shadow-sm text-slate-800';
                        } else {
                            b.className = 'px-2 py-0.5 rounded text-[10px] font-bold transition-all strategy-btn text-slate-400 hover:text-slate-600';
                        }
                    });

                    if (this.currentSessionData) {
                        this.updateSimulation(
                            this.currentSessionData.providers, 
                            this.currentSessionData.products, 
                            this.currentSessionData.timeline
                        );
                    }
                }
            }

            // Mix Toggle Button
            const mixBtn = target.closest('.mix-toggle-btn');
            if (mixBtn) {
                const provId = parseInt(mixBtn.dataset.providerId);
                const wrapper = document.getElementById(`mix-chart-wrapper-${provId}`);
                
                if (wrapper) {
                    const isClosed = wrapper.classList.contains('w-0');
                    
                    if (isClosed) {
                        wrapper.classList.remove('w-0', 'opacity-0');
                        wrapper.classList.add('w-40', 'opacity-100', 'pl-2');
                        mixBtn.classList.add('bg-blue-50', 'text-blue-600');
                        mixBtn.classList.remove('text-slate-400');
                    } else {
                        wrapper.classList.add('w-0', 'opacity-0');
                        wrapper.classList.remove('w-40', 'opacity-100', 'pl-2');
                        mixBtn.classList.remove('bg-blue-50', 'text-blue-600');
                        mixBtn.classList.add('text-slate-400');
                    }
                }
            }
        });

        container.addEventListener('change', (e) => {
             const target = e.target;
             if (target.classList.contains('raw-vol-toggle')) {
                 if (this.currentSessionData) {
                     this.updateSimulation(
                        this.currentSessionData.providers, 
                        this.currentSessionData.products, 
                        this.currentSessionData.timeline
                     );
                 }
             }
        });

        container.addEventListener('input', (e) => {
            const target = e.target;
            if (target.classList.contains('strategy-lookback')) {
                const provId = parseInt(target.dataset.providerId);
                const val = parseInt(target.value) || 1;
                
                const provider = providers.find(p => p.id === provId);
                if (provider) {
                    provider.strategy.lookback = val;
                    if (this.currentSessionData) {
                        this.updateSimulation(
                            this.currentSessionData.providers, 
                            this.currentSessionData.products, 
                            this.currentSessionData.timeline
                        );
                    }
                }
            }
        });
    }

    renderProductControls(products, providers, timeline) {
        const container = document.getElementById('product_controls_container');
        
        // Clean up old chart if re-rendering
        if (this.productMixChart) {
            this.productMixChart.destroy();
            this.productMixChart = null;
        }
        
        container.innerHTML = '';

        // 1. Month Selector Header
        const header = document.createElement('div');
        header.className = "sticky top-0 bg-white/95 backdrop-blur-sm pb-4 border-b border-slate-100 mb-4 z-10 space-y-3";
        
        const refIndex = timeline.findIndex(t => `${t.year}-${t.month}` === this.referenceDateKey);
        
        // Calculate Product Mix Data
        const productVols = products.map(p => {
            let vol = 0;
            if (refIndex >= 0) {
                // Priority: Actual > Forecast for the reference month itself
                vol = p.actualStream[refIndex] !== null ? p.actualStream[refIndex] : (p.forecastStream[refIndex] || 0);
            }
            return {
                name: p.name,
                volume: vol,
                color: '' // assigned later
            };
        });
        const totalMonthVol = productVols.reduce((a, b) => a + b.volume, 0);

        // Month Select HTML
        const selectHtml = timeline.map(t => {
            const key = `${t.year}-${t.month}`;
            return `<option value="${key}" ${key === this.referenceDateKey ? 'selected' : ''}>${t.label} (${t.source === 'actual' ? 'Act' : 'Fcst'})</option>`;
        }).join('');

        header.innerHTML = `
            <div class="flex justify-between items-center">
                <label class="text-xs font-bold text-slate-500 uppercase tracking-wider">Analysis Month</label>
                <div class="relative">
                    <select id="ref-month-select" class="appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium rounded-md pl-3 pr-8 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer">
                        ${selectHtml}
                    </select>
                    <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                        <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
                    </div>
                </div>
            </div>
            
            <!-- Product Mix Visualization -->
            <div class="bg-slate-50 rounded-lg p-3 flex items-center gap-4 relative overflow-hidden border border-slate-100">
                <div class="relative w-20 h-20 shrink-0">
                    <canvas id="product-mix-chart"></canvas>
                    <div class="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                        <span class="text-[8px] text-slate-400 uppercase font-bold">Total</span>
                        <span class="text-[10px] font-bold text-slate-700">${(totalMonthVol/1000).toFixed(0)}k</span>
                    </div>
                </div>
                <div class="flex-1 min-w-0">
                     <div class="text-xs font-medium text-slate-500 mb-1.5">Product Share</div>
                     <div class="space-y-1">
                        ${productVols.map((p, i) => {
                            // Simple palette
                            const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];
                            p.color = colors[i % colors.length];
                            const share = totalMonthVol > 0 ? Math.round((p.volume / totalMonthVol) * 100) : 0;
                            return `
                                <div class="flex items-center justify-between text-[10px]">
                                    <div class="flex items-center gap-1.5 truncate">
                                        <span class="w-1.5 h-1.5 rounded-full" style="background-color: ${p.color}"></span>
                                        <span class="text-slate-700 font-medium truncate" title="${p.name}">${p.name}</span>
                                    </div>
                                    <div class="flex items-center gap-2 shrink-0">
                                        <span class="text-slate-500">${p.volume.toLocaleString()}</span>
                                        <span class="font-bold text-slate-700 w-6 text-right">${share}%</span>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                     </div>
                </div>
            </div>
        `;
        container.appendChild(header);

        // Initialize Chart
        const ctx = document.getElementById('product-mix-chart').getContext('2d');
        this.productMixChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: productVols.map(p => p.name),
                datasets: [{
                    data: productVols.map(p => p.volume),
                    backgroundColor: productVols.map(p => p.color),
                    borderWidth: 0,
                    hoverOffset: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '75%',
                plugins: {
                    legend: { display: false },
                    tooltip: { 
                        enabled: true,
                        callbacks: {
                            title: (tooltipItems) => {
                                return tooltipItems[0].label;
                            },
                            label: (ctx) => {
                                let val = ctx.parsed;
                                let total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                                let pct = total > 0 ? (val / total) * 100 : 0;
                                return [
                                    `${val.toLocaleString()} units`,
                                    `${pct.toFixed(1)}%`
                                ];
                            }
                        }
                    } 
                }
            }
        });

        // 2. Product Cards
        products.forEach(prod => {
            const card = document.createElement('div');
            card.className = "bg-white border border-slate-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow mb-4";
            
            // Get Volume for Reference Month (Hybrid)
            let monthVol = 0;
            if (refIndex >= 0) {
                monthVol = prod.actualStream[refIndex] !== null ? prod.actualStream[refIndex] : (prod.forecastStream[refIndex] || 0);
            }

            // Generate sliders for each provider
            const slidersHtml = providers.map(prov => {
                const share = prod.allocations[prov.id];
                let rawUnit = 0;
                let effUnit = 0;
                let displayVal = "";

                // 1. Calculate Raw Allocated for this Month
                if (prod.allocMode === 'percentage') {
                    rawUnit = Math.round(monthVol * (share / 100.0));
                } else {
                    rawUnit = share;
                }

                // 2. Calculate Effective Allocated (Apply Provider Strategy to Product Stream)
                // We assume the current allocation share applies historically for this "What-If" snapshot
                let sum = 0;
                let count = 0;
                for (let k = 0; k < prov.strategy.lookback; k++) {
                    const targetIdx = refIndex - k;
                    if (targetIdx >= 0) {
                        // Hybrid Volume Logic
                        let histVol = 0;
                        if (targetIdx <= refIndex) {
                            histVol = prod.actualStream[targetIdx] !== null ? prod.actualStream[targetIdx] : (prod.forecastStream[targetIdx] || 0);
                        } else {
                            histVol = prod.forecastStream[targetIdx] !== null ? prod.forecastStream[targetIdx] : (prod.actualStream[targetIdx] || 0);
                        }
                        
                        const histAlloc = prod.allocMode === 'percentage' ? (histVol * (share / 100.0)) : share;
                        sum += histAlloc;
                        count++;
                    }
                }
                effUnit = Math.round(prov.strategy.method === 'AVG' ? (count > 0 ? sum / count : 0) : sum);

                // 3. Format Display
                if (prod.allocMode === 'percentage') {
                    displayVal = `${share}% <span class="text-slate-400 font-normal ml-1 text-[10px]">(Raw: ${rawUnit.toLocaleString()}, Eff: ${effUnit.toLocaleString()})</span>`;
                } else {
                    displayVal = `${share.toLocaleString()} u <span class="text-slate-400 font-normal ml-1 text-[10px]">(Eff: ${effUnit.toLocaleString()})</span>`;
                }

                return `
                <div class="mb-3 last:mb-0">
                    <div class="flex justify-between items-center mb-1">
                        <label class="text-xs font-medium text-slate-600 flex items-center gap-1.5">
                            <span class="w-2 h-2 rounded-full" style="background-color: ${prov.color}"></span>
                            ${prov.name}
                        </label>
                        <span class="text-xs font-mono font-bold text-slate-700 val-display" 
                              id="val-disp-${prod.id}-${prov.id}"
                              data-prod-id="${prod.id}"
                              data-prov-id="${prov.id}">
                            ${displayVal}
                        </span>
                    </div>
                    <div class="flex items-center gap-2">
                        <input type="range" 
                            class="flex-1 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600 hover:accent-blue-700 allocation-slider"
                            data-prod-id="${prod.id}"
                            data-prov-id="${prov.id}"
                            min="0" 
                            max="${prod.allocMode === 'percentage' ? 100 : 100000}" 
                            step="${prod.allocMode === 'percentage' ? 1 : 100}"
                            value="${prod.allocations[prov.id]}">
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
                        <div class="text-[10px] font-bold text-blue-600">
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

        // Attach Selector Listener
        const select = document.getElementById('ref-month-select');
        if (select) {
            select.addEventListener('change', (e) => {
                this.referenceDateKey = e.target.value;
                // Re-render self
                this.renderProductControls(products, providers, timeline);
                // Update Provider Views (Mix Charts depend on Ref Month)
                if (this.currentSessionData) {
                    this.updateSimulation(this.currentSessionData.providers, this.currentSessionData.products, this.currentSessionData.timeline);
                }
            });
        }

        // Attach Slider Listeners
        container.querySelectorAll('.allocation-slider').forEach(slider => {
            // Logic extracted to helper for reuse
            const handleInput = (e) => {
                const prodId = parseInt(e.target.dataset.prodId);
                const provId = parseInt(e.target.dataset.provId);
                const val = parseFloat(e.target.value);
                
                // Update Data Model
                const product = products.find(p => p.id === prodId);
                const provider = providers.find(p => p.id === provId);

                if (product && provider) {
                    product.allocations[provId] = val;
                    
                    // Recalculate Display Label with Units
                    const disp = document.getElementById(`val-disp-${prodId}-${provId}`);
                    if (disp) {
                        const refIndex = timeline.findIndex(t => `${t.year}-${t.month}` === this.referenceDateKey);
                        const monthVol = refIndex >= 0 && product.rawStream[refIndex] !== undefined ? product.rawStream[refIndex] : 0;
                        
                        // Recalculate Effective
                        let sum = 0;
                        let count = 0;
                        for (let k = 0; k < provider.strategy.lookback; k++) {
                            const targetIdx = refIndex - k;
                            if (targetIdx >= 0) {
                                // Hybrid Volume Logic for History Calculation
                                let histVol = 0;
                                if (targetIdx <= refIndex) {
                                    histVol = product.actualStream[targetIdx] !== null ? product.actualStream[targetIdx] : (product.forecastStream[targetIdx] || 0);
                                } else {
                                    histVol = product.forecastStream[targetIdx] !== null ? product.forecastStream[targetIdx] : (product.actualStream[targetIdx] || 0);
                                }
                                
                                const histAlloc = product.allocMode === 'percentage' ? (histVol * (val / 100.0)) : val;
                                sum += histAlloc;
                                count++;
                            }
                        }
                        const effUnit = Math.round(provider.strategy.method === 'AVG' ? (count > 0 ? sum / count : 0) : sum);

                        let displayVal = "";
                        if (product.allocMode === 'percentage') {
                            const rawUnit = Math.round(monthVol * (val / 100.0));
                            displayVal = `${val}% <span class="text-slate-400 font-normal ml-1 text-[10px]">(Raw: ${rawUnit.toLocaleString()}, Eff: ${effUnit.toLocaleString()})</span>`;
                        } else {
                            displayVal = `${val.toLocaleString()} u <span class="text-slate-400 font-normal ml-1 text-[10px]">(Eff: ${effUnit.toLocaleString()})</span>`;
                        }
                        disp.innerHTML = displayVal;
                    }
                    
                    // Update Chart
                    if (e.type === 'input' || e.type === 'change') {
                         if (this.currentSessionData) {
                            this.updateSimulation(this.currentSessionData.providers, this.currentSessionData.products, this.currentSessionData.timeline);
                        }
                    }
                }
            };

            slider.addEventListener('input', handleInput);
        });

        // Store session data for event access
        this.currentSessionData = { products, providers, timeline: timeline }; 
        container.querySelectorAll('.raw-vol-toggle').forEach(toggle => {
            toggle.addEventListener('change', (e) => {
                console.log(`Raw Toggle Changed for Provider ${e.target.dataset.providerId}:`, e.target.checked);
                if (this.currentSessionData) {
                    this.updateSimulation(this.currentSessionData.providers, this.currentSessionData.products, this.currentSessionData.timeline);
                }
            });
        });
    }

    updateSimulation(providers, products, timeline) {
        // 1. Reset Provider Totals
        providers.forEach(p => {
            p.totalRawVolume = new Array(timeline.length).fill(0);
        });

        // 2. Accumulate Volumes
        
        // Get Reference Month Index for Hybrid Logic
        const refIndex = timeline.findIndex(t => `${t.year}-${t.month}` === this.referenceDateKey);

        products.forEach(prod => {
            // For each provider, add allocated portion
            providers.forEach(prov => {
                const alloc = prod.allocations[prov.id] || 0;
                
                for (let i = 0; i < timeline.length; i++) {
                    // Dynamic Volume Selection based on Simulation Horizon
                    // If month index (i) <= Analysis Month (refIndex): Treat as Actual (Past/Present)
                    // If month index (i) > Analysis Month: Treat as Forecast (Future)
                    let volSource = 0;
                    
                    if (i <= refIndex) {
                        // Priority: Actual > Forecast
                        volSource = prod.actualStream[i] !== null ? prod.actualStream[i] : (prod.forecastStream[i] || 0);
                    } else {
                        // Priority: Forecast > Actual
                        volSource = prod.forecastStream[i] !== null ? prod.forecastStream[i] : (prod.actualStream[i] || 0);
                    }

                    let vol = 0;
                    if (prod.allocMode === 'percentage') {
                        vol = volSource * (alloc / 100.0);
                    } else {
                        vol = alloc; // Fixed units
                    }
                    prov.totalRawVolume[i] += vol;
                }
            });
        });

        // 3. Calculate Strategy & Update Charts
        
        // Get Reference Month for Mix Charts
        const refLabel = refIndex >= 0 ? timeline[refIndex].label : 'N/A';

        providers.forEach(p => {
            // Apply Lookback
            p.totalEffectiveVolume = p.totalRawVolume.map((_, index) => {
                let sum = 0;
                let count = 0;
                for (let i = 0; i < p.strategy.lookback; i++) {
                    const targetIdx = index - i;
                    if (targetIdx >= 0) {
                        sum += p.totalRawVolume[targetIdx];
                        count++;
                    }
                }
                return p.strategy.method === 'AVG' ? (count > 0 ? sum / count : 0) : sum;
            });

            // Update Header Stats (Show Effective Volume for Selected Month)
            const totalVolEl = document.getElementById(`vol-total-${p.id}`);
            if (totalVolEl) {
                const monthEffVol = (refIndex >= 0 && p.totalEffectiveVolume[refIndex] !== undefined) 
                                    ? p.totalEffectiveVolume[refIndex] 
                                    : 0;
                totalVolEl.textContent = monthEffVol.toLocaleString(undefined, {maximumFractionDigits:0});
            }
            
            // Update Mix Chart (Breakdown of RAW volume for Analysis Month)
            if (p.mixChartInstance) {
                const mixLabel = document.getElementById(`mix-label-${p.id}`);
                const mixTotalEl = document.getElementById(`mix-total-${p.id}`);
                
                if(mixLabel) mixLabel.textContent = refLabel;
                
                const mixData = [];
                const mixLabels = [];
                const mixColors = [];
                let totalAlloc = 0;
                
                products.forEach((prod, i) => {
                     // Determine color (needs to match right side)
                     const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];
                     const color = colors[i % colors.length];
                     
                     // Calculate allocated raw volume for this provider at refIndex
                     const alloc = prod.allocations[p.id];
                     const monthVol = refIndex >= 0 && prod.rawStream[refIndex] !== undefined ? prod.rawStream[refIndex] : 0;
                     
                     let val = 0;
                     if (prod.allocMode === 'percentage') {
                         val = monthVol * (alloc / 100.0);
                     } else {
                         val = alloc;
                     }
                     val = Math.round(val);
                     
                     if (val > 0) {
                         mixLabels.push(prod.name);
                         mixData.push(val);
                         mixColors.push(color);
                         totalAlloc += val;
                     }
                });
                
                if (mixTotalEl) mixTotalEl.textContent = (totalAlloc / 1000).toFixed(1) + 'k';
                
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
            }

            // Update Chart Datasets
            if (p.chartInstance) {
                const datasets = [];
                const container = document.getElementById('provider_charts_container');
                const showRaw = container.querySelector(`.raw-vol-toggle[data-provider-id="${p.id}"]`)?.checked || false;

                // A. Raw Volume (Optional)
                datasets.push({
                    label: 'Raw Volume',
                    data: p.totalRawVolume,
                    borderColor: p.color,
                    borderWidth: 1,
                    borderDash: [2, 2],
                    pointRadius: 0,
                    fill: false,
                    hidden: !showRaw,
                    tension: 0.1
                });

                // B. Main Curve (Segmented: Actual vs Forecast)
                datasets.push({
                    label: 'Effective Volume',
                    data: p.totalEffectiveVolume,
                    borderColor: 'rgb(156, 163, 175)', // Default gray (slate-400)
                    backgroundColor: p.color + '15',
                    borderWidth: 3,
                    tension: 0.3,
                    fill: true,
                    pointRadius: (ctx) => {
                        const index = ctx.dataIndex;
                        // Show point at the transition (reference index)
                        if (index === refIndex) return 4;
                        return 0; 
                    },
                    pointBackgroundColor: 'white',
                    pointBorderColor: p.color,
                    pointBorderWidth: 2,
                    pointHitRadius: 10,
                    segment: {
                        borderColor: (ctx) => {
                            // Segment starts at p0 and goes to p1
                            // If p0 is before or at the cut-off (refIndex), it's considered "History/Actuals" context
                            // However, we want the line TO the next point to be dashed if the next point is future.
                            // Logic: If p1 (destination) is <= refIndex, it's a solid line (both points in past/present).
                            // If p1 is > refIndex, it's a future projection line.
                            
                            const p1Index = ctx.p1DataIndex;
                            if (p1Index <= refIndex) return 'rgb(156, 163, 175)'; // Grey for history
                            return p.color; // Provider color for forecast
                        },
                        borderDash: (ctx) => {
                            const p1Index = ctx.p1DataIndex;
                            if (p1Index <= refIndex) return undefined; // Solid
                            return [6, 4]; // Dashed for forecast
                        }
                    }
                });

                // B. Smart Tier Selection (Dynamic Visibility)
                // Calculate range of the current simulation curve
                let minVol = Infinity;
                let maxVol = -Infinity;
                p.totalEffectiveVolume.forEach(v => {
                    if (v < minVol) minVol = v;
                    if (v > maxVol) maxVol = v;
                });
                
                // Default if no data
                if (minVol === Infinity) { minVol = 0; maxVol = 0; }

                const allTiers = p.tierData; // Sorted asc by units
                let startIndex = 0;
                let endIndex = allTiers.length - 1;

                if (allTiers.length > 0) {
                    // Find the tier immediately below the minimum volume (Floor context)
                    // We want the last tier where units < minVol
                    let floorIndex = -1;
                    for (let i = 0; i < allTiers.length; i++) {
                        if (allTiers[i].units < minVol) floorIndex = i;
                        else break;
                    }
                    startIndex = floorIndex >= 0 ? floorIndex : 0;

                    // Find the tier immediately above the maximum volume (Ceiling context)
                    // We want the first tier where units > maxVol
                    let ceilingIndex = -1;
                    for (let i = allTiers.length - 1; i >= 0; i--) {
                        if (allTiers[i].units > maxVol) ceilingIndex = i;
                        else break;
                    }
                    endIndex = ceilingIndex >= 0 ? ceilingIndex : allTiers.length - 1;
                    
                    // Ensure we show at least the active range plus margin
                    // If indices crossed, just show surrounding
                }

                const displayTiers = allTiers.slice(startIndex, endIndex + 1);

                displayTiers.forEach((t) => {
                     datasets.push({
                        label: `${t.label} (${t.units.toLocaleString()})`,
                        data: new Array(timeline.length).fill(t.units),
                        borderColor: t.selected ? '#475569' : '#cbd5e1', // Darker slate for selected
                        borderWidth: t.selected ? 2 : 1,
                        borderDash: [4, 4],
                        pointRadius: 0,
                        fill: false,
                        isTierLine: true,
                        tierLabel: t.label
                     });
                });

                p.chartInstance.data.datasets = datasets;
                p.chartInstance.update('none'); // 'none' mode for performance
            }
            
            // Update Tier Status Chips
            const statusContainer = document.getElementById(`tiers-status-${p.id}`);
            if (statusContainer) {
                const currentVol = p.totalEffectiveVolume[p.totalEffectiveVolume.length - 1] || 0;
                
                // Use tierData for rich labels (T1, T2...)
                const activeTierObj = [...p.tierData].reverse().find(t => currentVol >= t.units);
                const nextTierObj = p.tierData.find(t => t.units > currentVol);
                
                let currentText = '';
                if (activeTierObj) {
                    currentText = `Current: ${activeTierObj.label} > ${activeTierObj.units.toLocaleString()}`;
                    if (!nextTierObj) {
                        currentText += ' (Max Tier Reached)';
                    }
                } else {
                    const firstTier = p.tierData[0];
                    currentText = firstTier ? `Current: < ${firstTier.units.toLocaleString()}` : 'Current: 0';
                }

                let nextHtml = '';
                if (nextTierObj) {
                    const gap = nextTierObj.units - currentVol;
                    nextHtml = `
                    <span class="px-2 py-1 rounded bg-amber-50 text-amber-700 border border-amber-100 font-medium">
                        Next: ${nextTierObj.label} < ${nextTierObj.units.toLocaleString()} (Gap: ${gap.toLocaleString(undefined, {maximumFractionDigits:0})})
                    </span>`;
                }

                statusContainer.innerHTML = `
                    <span class="px-2 py-1 rounded bg-green-50 text-green-700 border border-green-100 font-medium">
                        ${currentText}
                    </span>
                    ${nextHtml}
                `;
            }
        });
    }

    getProviderColor(index) {
        // Returns a palette object instead of single string
        const palettes = [
            { base: '#ef4444', light: '#fca5a5', dark: '#991b1b' }, // Red
            { base: '#f59e0b', light: '#fcd34d', dark: '#b45309' }, // Amber
            { base: '#10b981', light: '#6ee7b7', dark: '#047857' }, // Emerald
            { base: '#6366f1', light: '#a5b4fc', dark: '#4338ca' }, // Indigo
            { base: '#8b5cf6', light: '#c4b5fd', dark: '#6d28d9' }  // Violet
        ];
        return palettes[index % palettes.length];
    }
}

// Initialize instance globally so onclick handlers work
window.addEventListener('DOMContentLoaded', () => {
    window.simulationForecastInstance = new SimulationLookupStrategyForecast('simulationForecastContainer');
    // Note: init is called by optimizationApp.js when tab is clicked
});
