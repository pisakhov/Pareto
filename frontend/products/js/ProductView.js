/**
 * Product View - Handles product details view modal
 */
class ProductView {
    constructor() {
        this.modalId = 'productViewModal';
        this.viewMode = 'actuals'; // 'actuals' or 'forecasts'
        this.chart = null;
    }

    async show(productId) {
        try {
            // Load fresh data to get details
            const product = await dataService.getProduct(productId);
            this.currentProduct = product; // Store for reference
            this.render(product);
            
            // Setup Toggle
            this.setupModeToggle();
            
            // Render Forecast Analysis (Chart & Table)
            this.renderForecastAnalysis(product);
            
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

    renderForecastAnalysis(product) {
        // 1. Prepare Data
        this.forecastMap = new Map();
        this.actualMap = new Map();

        (product.forecasts || []).forEach(f => {
            this.forecastMap.set(`${f.year}-${f.month}`, f.forecast_units);
        });

        (product.actuals || []).forEach(a => {
            this.actualMap.set(`${a.year}-${a.month}`, a.actual_units);
        });

        // Collect all unique dates
        const allDates = [...new Set([...this.forecastMap.keys(), ...this.actualMap.keys()])].sort((a, b) => {
            const [y1, m1] = a.split('-').map(Number);
            const [y2, m2] = b.split('-').map(Number);
            return y1 - y2 || m1 - m2;
        });

        const labels = allDates.map(date => {
            const [year, month] = date.split('-');
            return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        });

        // 2. Render Chart
        const ctx = document.getElementById('viewForecastActualsChart');
        if (ctx) {
            if (this.chart) this.chart.destroy();

            this.chart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Forecast',
                            data: allDates.map(d => this.forecastMap.get(d) || null),
                            borderColor: 'rgb(251, 146, 60)',
                            backgroundColor: 'rgba(251, 146, 60, 0.15)',
                            borderWidth: 3,
                            tension: 0.4,
                            fill: true,
                            pointRadius: 5,
                            pointHoverRadius: 7
                        },
                        {
                            label: 'Actuals',
                            data: allDates.map(d => this.actualMap.get(d) || null),
                            borderColor: 'rgb(37, 91, 227)',
                            backgroundColor: 'rgba(37, 91, 227, 0.15)',
                            borderWidth: 3,
                            tension: 0.4,
                            fill: true,
                            pointRadius: 5,
                            pointHoverRadius: 7
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: true, position: 'top' } },
                    scales: {
                        y: { beginAtZero: true, grid: { color: 'rgba(0, 0, 0, 0.05)' } },
                        x: { grid: { display: false } }
                    }
                }
            });
        }

        // 3. Render Calculator & Table
        const tableBody = document.getElementById('viewForecastActualsTable');
        // Ensure table body exists, which implies the structure is loaded from HTML
        if (tableBody) {
            const container = tableBody.closest('.bg-white'); // Find the parent card container
            
            if (container) {
                // Insert Calculator HTML if not present
                if (!document.getElementById('unitsCalculator')) {
                    const calcHtml = `
                        <div id="unitsCalculator" class="bg-white rounded-xl p-5 mb-6 border border-slate-200 shadow-sm relative overflow-hidden">
                            <div class="absolute top-0 left-0 w-1.5 h-full bg-[#fb923c]"></div>
                            
                            <div class="mb-4 border-b border-slate-100 pb-3 flex items-center justify-between pl-2 pr-2">
                                <div class="flex items-center gap-2">
                                    <svg class="w-4 h-4 text-[#fb923c]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                    </svg>
                                    <span class="text-sm font-bold text-slate-800">Simulation Lookup</span>
                                </div>
                                <span class="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                                    <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    We don't save this information
                                </span>
                            </div>

                            <div class="flex flex-col sm:flex-row items-center justify-between gap-6 pl-2">
                                
                                <!-- Controls Group -->
                                <div class="flex flex-wrap items-center justify-center sm:justify-start gap-6 flex-1">
                                    
                                    <!-- Source -->
                                    <div class="flex flex-col gap-1.5">
                                        <label class="text-[11px] uppercase tracking-wider font-bold text-slate-400">Lookup Source</label>
                                        <div class="flex bg-slate-100/80 p-1 rounded-lg">
                                            <button type="button" id="btnCalcSourceActual" class="px-3 py-1.5 text-xs font-bold rounded-md bg-white text-slate-900 shadow-sm transition-all min-w-[70px]">Actuals</button>
                                            <button type="button" id="btnCalcSourceForecast" class="px-3 py-1.5 text-xs font-bold rounded-md text-slate-500 hover:text-slate-900 transition-all min-w-[70px]">Forecast</button>
                                        </div>
                                        <input type="hidden" id="calcSource" value="actual">
                                    </div>

                                    <!-- Method -->
                                    <div class="flex flex-col gap-1.5">
                                        <label class="text-[11px] uppercase tracking-wider font-bold text-slate-400">Method</label>
                                        <div class="flex bg-slate-100/80 p-1 rounded-lg">
                                            <button type="button" id="btnCalcMethodSum" class="px-3 py-1.5 text-xs font-bold rounded-md bg-white text-slate-900 shadow-sm transition-all min-w-[50px]">SUM</button>
                                            <button type="button" id="btnCalcMethodAvg" class="px-3 py-1.5 text-xs font-bold rounded-md text-slate-500 hover:text-slate-900 transition-all min-w-[50px]">AVG</button>
                                        </div>
                                        <input type="hidden" id="calcMethod" value="SUM">
                                    </div>

                                    <!-- Lookback -->
                                    <div class="flex flex-col gap-1.5">
                                        <label class="text-[11px] uppercase tracking-wider font-bold text-slate-400">Range (Months)</label>
                                        <div class="flex items-center bg-slate-50 border border-slate-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-[#fb923c]/20 focus-within:border-[#fb923c] transition-all h-[36px]">
                                            <div class="pl-3 pr-2 text-sm text-slate-500 font-medium border-r border-slate-200/50 bg-slate-100/50 h-full flex items-center">Last</div>
                                            <input type="number" id="calcLookback" class="w-16 text-center bg-transparent border-none focus:ring-0 text-sm font-semibold text-slate-900 py-1" value="3" min="1">
                                            <div class="pr-3 pl-2 text-[10px] text-slate-400 font-medium border-l border-slate-200/50 h-full flex items-center bg-slate-100/50" title="Includes current month">inc. curr.</div>
                                        </div>
                                    </div>

                                </div>

                                <!-- Result -->
                                <div class="flex flex-col items-end justify-center pl-6 sm:border-l sm:border-slate-100 min-w-[140px]">
                                    <span class="text-[11px] font-bold uppercase text-slate-400 tracking-wider mb-1">Calculated Base</span>
                                    <div class="flex items-baseline gap-1.5">
                                        <span id="calcResult" class="text-3xl font-bold text-slate-900 tabular-nums tracking-tight">--</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                    
                    // Insert before the table container (find parent of table)
                    const tableContainer = tableBody.parentElement; // table
                    const tableWrapper = tableContainer ? tableContainer.parentElement : null; // div.overflow-x-auto
                    
                    if (tableWrapper) {
                        tableWrapper.insertAdjacentHTML('beforebegin', calcHtml);
                        
                        // Bind Events
                        this.setupCalculatorEvents();
                    }
                }
            }
        }

        // 4. Render Table Rows
        // Reuse tableBody from step 3
        if (tableBody) {
            if (allDates.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="4" class="px-4 py-3 text-center text-slate-500">No data available</td></tr>';
            } else {
                let tableHtml = '';
                // Reverse chronological for the table
                const reversedDates = [...allDates].reverse();
                
                reversedDates.forEach(dateStr => {
                    const [year, month] = dateStr.split('-');
                    const label = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                    
                    const fVal = this.forecastMap.get(dateStr);
                    const aVal = this.actualMap.get(dateStr);
                    
                    const fDisplay = fVal !== undefined ? fVal.toLocaleString() : '-';
                    const aDisplay = aVal !== undefined ? aVal.toLocaleString() : '-';
                    
                    let varianceHtml = '-';
                    if (fVal !== undefined && aVal !== undefined) {
                        const variance = aVal - fVal;
                        const variancePct = fVal !== 0 ? ((variance / fVal) * 100).toFixed(1) : '0.0';
                        const colorClass = variance > 0 ? 'text-blue-600' : (variance < 0 ? 'text-orange-600' : 'text-slate-600');
                        const sign = variance > 0 ? '+' : '';
                        varianceHtml = `<span class="${colorClass} font-medium">${sign}${variance.toLocaleString()} (${sign}${variancePct}%)</span>`;
                    }

                    tableHtml += `
                        <tr data-date="${dateStr}" class="hover:bg-slate-50/50 transition-colors border-l-4 border-transparent">
                            <td class="px-4 py-2 font-medium text-slate-700">${label}</td>
                            <td class="px-4 py-2 text-right text-slate-600">${fDisplay}</td>
                            <td class="px-4 py-2 text-right text-slate-600 font-medium">${aDisplay}</td>
                            <td class="px-4 py-2 text-right text-slate-600">${varianceHtml}</td>
                        </tr>
                    `;
                });
                tableBody.innerHTML = tableHtml;
            }
        }
        
        // Trigger initial calculation
        this.updateCalculator();
    }

    setupCalculatorEvents() {
        // Bind Toggle Buttons
        const bindToggle = (valId, btnId, value) => {
            const btn = document.getElementById(btnId);
            if (!btn) return;
            
            btn.addEventListener('click', () => {
                // Update hidden input
                const input = document.getElementById(valId);
                if (input) input.value = value;

                // Update visual state for this group
                if (valId === 'calcSource') {
                    this.updateToggleState('btnCalcSourceActual', value === 'actual');
                    this.updateToggleState('btnCalcSourceForecast', value === 'forecast');
                } else if (valId === 'calcMethod') {
                    this.updateToggleState('btnCalcMethodSum', value === 'SUM');
                    this.updateToggleState('btnCalcMethodAvg', value === 'AVG');
                }

                this.updateCalculator();
            });
        };

        bindToggle('calcSource', 'btnCalcSourceActual', 'actual');
        bindToggle('calcSource', 'btnCalcSourceForecast', 'forecast');
        bindToggle('calcMethod', 'btnCalcMethodSum', 'SUM');
        bindToggle('calcMethod', 'btnCalcMethodAvg', 'AVG');

        // Bind Lookback Input
        const lookbackEl = document.getElementById('calcLookback');
        if(lookbackEl) {
            lookbackEl.addEventListener('change', () => this.updateCalculator());
            lookbackEl.addEventListener('input', () => this.updateCalculator());
        }
    }

    updateToggleState(btnId, isActive) {
        const btn = document.getElementById(btnId);
        if (!btn) return;
        if (isActive) {
            btn.className = 'px-3 py-1.5 text-xs font-bold rounded-md bg-white text-slate-900 shadow-sm transition-all min-w-[70px]';
            // Adjust min-width for Method buttons if needed, or keep generic
            if (btnId.includes('Method')) {
                 btn.className = 'px-3 py-1.5 text-xs font-bold rounded-md bg-white text-slate-900 shadow-sm transition-all min-w-[50px]';
            }
        } else {
            btn.className = 'px-3 py-1.5 text-xs font-bold rounded-md text-slate-500 hover:text-slate-900 transition-all min-w-[70px]';
            if (btnId.includes('Method')) {
                 btn.className = 'px-3 py-1.5 text-xs font-bold rounded-md text-slate-500 hover:text-slate-900 transition-all min-w-[50px]';
            }
        }
    }

    updateCalculator() {
        if (!this.currentPricingDate || !this.forecastMap) return;

        const source = document.getElementById('calcSource').value; // 'actual' or 'forecast'
        const method = document.getElementById('calcMethod').value; // 'SUM' or 'AVG'
        const lookback = parseInt(document.getElementById('calcLookback').value) || 1;
        
        let total = 0;
        let count = 0;
        const highlightedDates = new Set();

        // Calculate dates backwards from current
        for (let i = 0; i < lookback; i++) {
            const d = new Date(this.currentPricingDate.year, (this.currentPricingDate.month - 1) - i, 1);
            const dateKey = `${d.getFullYear()}-${d.getMonth() + 1}`;
            
            highlightedDates.add(dateKey);
            
            const map = source === 'actual' ? this.actualMap : this.forecastMap;
            const val = map.get(dateKey);
            
            if (val !== undefined) {
                total += val;
                count++;
            }
        }

        let result = 0;
        if (method === 'SUM') {
            result = total;
        } else if (method === 'AVG') {
            result = count > 0 ? total / count : 0;
        }

        // Update Result Display
        const resultEl = document.getElementById('calcResult');
        if (resultEl) {
            resultEl.textContent = result.toLocaleString(undefined, { maximumFractionDigits: 0 });
            resultEl.className = `text-3xl font-bold tabular-nums tracking-tight transition-colors ${source === 'actual' ? 'text-[#255be3]' : 'text-orange-600'}`;
        }

        // Highlight Table Rows
        const rows = document.querySelectorAll('#viewForecastActualsTable tr');
        rows.forEach(row => {
            const date = row.dataset.date;
            if (highlightedDates.has(date)) {
                row.className = `bg-${source === 'actual' ? 'blue' : 'orange'}-50/50 transition-colors border-l-4 border-${source === 'actual' ? 'blue' : 'orange'}-500`;
            } else {
                row.className = 'hover:bg-slate-50/50 transition-colors border-l-4 border-transparent';
            }
        });
    }

    setupModeToggle() {
        const btnActuals = document.getElementById('modeActuals');
        const btnForecasts = document.getElementById('modeForecasts');
        const unitsLabel = document.getElementById('unitsLabel');
        const iconContainer = document.getElementById('unitsIconContainer');

        if (!btnActuals || !btnForecasts) return;

        // Helper to update UI state
        const updateUI = (mode) => {
            this.viewMode = mode;
            
            if (mode === 'actuals') {
                btnActuals.className = 'px-3 py-1.5 text-sm font-medium rounded-md transition-all shadow-sm bg-white text-slate-900';
                btnForecasts.className = 'px-3 py-1.5 text-sm font-medium rounded-md text-slate-500 hover:text-slate-900 transition-all';
                unitsLabel.textContent = 'Actual Units';
                iconContainer.className = 'p-3 bg-slate-50 rounded-full text-slate-400 transition-colors';
            } else {
                btnForecasts.className = 'px-3 py-1.5 text-sm font-medium rounded-md transition-all shadow-sm bg-white text-[#fb923c]';
                btnActuals.className = 'px-3 py-1.5 text-sm font-medium rounded-md text-slate-500 hover:text-slate-900 transition-all';
                unitsLabel.textContent = 'Forecast Units';
                iconContainer.className = 'p-3 bg-orange-50 rounded-full text-[#fb923c] transition-colors';
            }

            // Refresh Date Selector (dates available might differ) and Data
            if (this.currentProduct) {
                this.renderDateSelector(this.currentProduct);
                // Default to current date when switching modes or keep selected if possible?
                // Simpler to reset to default (current) to avoid invalid dates
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
            this.loadPricingData(product.product_id, parseInt(year), parseInt(month));
            this.updateCalculator();
        };

        // Set initial current date state
        this.currentPricingDate = { year: currentYear, month: currentMonth };

        // Clear current content and add select
        container.innerHTML = '';
        container.appendChild(select);
    }

    async loadPricingData(productId, year = null, month = null) {
        const container = document.getElementById('pricingTablesContainer');
        container.innerHTML = '<div class="flex items-center justify-center py-8 text-slate-400"><span class="text-sm">Loading pricing data...</span></div>';
        
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
            
            // Calculate Grand Total
            let grandTotal = 0;
            data.processes.forEach(process => {
                process.rows.forEach(row => {
                    grandTotal += row.total_cost;
                });
            });

            // Update Header Stats
            // Note: `data.units` is returned from backend now instead of `actual_units`
            const units = data.units !== undefined ? data.units : data.actual_units; 
            document.getElementById('pricingActuals').textContent = units.toLocaleString();
            document.getElementById('pricingTotalCost').textContent = `$${grandTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
            
            this.renderPricingTables(data, container);
            
        } catch (error) {
            console.error('Error loading pricing data:', error);
            container.innerHTML = '<div class="text-center py-4 text-red-500 text-sm">Failed to load pricing breakdown</div>';
        }
    }

    renderPricingTables(data, container) {
        if (data.processes.length === 0) {
            container.innerHTML = '<div class="text-center py-4 text-slate-500 text-sm">No pricing data available</div>';
            return;
        }

        let html = '';
        
        data.processes.forEach(process => {
            html += `
                <div class="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                    <div class="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                        <h4 class="font-semibold text-slate-800 flex items-center gap-2">
                            <div class="w-2 h-2 rounded-full bg-[#fb923c]"></div>
                            ${this.escapeHtml(process.process_name)}
                        </h4>
                        <span class="text-xs text-slate-500 font-medium uppercase tracking-wider">${process.rows.length} items</span>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full text-sm text-left">
                            <thead class="bg-white border-b border-slate-100 text-xs text-slate-500 uppercase bg-slate-50/50">
                                <tr>
                                    <th class="px-4 py-3 font-medium border-r border-slate-100">Provider</th>
                                    <th class="px-4 py-3 font-medium">Item</th>
                                    <th class="px-4 py-3 font-medium text-right">Price</th>
                                    <th class="px-4 py-3 font-medium text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100">
            `;
            
            // Group rows by provider to calculate rowspan and totals
            const providerGroups = [];
            let currentGroup = null;
            let processTotal = 0;
            
            process.rows.forEach(row => {
                processTotal += row.total_cost;

                if (!currentGroup || currentGroup.providerName !== row.provider_name) {
                    currentGroup = {
                        providerName: row.provider_name,
                        rows: [],
                        total: 0
                    };
                    providerGroups.push(currentGroup);
                }
                currentGroup.rows.push(row);
                currentGroup.total += row.total_cost;
            });

            providerGroups.forEach(group => {
                group.rows.forEach((row, index) => {
                    const isFirst = index === 0;
                    const isLast = index === group.rows.length - 1;
                    const borderClass = isLast ? '' : ''; // Can add specific styling if needed
                    
                    html += `
                        <tr class="hover:bg-slate-50/50 transition-colors">
                            ${isFirst ? `
                                <td class="px-4 py-3 font-medium text-slate-900 border-r border-slate-100 bg-white align-top" rowspan="${group.rows.length}">
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
                            <td class="px-4 py-3 text-slate-600 font-medium">${this.escapeHtml(row.item_name)}</td>
                            <td class="px-4 py-3 text-right text-slate-600 align-top">
                                <div class="font-medium text-slate-700">$${parseFloat(row.price_per_unit.toFixed(4))}</div>
                                ${row.multiplier_display !== '-' ? `<div class="text-[10px] text-slate-400 mt-0.5">x${row.multiplier_display}</div>` : ''}
                            </td>
                            <td class="px-4 py-3 text-right font-bold text-[#fb923c]">$${row.total_cost.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 4})}</td>
                        </tr>
                    `;
                });
            });
            
            html += `
                            </tbody>
                            <tfoot class="bg-slate-50 border-t border-slate-200">
                                <tr>
                                    <td colspan="3" class="px-4 py-3 text-right font-semibold text-slate-700">Process Subtotal</td>
                                    <td class="px-4 py-3 text-right font-bold text-slate-900 text-base">
                                        $${processTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }
    
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
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
    }

    handleEscape = (e) => {
        if (e.key === 'Escape') this.close();
    }
}

// Initialize
const productView = new ProductView();
window.productView = productView;
