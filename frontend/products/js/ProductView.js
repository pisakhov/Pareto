/**
 * Product View - Handles product details view modal
 */
class ProductView {
    constructor() {
        this.modalId = 'productViewModal';
        this.viewMode = 'actuals'; // 'actuals' or 'forecasts'
        this.charts = new Map(); // Store chart instances by processId
        this.calculators = new Map(); // Store calculator state by processId
    }

    async show(productId) {
        try {
            // Clear previous charts
            this.charts.forEach(chart => chart.destroy());
            this.charts.clear();
            this.calculators.clear();

            // Load fresh data to get details
            const product = await dataService.getProduct(productId);
            this.currentProduct = product; // Store for reference
            
            this.render(product);
            
            // Setup Toggle
            this.setupModeToggle();
            
            // Initial Date Selector & Data Load
            this.renderDateSelector(product);
            this.loadPricingData(productId); // defaults to current date & actuals
            this.openModal();
        } catch (error) {
            console.error('Failed to load product details:', error);
            if (window.Toast) {
                Toast.show('Failed to load product details', 'error');
            } else {
                alert('Failed to load product details');
            }
        }
    }

    async loadPricingData(productId, year = null, month = null) {
        const container = document.getElementById('productProcessesContainer');
        // Only show loading if it's empty (initial load) to avoid flickering on calc updates
        if (!container.hasChildNodes()) {
             container.innerHTML = '<div class="flex items-center justify-center py-12 text-slate-400"><span class="text-sm">Loading data...</span></div>';
        }
        
        try {
            let url = `/api/products/${productId}/pricing_view?`;
            if (year && month) {
                url += `year=${year}&month=${month}&`;
            }
            
            if (this.viewMode === 'forecasts') {
                url += `use_forecasts=true`;
            }

            const response = await fetch(url);
            const data = await response.json();
            
            // Update Global Stats
            let grandTotal = 0;
            data.processes.forEach(process => {
                process.rows.forEach(row => {
                    grandTotal += row.total_cost;
                });
            });

            const units = data.units !== undefined ? data.units : data.actual_units; 
            document.getElementById('pricingActuals').textContent = units.toLocaleString();
            document.getElementById('pricingTotalCost').textContent = `$${grandTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
            document.getElementById('viewProductProcessCount').textContent = data.processes.length;

            // Render Processes
            container.innerHTML = ''; // Clear loading
            
            if (data.processes.length === 0) {
                container.innerHTML = '<div class="text-center py-8 text-slate-500">No process data available for this period.</div>';
                return;
            }

            data.processes.forEach(processData => {
                this.renderProcessSection(processData, container);
            });
            
        } catch (error) {
            console.error('Error loading pricing data:', error);
            container.innerHTML = '<div class="text-center py-4 text-red-500 text-sm">Failed to load data</div>';
        }
    }

    renderProcessSection(processData, container) {
        const processId = processData.process_id;
        const section = document.createElement('div');
        section.className = 'bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm';
        
        // Section Header
        section.innerHTML = `
            <div class="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <h3 class="text-lg font-bold text-slate-800 flex items-center gap-3">
                    <div class="w-3 h-3 rounded-full bg-[#fb923c]"></div>
                    ${this.escapeHtml(processData.process_name)}
                </h3>
                <span class="text-xs font-medium px-2.5 py-1 bg-white border border-slate-200 rounded-md text-slate-600">
                    ID: ${processId}
                </span>
            </div>
            <div class="p-6">
                <div class="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    <!-- Left: Pricing Breakdown -->
                    <div class="space-y-4">
                        <div class="flex items-center justify-between mb-2">
                            <h4 class="text-sm font-bold text-slate-700 uppercase tracking-wide">Pricing Breakdown</h4>
                        </div>
                        <div id="pricing_container_${processId}">
                            <!-- Pricing Table -->
                        </div>
                    </div>

                    <!-- Right: Analysis -->
                    <div class="space-y-4">
                        <div class="flex items-center justify-between mb-2">
                            <h4 class="text-sm font-bold text-slate-700 uppercase tracking-wide">Forecast vs Actuals Analysis</h4>
                        </div>
                        <div id="analysis_container_${processId}" class="bg-slate-50/50 rounded-xl p-4 border border-slate-100">
                            <!-- Analysis Content -->
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        container.appendChild(section);

        // 1. Render Pricing Table
        this.renderProcessPricing(processData, document.getElementById(`pricing_container_${processId}`));

        // 2. Render Analysis
        // We need to filter global forecasts/actuals for this process
        const processForecasts = (this.currentProduct.forecasts || []).filter(f => f.process_id === processId);
        const processActuals = (this.currentProduct.actuals || []).filter(a => a.process_id === processId);
        
        this.renderProcessAnalysis(processId, processForecasts, processActuals, document.getElementById(`analysis_container_${processId}`));
    }

    renderProcessPricing(processData, container) {
        if (processData.rows.length === 0) {
            container.innerHTML = '<div class="text-center py-4 text-slate-400 text-sm">No pricing items</div>';
            return;
        }

        let processTotal = 0;
        const providerGroups = [];
        let currentGroup = null;
        
        // Determine color based on view mode
        const totalColorClass = this.viewMode === 'actuals' ? 'text-[#255be3]' : 'text-[#fb923c]';

        processData.rows.forEach(row => {
            processTotal += row.total_cost;
            if (!currentGroup || currentGroup.providerName !== row.provider_name) {
                currentGroup = { providerName: row.provider_name, rows: [], total: 0 };
                providerGroups.push(currentGroup);
            }
            currentGroup.rows.push(row);
            currentGroup.total += row.total_cost;
        });

        let html = `
            <div class="overflow-x-auto border border-slate-200 rounded-lg">
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

        providerGroups.forEach(group => {
            group.rows.forEach((row, index) => {
                const isFirst = index === 0;
                html += `
                    <tr class="hover:bg-slate-50 transition-colors">
                        ${isFirst ? `
                            <td class="px-4 py-3 font-medium text-slate-900 border-r border-slate-100 bg-slate-50/30 align-top" rowspan="${group.rows.length}">
                                <div class="font-semibold text-slate-800 mb-3">${this.escapeHtml(row.provider_name)}</div>
                                
                                <div class="space-y-1.5 mb-3">
                                    <div class="flex justify-between items-baseline text-xs">
                                        <span class="text-slate-400 font-normal">Share</span>
                                        <span class="font-medium text-slate-600">${row.allocation}</span>
                                    </div>
                                    <div class="flex justify-between items-baseline text-xs">
                                        <span class="text-slate-400 font-normal">Volume</span>
                                        <span class="text-slate-600">${row.allocated_units.toLocaleString()} <span class="text-slate-400 text-[10px]">(Tier ${row.calculated_tier})</span></span>
                                    </div>
                                    <div class="flex justify-between items-center text-xs pt-0.5">
                                        <span class="text-slate-400 font-normal">Billed</span>
                                        <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#fff7ed] text-[#c2410c] border border-[#fdba74]">
                                            Tier ${row.tier}
                                        </span>
                                    </div>
                                </div>

                                <div class="pt-2 border-t border-slate-100 flex justify-between items-baseline">
                                    <span class="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Total</span>
                                    <span class="text-sm font-bold text-slate-700">$${group.total.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                                </div>
                            </td>
                        ` : ''}
                        <td class="px-4 py-3 text-slate-600">
                            <div class="font-medium">${this.escapeHtml(row.item_name)}</div>
                            <div class="text-xs text-slate-400 mt-1">Vol: ${row.allocated_units.toLocaleString()} <span class="text-[10px] bg-slate-100 px-1 rounded text-slate-500 ml-1">Tier ${row.calculated_tier}</span></div>
                        </td>
                        <td class="px-4 py-3 text-right text-slate-600 align-middle">
                            <div class="font-medium text-slate-700">$${parseFloat(row.price_per_unit.toFixed(4))}</div>
                            ${row.multiplier_display !== '-' ? `<div class="text-[10px] text-orange-500 mt-0.5">x${row.multiplier_display}</div>` : ''}
                        </td>
                        <td class="px-4 py-3 text-right font-bold ${totalColorClass} align-middle">$${row.total_cost.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 4})}</td>
                    </tr>
                `;
            });
        });

        html += `
                    </tbody>
                    <tfoot class="bg-slate-50 border-t border-slate-200">
                        <tr>
                            <td colspan="3" class="px-4 py-3 text-right font-semibold text-slate-700">Subtotal</td>
                            <td class="px-4 py-3 text-right font-bold text-slate-900">
                                $${processTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        `;

        container.innerHTML = html;
    }

    renderProcessAnalysis(processId, forecasts, actuals, container) {
        // 1. Prepare Maps
        const forecastMap = new Map();
        const actualMap = new Map();

        forecasts.forEach(f => forecastMap.set(`${f.year}-${f.month}`, f.forecast_units));
        actuals.forEach(a => actualMap.set(`${a.year}-${a.month}`, a.actual_units));

        const allDates = [...new Set([...forecastMap.keys(), ...actualMap.keys()])].sort((a, b) => {
            const [y1, m1] = a.split('-').map(Number);
            const [y2, m2] = b.split('-').map(Number);
            return y1 - y2 || m1 - m2;
        });

        // 2. Build HTML Structure
        const chartId = `chart_${processId}`;
        const tableId = `table_${processId}`;
        const calcId = `calc_${processId}`; // Prefix for calculator inputs

        container.innerHTML = `
            <!-- Chart -->
            <div class="bg-white border border-slate-200 rounded-lg p-4 mb-4 h-[250px] relative">
                <canvas id="${chartId}"></canvas>
            </div>

            <!-- Calculator -->
            <div class="bg-white rounded-xl p-5 mb-4 border border-slate-200 shadow-sm relative overflow-hidden">
                <div class="absolute top-0 left-0 w-1 h-full bg-[#fb923c]"></div>
                
                <div class="mb-4 border-b border-slate-100 pb-3 flex items-center justify-between">
                    <div class="flex items-center gap-2">
                        <svg class="w-4 h-4 text-[#fb923c]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                        <span class="text-sm font-bold text-slate-800">Simulation Lookup</span>
                    </div>
                </div>

                <div class="flex flex-wrap items-center gap-4 text-xs">
                    <div class="flex items-center bg-slate-100 p-1 rounded-lg">
                        <button type="button" id="${calcId}_src_act" class="px-2 py-1 rounded bg-white shadow-sm font-bold">Actuals</button>
                        <button type="button" id="${calcId}_src_fc" class="px-2 py-1 rounded text-slate-500">Forecast</button>
                    </div>
                    <div class="flex items-center bg-slate-100 p-1 rounded-lg">
                        <button type="button" id="${calcId}_mth_sum" class="px-2 py-1 rounded bg-white shadow-sm font-bold">SUM</button>
                        <button type="button" id="${calcId}_mth_avg" class="px-2 py-1 rounded text-slate-500">AVG</button>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="text-slate-500 font-medium">Range:</span>
                        <input type="number" id="${calcId}_lookback" value="3" min="1" class="w-12 text-center border border-slate-200 rounded py-1">
                    </div>
                    <div class="ml-auto">
                        <span id="${calcId}_result" class="text-xl font-bold text-[#fb923c]">--</span>
                    </div>
                </div>
            </div>

            <!-- Variance Table -->
            <div class="bg-white border border-slate-200 rounded-lg overflow-hidden">
                <div class="max-h-[300px] overflow-y-auto">
                    <table class="w-full text-sm text-left">
                        <thead class="bg-slate-50 text-xs text-slate-500 uppercase sticky top-0 border-b border-slate-200">
                            <tr>
                                <th class="px-4 py-2 font-medium">Month</th>
                                <th class="px-4 py-2 font-medium text-right text-orange-600">Fcst</th>
                                <th class="px-4 py-2 font-medium text-right text-[#255be3]">Act</th>
                                <th class="px-4 py-2 font-medium text-right">Var</th>
                            </tr>
                        </thead>
                        <tbody id="${tableId}" class="divide-y divide-slate-100">
                            <!-- Rows -->
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        // 3. Render Chart
        const ctx = document.getElementById(chartId);
        const labels = allDates.map(date => {
            const [year, month] = date.split('-');
            return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        });

        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Forecast',
                        data: allDates.map(d => forecastMap.get(d) || null),
                        borderColor: 'rgb(251, 146, 60)',
                        backgroundColor: 'rgba(251, 146, 60, 0.1)',
                        borderWidth: 2,
                        tension: 0.4,
                        fill: true,
                        pointRadius: 3
                    },
                    {
                        label: 'Actuals',
                        data: allDates.map(d => actualMap.get(d) || null),
                        borderColor: 'rgb(37, 91, 227)',
                        backgroundColor: 'rgba(37, 91, 227, 0.1)',
                        borderWidth: 2,
                        tension: 0.4,
                        fill: true,
                        pointRadius: 3
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: true, position: 'top', labels: { boxWidth: 10, font: { size: 10 } } } },
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(0, 0, 0, 0.05)' }, ticks: { font: { size: 10 } } },
                    x: { grid: { display: false }, ticks: { font: { size: 10 } } }
                }
            }
        });
        this.charts.set(processId, chart);

        // 4. Render Table Rows
        const tableBody = document.getElementById(tableId);
        const reversedDates = [...allDates].reverse();
        
        let tableHtml = '';
        if (reversedDates.length === 0) {
            tableHtml = '<tr><td colspan="4" class="px-4 py-3 text-center text-slate-500">No data</td></tr>';
        } else {
            reversedDates.forEach(dateStr => {
                const [year, month] = dateStr.split('-');
                const label = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                
                const fVal = forecastMap.get(dateStr);
                const aVal = actualMap.get(dateStr);
                
                const fDisplay = fVal !== undefined ? fVal.toLocaleString() : '-';
                const aDisplay = aVal !== undefined ? aVal.toLocaleString() : '-';
                
                let varianceHtml = '-';
                if (fVal !== undefined && aVal !== undefined) {
                    const variance = aVal - fVal;
                    const variancePct = fVal !== 0 ? ((variance / fVal) * 100).toFixed(1) : '0.0';
                    const colorClass = variance > 0 ? 'text-blue-600' : (variance < 0 ? 'text-orange-600' : 'text-slate-600');
                    varianceHtml = `<span class="${colorClass}">${variance > 0 ? '+' : ''}${variance.toLocaleString()}</span>`;
                }

                tableHtml += `
                    <tr data-date="${dateStr}" class="hover:bg-slate-50 transition-colors border-l-2 border-transparent">
                        <td class="px-4 py-2 text-slate-700">${label}</td>
                        <td class="px-4 py-2 text-right text-slate-600 text-xs">${fDisplay}</td>
                        <td class="px-4 py-2 text-right text-slate-600 text-xs font-medium">${aDisplay}</td>
                        <td class="px-4 py-2 text-right text-slate-600 text-xs">${varianceHtml}</td>
                    </tr>
                `;
            });
        }
        tableBody.innerHTML = tableHtml;

        // 5. Setup Calculator
        this.setupProcessCalculator(processId, calcId, tableId, forecastMap, actualMap);
    }

    setupProcessCalculator(processId, calcId, tableId, forecastMap, actualMap) {
        const state = { source: 'actual', method: 'SUM', lookback: 3 };
        this.calculators.set(processId, state);

        const update = () => {
            if (!this.currentPricingDate) return;
            
            const map = state.source === 'actual' ? actualMap : forecastMap;
            let total = 0;
            let count = 0;
            const highlightedDates = new Set();

            for (let i = 0; i < state.lookback; i++) {
                const d = new Date(this.currentPricingDate.year, (this.currentPricingDate.month - 1) - i, 1);
                const dateKey = `${d.getFullYear()}-${d.getMonth() + 1}`;
                highlightedDates.add(dateKey);
                
                const val = map.get(dateKey);
                if (val !== undefined) {
                    total += val;
                    count++;
                }
            }

            const result = state.method === 'SUM' ? total : (count > 0 ? total / count : 0);
            const resultEl = document.getElementById(`${calcId}_result`);
            if (resultEl) {
                resultEl.textContent = result.toLocaleString(undefined, { maximumFractionDigits: 0 });
                resultEl.className = `text-xl font-bold transition-colors ${state.source === 'actual' ? 'text-[#255be3]' : 'text-orange-600'}`;
            }

            // Highlight rows
            const rows = document.querySelectorAll(`#${tableId} tr`);
            rows.forEach(row => {
                if (highlightedDates.has(row.dataset.date)) {
                    row.className = `bg-${state.source === 'actual' ? 'blue' : 'orange'}-50/50 transition-colors border-l-2 border-${state.source === 'actual' ? 'blue' : 'orange'}-500`;
                } else {
                    row.className = 'hover:bg-slate-50 transition-colors border-l-2 border-transparent';
                }
            });
        };

        // Bind buttons
        const bindBtn = (suffix, key, val) => {
            const btn = document.getElementById(`${calcId}_${suffix}`);
            if (!btn) return;
            btn.onclick = () => {
                state[key] = val;
                // Update UI
                const groupIds = key === 'source' ? [`${calcId}_src_act`, `${calcId}_src_fc`] : [`${calcId}_mth_sum`, `${calcId}_mth_avg`];
                groupIds.forEach(id => {
                    const el = document.getElementById(id);
                    const isActive = (val === 'actual' && id.includes('act')) || (val === 'forecast' && id.includes('fc')) ||
                                     (val === 'SUM' && id.includes('sum')) || (val === 'AVG' && id.includes('avg'));
                    el.className = isActive ? 'px-2 py-1 rounded bg-white shadow-sm font-bold text-slate-800' : 'px-2 py-1 rounded text-slate-500 hover:text-slate-700';
                });
                update();
            };
        };

        bindBtn('src_act', 'source', 'actual');
        bindBtn('src_fc', 'source', 'forecast');
        bindBtn('mth_sum', 'method', 'SUM');
        bindBtn('mth_avg', 'method', 'AVG');

        const input = document.getElementById(`${calcId}_lookback`);
        if (input) {
            input.oninput = (e) => {
                state.lookback = parseInt(e.target.value) || 1;
                update();
            };
        }

        // Initial run
        update();
        // Expose update function so date selector can trigger it
        state.updateFunc = update;
    }

    // ... keep existing escapeHtml, render, formatDate, openModal, close, handleEscape ...
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    render(product) {
        // Populate fields
        document.getElementById('viewProductName').textContent = product.name;
        document.getElementById('viewProductDescription').textContent = product.description || 'No description provided';
        
        const statusEl = document.getElementById('viewProductStatus');
        const isActive = product.status === 'active';
        statusEl.textContent = isActive ? 'Active' : 'Inactive';
        statusEl.className = `px-2.5 py-0.5 rounded-full text-xs font-medium border ${isActive ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-700 border-gray-200'}`;

        // Dates
        document.getElementById('viewProductUpdated').textContent = this.formatDate(product.date_last_update);
        
        // Stats
        document.getElementById('viewProductItemCount').textContent = product.item_ids.length;
    }

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    }

    openModal() {
        const modal = document.getElementById(this.modalId);
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }
        
        // Close on Escape
        document.addEventListener('keydown', this.handleEscape);
    }

    close() {
        const modal = document.getElementById(this.modalId);
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
        document.removeEventListener('keydown', this.handleEscape);

        // Destroy chart to prevent memory leaks
        this.charts.forEach(chart => chart.destroy());
        this.charts.clear();
    }

    handleEscape = (e) => {
        if (e.key === 'Escape') this.close();
    }

    setupModeToggle() {
        const btnActuals = document.getElementById('modeActuals');
        const btnForecasts = document.getElementById('modeForecasts');
        const unitsLabel = document.getElementById('unitsLabel');
        const iconContainer = document.getElementById('unitsIconContainer');
        const costIconContainer = document.getElementById('costIconContainer');
        const costLabel = document.getElementById('pricingTotalCost');

        if (!btnActuals || !btnForecasts) return;

        // Helper to update UI state
        const updateUI = (mode) => {
            this.viewMode = mode;
            
            if (mode === 'actuals') {
                // Toggle Buttons
                btnActuals.className = 'px-3 py-1.5 text-sm font-medium rounded-md transition-all shadow-sm bg-white text-[#255be3] border border-slate-200';
                btnForecasts.className = 'px-3 py-1.5 text-sm font-medium rounded-md text-slate-500 hover:text-slate-900 transition-all';
                
                // Units Section (Blue)
                unitsLabel.textContent = 'Actual Units';
                if (iconContainer) iconContainer.className = 'p-2 bg-blue-50 rounded-full text-[#255be3] transition-colors';
                
                // Cost Section (Blue)
                if (costIconContainer) costIconContainer.className = 'p-2 bg-blue-50 rounded-full text-[#255be3] transition-colors';
                if (costLabel) costLabel.className = 'text-xl font-bold text-[#255be3] leading-none mt-0.5 transition-colors';

            } else {
                // Toggle Buttons
                btnForecasts.className = 'px-3 py-1.5 text-sm font-medium rounded-md transition-all shadow-sm bg-white text-[#fb923c] border border-slate-200';
                btnActuals.className = 'px-3 py-1.5 text-sm font-medium rounded-md text-slate-500 hover:text-slate-900 transition-all';
                
                // Units Section (Orange)
                unitsLabel.textContent = 'Forecast Units';
                if (iconContainer) iconContainer.className = 'p-2 bg-orange-50 rounded-full text-[#fb923c] transition-colors';

                // Cost Section (Orange)
                if (costIconContainer) costIconContainer.className = 'p-2 bg-orange-50 rounded-full text-[#fb923c] transition-colors';
                if (costLabel) costLabel.className = 'text-xl font-bold text-[#fb923c] leading-none mt-0.5 transition-colors';
            }

            // Refresh Date Selector (dates available might differ) and Data
            if (this.currentProduct) {
                this.renderDateSelector(this.currentProduct);
                this.loadPricingData(this.currentProduct.product_id); 
            }
        };

        // Set initial state
        updateUI(this.viewMode);

        // Add listeners
        btnActuals.onclick = () => updateUI('actuals');
        btnForecasts.onclick = () => updateUI('forecasts');
    }

    renderDateSelector(product) {
        const container = document.getElementById('pricingMonthYear');
        if (!container) return;

        // Select data source based on mode
        const sourceData = this.viewMode === 'forecasts' ? product.forecasts : product.actuals;
        
        // Get dates and sort descending
        const dates = (sourceData || []).sort((a, b) => {
            if (a.year !== b.year) return b.year - a.year;
            return b.month - a.month;
        });

        // Create Select Element
        const select = document.createElement('select');
        select.className = 'w-full bg-white border border-slate-300 text-slate-700 text-sm rounded-lg focus:ring-[#fb923c] focus:border-[#fb923c] block p-2.5 shadow-sm';
        
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;

        // Add "Current" option
        const currentMonthName = now.toLocaleString('default', { month: 'long' });
        const currentOption = document.createElement('option');
        currentOption.value = `${currentYear}-${currentMonth}`;
        currentOption.textContent = `${currentMonthName} ${currentYear} (Current)`;
        select.appendChild(currentOption);

        // Add available dates
        const uniqueDates = new Set();
        uniqueDates.add(`${currentYear}-${currentMonth}`);

        dates.forEach(d => {
            const dateKey = `${d.year}-${d.month}`;
            if (!uniqueDates.has(dateKey)) {
                uniqueDates.add(dateKey);
                const option = document.createElement('option');
                option.value = dateKey;
                const mName = new Date(d.year, d.month - 1).toLocaleString('default', { month: 'long' });
                option.textContent = `${mName} ${d.year}`;
                select.appendChild(option);
            }
        });

        // Handle Change
        select.onchange = (e) => {
            const [year, month] = e.target.value.split('-');
            this.currentPricingDate = { year: parseInt(year), month: parseInt(month) };
            
            // Update all calculators
            this.calculators.forEach(calcState => {
                if (calcState.updateFunc) calcState.updateFunc();
            });
            
            this.loadPricingData(product.product_id, parseInt(year), parseInt(month));
        };

        // Set initial current date state
        this.currentPricingDate = { year: currentYear, month: currentMonth };

        // Clear current content and add select
        container.innerHTML = '';
        container.appendChild(select);
    }
}

// Initialize
const productView = new ProductView();
window.productView = productView;
