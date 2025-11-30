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
            // 1. Get Forecasts
            const product = await this.getProductDetails(productId);
            const forecasts = (product.forecasts || []).filter(f => String(f.process_id) === String(processId));
            
            if (forecasts.length === 0) {
                content.innerHTML = '<div class="text-center text-amber-600 p-4">No forecast data found for this process. Add forecasts in the Product editor first.</div>';
                return;
            }

            // 2. Get Tiers (Provider Tiers)
            // We need to know WHICH provider is relevant. A process might have multiple contracts.
            // Let's get contracts for this process.
            const contractsRes = await fetch(`/api/contracts/by-process/${processId}`);
            const contracts = await contractsRes.json();
            
            // For visualization, if multiple contracts exist, we might need to show multiple sets of tier lines or pick one.
            // Let's pick the first contract's provider for simplicity or show all if feasible.
            // "Opportunity" usually implies checking if we can hit a better tier.
            if (contracts.length === 0) {
                content.innerHTML = '<div class="text-center text-slate-500 p-4">No active contracts found for this process.</div>';
                return;
            }

            // 3. Calculate Effective Volumes based on Lookup Strategy
            // Default Strategy: Actuals, SUM, 0 lookback if not defined.
            // BUT for simulation we use FORECASTS as source (override source='actuals' to 'forecasts').
            const strategy = {
                method: lookup?.method || 'SUM',
                lookback: (lookup?.lookback_months || 0) + 1 // Window size
            };

            const chartData = this.calculateChartData(forecasts, strategy, contracts);
            
            this.renderChart(chartData, strategy, contracts);

        } catch (error) {
            console.error("Analysis Error:", error);
            content.innerHTML = `<div class="text-red-600 p-4">Analysis failed: ${error.message}</div>`;
        }
    }

    calculateChartData(forecasts, strategy, contracts) {
        // Sort forecasts by date
        forecasts.sort((a, b) => (a.year - b.year) || (a.month - b.month));

        // Create a map for easy lookup
        const forecastMap = new Map();
        forecasts.forEach(f => forecastMap.set(`${f.year}-${f.month}`, f.forecast_units));

        // Generate timeline (e.g., next 12 months from now, or range of available data)
        // Let's use available data range
        const timeline = forecasts.map(f => ({
            label: `${new Date(f.year, f.month - 1).toLocaleDateString('en-US', { month: 'short' })} '${String(f.year).slice(2)}`,
            year: f.year,
            month: f.month,
            raw: f.forecast_units,
            dateKey: `${f.year}-${f.month}`
        }));

        // Calculate Effective Volume (Rolling Window)
        const effectiveVolumes = timeline.map((point, index) => {
            // Collect window
            let sum = 0;
            let count = 0;
            // Look back 'strategy.lookback' months including current
            for (let i = 0; i < strategy.lookback; i++) {
                const targetIdx = index - i;
                if (targetIdx >= 0) {
                    sum += timeline[targetIdx].raw;
                    count++;
                }
            }
            
            // If we don't have enough history for full window at the start, we calculate with what we have
            // (Standard "ramp up" behavior)
            
            const val = strategy.method === 'AVG' ? (count > 0 ? sum / count : 0) : sum;
            return val;
        });

        return { labels: timeline.map(t => t.label), effectiveVolumes };
    }

    async renderChart(chartData, strategy, contracts) {
        const content = document.getElementById('sim_forecast_content');
        content.innerHTML = `
            <div class="w-full h-full flex flex-col">
                <div class="flex justify-between items-start mb-4 px-4 pt-4">
                    <div>
                        <h3 class="text-lg font-bold text-slate-800">Forecast vs. Tiers</h3>
                        <p class="text-sm text-slate-500">
                            Strategy: <span class="font-mono text-blue-600 bg-blue-50 px-1 rounded">${strategy.method}</span> 
                            Window: <span class="font-mono text-blue-600 bg-blue-50 px-1 rounded">${strategy.lookback} Month(s)</span>
                        </p>
                    </div>
                </div>
                <div class="flex-1 relative w-full min-h-[350px] p-4">
                    <canvas id="${this.chartId}"></canvas>
                </div>
            </div>
        `;

        const ctx = document.getElementById(this.chartId).getContext('2d');

        // Fetch tier thresholds for contracts to draw lines
        // We need to fetch them now.
        const tierDatasets = [];
        
        for (const contract of contracts) {
            const res = await fetch(`/api/contract-tiers/${contract.contract_id}`);
            const tiers = await res.json();
            // Sort and filter
            const thresholds = tiers.map(t => t.threshold_units).sort((a, b) => a - b).filter(t => t > 0);
            
            // Create a dataset for each meaningful threshold (Top 3 to avoid clutter?)
            // Let's pick distinct thresholds
            const distinct = [...new Set(thresholds)];
            
            distinct.forEach((threshold, idx) => {
                tierDatasets.push({
                    label: `${contract.provider_name} Tier`,
                    data: Array(chartData.labels.length).fill(threshold),
                    borderColor: this.getProviderColor(idx), 
                    borderWidth: 1,
                    borderDash: [5, 5],
                    pointRadius: 0,
                    fill: false
                });
            });
        }

        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: chartData.labels,
                datasets: [
                    {
                        label: 'Projected Effective Volume',
                        data: chartData.effectiveVolumes,
                        borderColor: '#023047',
                        backgroundColor: 'rgba(2, 48, 71, 0.1)',
                        borderWidth: 3,
                        tension: 0.4,
                        fill: true,
                        order: 1
                    },
                    ...tierDatasets
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            footer: (items) => {
                                // Logic to show "Gap to next tier"
                                const vol = items[0].parsed.y;
                                // Find closest tier above
                                let closest = Infinity;
                                let provider = '';
                                tierDatasets.forEach(d => {
                                    const t = d.data[0];
                                    if (t > vol && t < closest) {
                                        closest = t;
                                        provider = d.label;
                                    }
                                });
                                
                                if (closest !== Infinity) {
                                    const gap = closest - vol;
                                    return `\nGap to next tier: ${gap.toLocaleString()} units\n(${provider})`;
                                }
                                return '';
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Volume' }
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
