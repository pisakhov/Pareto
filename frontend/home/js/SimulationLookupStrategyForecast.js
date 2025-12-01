/**
 * SimulationLookupStrategyForecast - Forecast Strategy Simulator
 * Visualizes forecasted effective volumes against tier thresholds to find opportunities.
 */
class SimulationLookupStrategyForecast {
    constructor(containerId) {
        this.containerId = containerId;
        this.products = [];
        this.selectedProductId = null;
        this.selectedProcessId = null;
        this.chart = null;
        this.chartId = 'forecastStrategyChart';
    }

    async init() {
        this.renderLoading();
        try {
            await this.loadProducts();
            this.renderInitialState();
        } catch (error) {
            console.error("Forecast Simulation Init Error:", error);
            this.renderError(error.message);
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

    async loadProducts() {
        const response = await fetch('/api/products');
        if (!response.ok) throw new Error("Failed to load products");
        const allProducts = await response.json();
        this.products = allProducts.filter(p => p.status === 'active');
    }

    renderInitialState() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="bg-card border border-border rounded-xl p-6 shadow-sm">
                <div class="mb-6">
                    <h2 class="text-xl font-semibold text-slate-900 mb-2">Tier Opportunity Analyzer</h2>
                    <p class="text-sm text-muted-foreground">Select a product and process to analyze how your forecasted volume interacts with pricing tiers.</p>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-1">Product</label>
                        <select id="sim_forecast_product" class="w-full bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                            <option value="">-- Select Product --</option>
                            ${this.products.map(p => `<option value="${p.product_id}">${p.name}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-1">Process</label>
                        <select id="sim_forecast_process" class="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-500 cursor-not-allowed" disabled>
                            <option value="">-- Select Process --</option>
                        </select>
                    </div>
                </div>

                <div id="sim_forecast_content" class="min-h-[400px] flex items-center justify-center bg-slate-50 rounded-lg border border-dashed border-slate-300">
                    <div class="text-center text-slate-400">
                        <svg class="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                        <p>Select a product and process to view forecast analysis</p>
                    </div>
                </div>
            </div>
        `;

        this.setupSelectors();
    }

    setupSelectors() {
        const productSelect = document.getElementById('sim_forecast_product');
        const processSelect = document.getElementById('sim_forecast_process');

        productSelect.addEventListener('change', async (e) => {
            this.selectedProductId = e.target.value;
            processSelect.innerHTML = '<option value="">Loading...</option>';
            processSelect.disabled = true;
            this.clearContent();

            if (this.selectedProductId) {
                try {
                    const product = await this.getProductDetails(this.selectedProductId);
                    // Extract processes from items (a bit indirect but robust given current API)
                    // Ideally we'd have an endpoint, but we can infer from item_ids + getAllContracts logic or similar.
                    // Actually, let's use the same logic as ProductModal to get processes.
                    // We can use /api/products/{id}/pricing_view to get active processes easily!
                    
                    const pricingView = await fetch(`/api/products/${this.selectedProductId}/pricing_view`).then(r => r.json());
                    
                    processSelect.innerHTML = '<option value="">-- Select Process --</option>';
                    
                    if (pricingView.processes && pricingView.processes.length > 0) {
                        pricingView.processes.forEach(p => {
                            const opt = document.createElement('option');
                            opt.value = p.process_id;
                            opt.textContent = p.process_name;
                            // Store lookup info in dataset for easy access
                            if (p.contract_lookup) {
                                opt.dataset.lookup = JSON.stringify(p.contract_lookup);
                            }
                            processSelect.appendChild(opt);
                        });
                        processSelect.disabled = false;
                        processSelect.classList.remove('bg-slate-50', 'text-slate-500', 'cursor-not-allowed');
                        processSelect.classList.add('bg-white', 'text-slate-900');
                    } else {
                        processSelect.innerHTML = '<option value="">No processes found</option>';
                    }
                } catch (err) {
                    console.error(err);
                    processSelect.innerHTML = '<option value="">Error loading processes</option>';
                }
            } else {
                processSelect.innerHTML = '<option value="">-- Select Process --</option>';
                processSelect.disabled = true;
                processSelect.classList.add('bg-slate-50', 'text-slate-500', 'cursor-not-allowed');
            }
        });

        processSelect.addEventListener('change', (e) => {
            this.selectedProcessId = e.target.value;
            if (this.selectedProcessId) {
                const option = processSelect.options[processSelect.selectedIndex];
                const lookup = option.dataset.lookup ? JSON.parse(option.dataset.lookup) : null;
                this.loadAndRenderAnalysis(this.selectedProductId, this.selectedProcessId, lookup);
            } else {
                this.clearContent();
            }
        });
    }

    async getProductDetails(productId) {
        const res = await fetch(`/api/products/${productId}`);
        return await res.json();
    }

    clearContent() {
        const content = document.getElementById('sim_forecast_content');
        if (content) {
            content.innerHTML = `
                <div class="text-center text-slate-400">
                    <svg class="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                    <p>Select a product and process to view forecast analysis</p>
                </div>
            `;
        }
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
    }

    async loadAndRenderAnalysis(productId, processId, lookup) {
        const content = document.getElementById('sim_forecast_content');
        content.innerHTML = '<div class="animate-pulse text-muted-foreground">Analyzing forecast data...</div>';

        try {
            // 1. Get Forecasts & Product Details (including allocations)
            const product = await this.getProductDetails(productId);
            const forecasts = (product.forecasts || []).filter(f => String(f.process_id) === String(processId));
            
            if (forecasts.length === 0) {
                content.innerHTML = '<div class="text-center text-amber-600 p-4">No forecast data found for this process. Add forecasts in the Product editor first.</div>';
                return;
            }

            // 2. Get Contracts
            const contractsRes = await fetch(`/api/contracts/by-process/${processId}`);
            const contracts = await contractsRes.json();
            
            if (contracts.length === 0) {
                content.innerHTML = '<div class="text-center text-slate-500 p-4">No active contracts found for this process.</div>';
                return;
            }

            // 3. Determine Allocations
            // Logic: Check for Global/Collective allocation first. If not, check for Item-specific allocation (using the first item found in this process).
            let allocationMap = new Map(); // providerId -> share (0-100)
            let allocationMode = 'percentage';

            if (product.allocations) {
                let rules = null;
                
                // Check Global
                if (product.allocations.mode && product.allocations.providers) {
                    rules = product.allocations.providers;
                    allocationMode = product.allocations.mode;
                } 
                // Check Item-specific (fallback)
                else {
                    // Find an item in this process to use as reference
                    // We need to know which items are in this process. 
                    // The 'product' object has 'item_ids' but doesn't explicitly map items to processes easily without 'contracts'.
                    // We can use the contracts we just fetched to find relevant items? 
                    // Actually, contracts map Provider <-> Process. Items map to Products.
                    // Let's infer from 'product.contracts' if available or just iterate keys.
                    
                    const itemKeys = Object.keys(product.allocations).filter(k => !isNaN(k));
                    if (itemKeys.length > 0) {
                        // Just pick the first one for now as a heuristic for the simulation
                        const firstKey = itemKeys[0];
                        if (product.allocations[firstKey] && product.allocations[firstKey].providers) {
                            rules = product.allocations[firstKey].providers;
                            allocationMode = product.allocations[firstKey].mode;
                        }
                    }
                }

                if (rules) {
                    rules.forEach(r => {
                        allocationMap.set(r.provider_id, r.value);
                    });
                }
            }

            // 4. Prepare Provider Data (Strategy + Tiers + Allocation)
            const providerData = await Promise.all(contracts.map(async (contract, idx) => {
                // Fetch Strategy
                const lookupRes = await fetch(`/api/contract-lookups/${contract.contract_id}`);
                const lookupData = await lookupRes.json();
                const strategy = {
                    method: lookupData.method || 'SUM',
                    lookback: (lookupData.lookback_months || 0) + 1
                };

                // Fetch Tiers
                const tiersRes = await fetch(`/api/contract-tiers/${contract.contract_id}`);
                const tiers = await tiersRes.json();
                const thresholds = tiers.map(t => t.threshold_units).sort((a, b) => a - b).filter(t => t > 0);
                const distinctThresholds = [...new Set(thresholds)];

                // Determine Share
                let shareVal = allocationMap.get(contract.provider_id);
                
                // Default handling:
                // If no rules existed at all, assume 100% (Scenario: Single provider or no allocation set).
                // If rules existed but this provider wasn't in them, assume 0%.
                if (shareVal === undefined) {
                    shareVal = allocationMap.size === 0 ? 100 : 0;
                }

                return {
                    contract,
                    providerName: contract.provider_name,
                    strategy,
                    thresholds: distinctThresholds,
                    color: this.getProviderColor(idx),
                    share: shareVal,
                    shareMode: allocationMode
                };
            }));

            // 5. Calculate Chart Data (Pass providerData to apply allocations)
            const chartData = this.calculateChartData(forecasts, providerData);
            
            this.renderChart(chartData, providerData);

        } catch (error) {
            console.error("Analysis Error:", error);
            content.innerHTML = `<div class="text-red-600 p-4">Analysis failed: ${error.message}</div>`;
        }
    }

    calculateChartData(forecasts, providerData) {
        // Sort forecasts by date
        forecasts.sort((a, b) => (a.year - b.year) || (a.month - b.month));

        // Generate timeline (Base Forecast)
        const timeline = forecasts.map(f => ({
            label: `${new Date(f.year, f.month - 1).toLocaleDateString('en-US', { month: 'short' })} '${String(f.year).slice(2)}`,
            year: f.year,
            month: f.month,
            raw: f.forecast_units,
            dateKey: `${f.year}-${f.month}`
        }));

        // Calculate Effective Volume for each provider (Applying Allocation Share)
        providerData.forEach(provider => {
            const { strategy, share, shareMode } = provider;
            
            provider.effectiveVolumes = timeline.map((point, index) => {
                // 1. Apply Allocation to Raw Forecast
                let allocatedRaw = 0;
                if (shareMode === 'percentage') {
                    allocatedRaw = point.raw * (share / 100.0);
                } else {
                    // 'units' mode (fixed volume) or other.
                    // For simulation, 'units' usually implies a fixed cap or floor, but strictly speaking it's "Allocated Units".
                    // If share is e.g. 5000, does it mean 5000 units/month? 
                    // For now, let's assume it's a fixed unit allocation per month if mode is units.
                    // But if raw < share? Usually it means "Up to". 
                    // Let's implement simple fixed amount for now if mode is units, else percentage.
                    allocatedRaw = share; // Fixed units
                }

                // Store this time-point's allocated raw for debugging/tooltips if needed
                // But we need to apply the STRATEGY (Rolling Window) to this allocated stream.
                
                return allocatedRaw; 
            });

            // 2. Apply Rolling Window Strategy to the Allocated Stream
            // We need to re-map because we need the history of *allocated* values, not just current.
            // Let's do a second pass or compute on fly.
            
            const allocatedStream = provider.effectiveVolumes; // Currently holding raw allocated
            
            const rollingVolumes = allocatedStream.map((_, index) => {
                let sum = 0;
                let count = 0;
                for (let i = 0; i < strategy.lookback; i++) {
                    const targetIdx = index - i;
                    if (targetIdx >= 0) {
                        sum += allocatedStream[targetIdx];
                        count++;
                    }
                }
                return strategy.method === 'AVG' ? (count > 0 ? sum / count : 0) : sum;
            });
            
            provider.effectiveVolumes = rollingVolumes;
        });

        return { labels: timeline.map(t => t.label), timeline };
    }

    renderChart(chartData, providerData) {
        const content = document.getElementById('sim_forecast_content');
        
        // Generate Strategy Info HTML with Breakdown Logic style
        const strategyInfo = providerData.map(p => `
            <div class="flex items-center gap-3 bg-white border border-slate-200 rounded-lg px-4 py-3 mr-3 mb-3 shadow-sm">
                <div class="w-3 h-3 rounded-full shadow-sm" style="background-color: ${p.color}"></div>
                <div>
                    <div class="font-bold text-sm text-slate-800">${p.providerName}</div>
                    <div class="flex items-center gap-3 text-xs mt-1">
                        <div class="flex flex-col">
                             <span class="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Strategy</span>
                             <span class="font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded mt-0.5 font-medium">${p.strategy.method} ${p.strategy.lookback}m</span>
                        </div>
                        <div class="w-px h-6 bg-slate-100"></div>
                        <div class="flex flex-col">
                             <span class="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Share</span>
                             <span class="font-medium text-slate-700 mt-0.5">${p.shareMode === 'percentage' ? p.share + '%' : p.share.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

        content.innerHTML = `
            <div class="w-full h-full flex flex-col">
                <div class="flex flex-col mb-2 px-4 pt-4">
                    <h3 class="text-lg font-bold text-slate-800 mb-3">Forecast vs. Tiers</h3>
                    <div class="flex flex-wrap">
                        ${strategyInfo}
                    </div>
                </div>
                <div class="flex-1 relative w-full min-h-[350px] p-4">
                    <canvas id="${this.chartId}"></canvas>
                </div>
            </div>
        `;

        const ctx = document.getElementById(this.chartId).getContext('2d');

        const datasets = [];

        providerData.forEach((p, idx) => {
            // Effective Volume Line
            datasets.push({
                label: `${p.providerName} Vol`,
                data: p.effectiveVolumes,
                borderColor: p.color,
                backgroundColor: p.color + '20', // Transparent fill
                borderWidth: 3,
                tension: 0.4,
                fill: false,
                yAxisID: 'y'
            });

            // Tier Lines
            p.thresholds.forEach((t) => {
                datasets.push({
                    label: `${p.providerName} Tier ${t}`, 
                    data: Array(chartData.labels.length).fill(t),
                    borderColor: p.color,
                    borderWidth: 1,
                    borderDash: [5, 5],
                    pointRadius: 0,
                    fill: false,
                    hidden: false 
                });
            });
        });

        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: chartData.labels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    legend: { 
                        position: 'bottom',
                        labels: {
                            filter: function(item, chart) {
                                return !item.text.includes('Tier');
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        titleColor: '#1e293b',
                        bodyColor: '#475569',
                        borderColor: '#e2e8f0',
                        borderWidth: 1,
                        padding: 10,
                        boxPadding: 4,
                        usePointStyle: true,
                        callbacks: {
                            label: function(context) {
                                // Hide standard label in favor of footer summary
                                return null; 
                            },
                            title: function(context) {
                                return context[0].label;
                            },
                            footer: (items) => {
                                // Custom detailed tooltip content
                                let tooltipLines = [];
                                
                                providerData.forEach(p => {
                                    // Find the volume item for this provider
                                    const dataIndex = items[0].dataIndex;
                                    const vol = p.effectiveVolumes[dataIndex];
                                    
                                    // Find Current Tier & Next Tier
                                    let currentTier = 0;
                                    let nextTier = null;
                                    
                                    for (const t of p.thresholds) {
                                        if (vol >= t) {
                                            currentTier = t;
                                        } else {
                                            nextTier = t;
                                            break;
                                        }
                                    }
                                    
                                    // Format lines
                                    tooltipLines.push(`• ${p.providerName.toUpperCase()}`);
                                    tooltipLines.push(`  Volume: ${vol.toLocaleString(undefined, {maximumFractionDigits: 0})}`);
                                    tooltipLines.push(`  Tier: ${currentTier.toLocaleString()}${currentTier === 0 ? ' (Base)' : ''}`);
                                    
                                    if (nextTier !== null) {
                                        const gap = nextTier - vol;
                                        const gapStr = gap > 0 ? gap.toLocaleString(undefined, {maximumFractionDigits: 0}) : '0';
                                        tooltipLines.push(`  Next Tier: ${nextTier.toLocaleString()} (Gap: ${gapStr})`);
                                    } else {
                                        tooltipLines.push(`  Max Tier Reached`);
                                    }
                                    tooltipLines.push(''); // Spacer
                                });
                                
                                return tooltipLines.join('\n');
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Allocated Volume' },
                        grid: { color: '#f1f5f9' }
                    },
                    x: {
                        grid: { display: false }
                    }
                }
            }
        });
    }

    getProviderColor(index) {
        const colors = ['#ef4444', '#f59e0b', '#10b981', '#6366f1', '#8b5cf6'];
        return colors[index % colors.length];
    }
}
