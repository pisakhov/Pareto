/**
 * Product Report Dashboard - Comprehensive analytics dashboard
 */
class ProductReportDashboard {
    constructor(productData, pricingDetails = {}) {
        this.productData = productData;
        this.productId = productData.product_id;
        this.name = productData.name;
        this.description = productData.description;
        this.status = productData.status;
        this.allocations = productData.allocations || {};
        this.priceMultipliers = productData.price_multipliers || {};
        this.pricingDetails = pricingDetails;
    }

    /**
     * Initialize the dashboard
     */
    async init() {
        this.renderHeader();
        this.renderKPIs();
        this.renderProcessItemBreakdown();
        this.renderProviderFinancialAnalysis();
        this.renderForecastActualsAnalysis();
        this.renderProviderComparisonChart();
        this.renderAllocationsSummary();
    }

    /**
     * Render dashboard header
     */
    renderHeader() {
        const headerHTML = `
            <div class="mb-6">
                <div class="flex items-center justify-between mb-2">
                    <h2 class="text-2xl font-bold text-foreground">${this.escapeHtml(this.name)}</h2>
                    <span class="px-3 py-1 text-sm rounded-full ${
                        this.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                    }">
                        ${this.status}
                    </span>
                </div>
                ${this.description ? `<p class="text-muted-foreground">${this.escapeHtml(this.description)}</p>` : ''}
                <div class="text-sm text-muted-foreground mt-2">
                    <span>Product ID: ${this.productId}</span> •
                    <span>Last Updated: ${this.formatDate(this.productData.date_last_update)}</span>
                </div>
            </div>
        `;
        document.getElementById('productViewContent').innerHTML = headerHTML;
    }

    /**
     * Calculate and render KPI cards
     */
    renderKPIs() {
        const kpis = this.calculateKPIs();

        const kpiHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div class="bg-card border rounded-lg p-4">
                    <div class="flex items-center gap-2 mb-2">
                        <svg class="w-4 h-4 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                        <span class="text-xs text-muted-foreground">Total Items</span>
                    </div>
                    <div class="text-2xl font-bold text-foreground">${kpis.totalItems}</div>
                    <div class="text-xs text-muted-foreground mt-1">across ${kpis.totalProcesses} processes</div>
                </div>

                <div class="bg-card border rounded-lg p-4">
                    <div class="flex items-center gap-2 mb-2">
                        <svg class="w-4 h-4 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                        </svg>
                        <span class="text-xs text-muted-foreground">Total Providers</span>
                    </div>
                    <div class="text-2xl font-bold text-foreground">${kpis.totalProviders}</div>
                    <div class="text-xs text-muted-foreground mt-1">active providers</div>
                </div>

                <div class="bg-card border rounded-lg p-4">
                    <div class="flex items-center gap-2 mb-2">
                        <svg class="w-4 h-4 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                        </svg>
                        <span class="text-xs text-muted-foreground">Forecast vs Actual</span>
                    </div>
                    <div class="text-2xl font-bold text-blue-600">${kpis.avgVariancePercent.toFixed(0)}%</div>
                    <div class="text-xs text-muted-foreground mt-1">avg variance</div>
                </div>

                <div class="bg-card border rounded-lg p-4">
                    <div class="flex items-center gap-2 mb-2">
                        <svg class="w-4 h-4 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        <span class="text-xs text-muted-foreground">Avg Unit Cost</span>
                    </div>
                    <div class="text-2xl font-bold text-green-600">$${kpis.avgCost.toFixed(2)}</div>
                    <div class="text-xs text-muted-foreground mt-1">with multipliers</div>
                </div>
            </div>
        `;

        document.getElementById('productViewContent').insertAdjacentHTML('beforeend', kpiHTML);
    }

    /**
     * Calculate KPI values
     */
    calculateKPIs() {
        // Get unique processes
        const processes = new Set();
        if (this.productData.contracts) {
            this.productData.contracts.forEach(contract => {
                processes.add(contract.process_name);
            });
        }

        // Count providers from allocations
        const providers = new Set();
        Object.values(this.allocations).forEach(allocation => {
            if (allocation.providers) {
                allocation.providers.forEach(p => providers.add(p.provider_id));
            }
        });

        // Calculate forecast vs actual variance
        let avgVariancePercent = 0;
        if (this.productData.forecasts && this.productData.forecasts.length > 0 &&
            this.productData.actuals && this.productData.actuals.length > 0) {

            const forecastMap = new Map();
            this.productData.forecasts.forEach(f => {
                const key = `${f.year}-${f.month}`;
                forecastMap.set(key, f.forecast_units);
            });

            let totalVariance = 0;
            let count = 0;
            this.productData.actuals.forEach(a => {
                const key = `${a.year}-${a.month}`;
                const forecast = forecastMap.get(key) || 0;
                if (forecast > 0) {
                    const variance = ((a.actual_units - forecast) / forecast) * 100;
                    totalVariance += variance;
                    count++;
                }
            });
            avgVariancePercent = count > 0 ? totalVariance / count : 0;
        }

        // Calculate average cost
        let avgCost = 0;
        let costCount = 0;
        if (this.pricingDetails && Object.keys(this.pricingDetails).length > 0) {
            Object.entries(this.pricingDetails).forEach(([itemId, itemPricing]) => {
                const pricingEntries = Object.values(itemPricing);
                pricingEntries.forEach(p => {
                    if (p.final_price) {
                        avgCost += parseFloat(p.final_price);
                        costCount++;
                    }
                });
            });
            avgCost = costCount > 0 ? avgCost / costCount : 0;
        }

        return {
            totalItems: Object.keys(this.allocations).length,
            totalProcesses: processes.size,
            totalProviders: providers.size,
            avgVariancePercent: avgVariancePercent,
            avgCost: avgCost
        };
    }

    /**
     * Render process and item breakdown table (MOST IMPORTANT)
     */
    renderProcessItemBreakdown() {
        const tableHTML = `
            <div class="bg-card border rounded-lg p-6 mb-6">
                <h3 class="text-lg font-semibold mb-4">Process & Item Breakdown</h3>
                <div class="overflow-x-auto">
                    <table class="w-full text-sm">
                        <thead class="border-b border-border">
                            <tr>
                                <th class="text-left py-3 font-semibold">Process</th>
                                <th class="text-left py-3 font-semibold">Item</th>
                                <th class="text-left py-3 font-semibold">Provider</th>
                                <th class="text-right py-3 font-semibold">Allocation</th>
                                <th class="text-right py-3 font-semibold">Base Price</th>
                                <th class="text-right py-3 font-semibold">Multiplier</th>
                                <th class="text-right py-3 font-semibold">Final Price</th>
                                <th class="text-center py-3 font-semibold">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.renderProcessItemRows()}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        document.getElementById('productViewContent').insertAdjacentHTML('beforeend', tableHTML);
    }

    /**
     * Render rows for process-item breakdown
     */
    renderProcessItemRows() {
        const rows = [];
        const items = window.productsApp?.data?.items || [];

        // Build map of items
        const itemMap = {};
        items.forEach(item => {
            itemMap[item.item_id] = item;
        });

        // Process each allocation (per-item)
        Object.entries(this.allocations).forEach(([itemId, allocation]) => {
            const item = itemMap[itemId] || { item_name: `Item ${itemId}` };
            const itemPricing = this.pricingDetails[itemId] || {};

            // Find which process this item belongs to
            let processName = 'Unknown';
            if (this.productData.contracts) {
                for (const contract of this.productData.contracts) {
                    if (contract.items.some(i => i.item_id == itemId)) {
                        processName = contract.process_name;
                        break;
                    }
                }
            }

            // Get pricing info (use first provider if multiple)
            const pricingEntries = Object.values(itemPricing);
            const pricing = pricingEntries[0] || {};

            const providers = allocation.providers || [];
            providers.forEach(provider => {
                const allocationPercent = provider.value;
                const isLocked = allocation.locked && provider.provider_id === allocation.lockedProviderId;
                const multiplier = this.priceMultipliers[itemId]?.multiplier || 1.0;
                const basePrice = pricing.base_price || 0;
                const finalPrice = pricing.final_price || (basePrice * multiplier);

                rows.push(`
                    <tr class="border-b border-border last:border-0 hover:bg-accent/50">
                        <td class="py-3">
                            <span class="font-medium">${this.escapeHtml(processName)}</span>
                        </td>
                        <td class="py-3">
                            <span>${this.escapeHtml(item.item_name)}</span>
                        </td>
                        <td class="py-3">
                            <div class="flex items-center gap-2">
                                <div class="w-2 h-2 rounded-full bg-blue-500"></div>
                                <span>${this.escapeHtml(provider.provider_name)}</span>
                            </div>
                        </td>
                        <td class="py-3 text-right font-medium">
                            ${allocationPercent}%
                        </td>
                        <td class="py-3 text-right">
                            $${parseFloat(basePrice).toFixed(2)}
                        </td>
                        <td class="py-3 text-right">
                            <span class="${multiplier > 1 ? 'text-amber-600' : multiplier < 1 ? 'text-green-600' : 'text-gray-600'}">
                                ${multiplier.toFixed(2)}x
                            </span>
                        </td>
                        <td class="py-3 text-right font-semibold text-green-600">
                            $${parseFloat(finalPrice).toFixed(2)}
                        </td>
                        <td class="py-3 text-center">
                            ${isLocked ? '<span class="px-2 py-1 text-xs rounded bg-red-100 text-red-700">🔒 Locked</span>' : ''}
                            ${allocation.mode === 'percentage' ? '<span class="px-2 py-1 text-xs rounded bg-blue-100 text-blue-700">% Based</span>' : ''}
                        </td>
                    </tr>
                `);
            });
        });

        return rows.join('') || '<tr><td colspan="8" class="py-8 text-center text-muted-foreground">No process-item data available</td></tr>';
    }

    /**
     * Render provider financial analysis
     */
    renderProviderFinancialAnalysis() {
        const analysisHTML = `
            <div class="bg-card border rounded-lg p-6 mb-6">
                <h3 class="text-lg font-semibold mb-4">Provider Financial Analysis</h3>
                <div class="overflow-x-auto">
                    <table class="w-full text-sm">
                        <thead class="border-b border-border">
                            <tr>
                                <th class="text-left py-3 font-semibold">Provider</th>
                                <th class="text-right py-3 font-semibold">Items</th>
                                <th class="text-right py-3 font-semibold">Allocation Share</th>
                                <th class="text-right py-3 font-semibold">Avg Price</th>
                                <th class="text-right py-3 font-semibold">Total Cost</th>
                                <th class="text-left py-3 font-semibold">Breakdown</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.renderProviderFinancialRows()}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        document.getElementById('productViewContent').insertAdjacentHTML('beforeend', analysisHTML);
    }

    /**
     * Render provider financial breakdown rows
     */
    renderProviderFinancialRows() {
        const providerMap = new Map();

        // Aggregate data by provider
        Object.entries(this.allocations).forEach(([itemId, allocation]) => {
            allocation.providers.forEach(provider => {
                const pid = provider.provider_id;
                if (!providerMap.has(pid)) {
                    providerMap.set(pid, {
                        provider_id: pid,
                        provider_name: provider.provider_name,
                        items: [],
                        totalAllocation: 0,
                        totalCost: 0,
                        pricingCount: 0
                    });
                }
                const data = providerMap.get(pid);
                data.items.push(parseInt(itemId));
                data.totalAllocation += provider.value;
            });
        });

        // Add pricing data
        providerMap.forEach((data, pid) => {
            let totalCost = 0;
            let count = 0;
            data.items.forEach(itemId => {
                const itemPricing = this.pricingDetails[itemId] || {};
                const pricingEntries = Object.values(itemPricing);
                if (pricingEntries.length > 0) {
                    totalCost += parseFloat(pricingEntries[0].final_price || 0);
                    count++;
                }
            });
            data.avgCost = count > 0 ? totalCost / count : 0;
            data.totalCost = totalCost;
        });

        const rows = [];
        providerMap.forEach(data => {
            const allocationShare = ((data.totalAllocation / Object.values(this.allocations)
                .reduce((sum, a) => sum + (a.providers || []).reduce((s, p) => s + p.value, 0), 0)) * 100);

            rows.push(`
                <tr class="border-b border-border last:border-0">
                    <td class="py-3">
                        <div class="flex items-center gap-2">
                            <div class="w-3 h-3 rounded-full bg-blue-500"></div>
                            <span class="font-medium">${this.escapeHtml(data.provider_name)}</span>
                        </div>
                    </td>
                    <td class="py-3 text-right font-medium">
                        ${data.items.length}
                    </td>
                    <td class="py-3 text-right">
                        ${allocationShare.toFixed(1)}%
                    </td>
                    <td class="py-3 text-right font-medium">
                        $${data.avgCost.toFixed(2)}
                    </td>
                    <td class="py-3 text-right font-semibold text-green-600">
                        $${data.totalCost.toFixed(2)}
                    </td>
                    <td class="py-3">
                        <div class="flex flex-wrap gap-1">
                            ${data.items.map(id => `<span class="px-2 py-1 text-xs rounded bg-gray-100">Item ${id}</span>`).join('')}
                        </div>
                    </td>
                </tr>
            `);
        });

        return rows.join('') || '<tr><td colspan="6" class="py-8 text-center text-muted-foreground">No provider data available</td></tr>';
    }

    /**
     * Render forecast vs actuals analysis
     */
    renderForecastActualsAnalysis() {
        if (!this.productData.forecasts || this.productData.forecasts.length === 0) {
            return;
        }

        const analysisHTML = `
            <div class="bg-card border rounded-lg p-6 mb-6">
                <h3 class="text-lg font-semibold mb-4">Forecast vs Actuals Analysis</h3>

                <!-- Monthly Variance Table -->
                <div class="overflow-x-auto mb-6">
                    <table class="w-full text-sm">
                        <thead class="border-b border-border">
                            <tr>
                                <th class="text-left py-2 font-semibold">Month</th>
                                <th class="text-right py-2 font-semibold">Forecast</th>
                                <th class="text-right py-2 font-semibold">Actual</th>
                                <th class="text-right py-2 font-semibold">Variance</th>
                                <th class="text-right py-2 font-semibold">Variance %</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.renderForecastActualRows()}
                        </tbody>
                    </table>
                </div>

                <!-- Chart -->
                <div class="relative" style="height: 300px;">
                    <canvas id="forecastActualsChart"></canvas>
                </div>
            </div>
        `;
        document.getElementById('productViewContent').insertAdjacentHTML('beforeend', analysisHTML);

        // Initialize chart
        setTimeout(() => this.initForecastActualsChart(), 100);
    }

    /**
     * Render forecast vs actual rows
     */
    renderForecastActualRows() {
        const forecastMap = new Map();
        this.productData.forecasts.forEach(f => {
            const key = `${f.year}-${f.month}`;
            forecastMap.set(key, f.forecast_units);
        });

        const actualMap = new Map();
        this.productData.actuals.forEach(a => {
            const key = `${a.year}-${a.month}`;
            actualMap.set(key, a.actual_units);
        });

        const rows = [];
        const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        // Get all months from forecasts
        const months = [...this.productData.forecasts].sort((a, b) => {
            if (a.year !== b.year) return b.year - a.year;
            return b.month - a.month;
        });

        months.forEach(f => {
            const key = `${f.year}-${f.month}`;
            const actual = actualMap.get(key) || 0;
            const variance = actual - f.forecast_units;
            const variancePercent = f.forecast_units > 0 ? (variance / f.forecast_units * 100) : 0;
            const varianceClass = variance > 0 ? 'text-green-600' : variance < 0 ? 'text-red-600' : 'text-gray-600';

            rows.push(`
                <tr class="border-b border-border last:border-0 hover:bg-accent/50">
                    <td class="py-2 font-medium">${monthNames[f.month]} ${f.year}</td>
                    <td class="py-2 text-right">${f.forecast_units.toLocaleString()}</td>
                    <td class="py-2 text-right">${actual.toLocaleString()}</td>
                    <td class="py-2 text-right ${varianceClass}">${variance > 0 ? '+' : ''}${variance.toLocaleString()}</td>
                    <td class="py-2 text-right ${varianceClass} font-medium">${variancePercent > 0 ? '+' : ''}${variancePercent.toFixed(1)}%</td>
                </tr>
            `);
        });

        return rows.join('');
    }

    /**
     * Initialize forecast vs actuals chart
     */
    initForecastActualsChart() {
        const ctx = document.getElementById('forecastActualsChart');
        if (!ctx || !window.Chart) return;

        const forecastMap = new Map();
        this.productData.forecasts.forEach(f => {
            const key = `${f.year}-${f.month}`;
            forecastMap.set(key, f.forecast_units);
        });

        const actualMap = new Map();
        this.productData.actuals.forEach(a => {
            const key = `${a.year}-${a.month}`;
            actualMap.set(key, a.actual_units);
        });

        const sortedForecasts = [...this.productData.forecasts].sort((a, b) => {
            if (a.year !== b.year) return a.year - b.year;
            return a.month - b.month;
        });

        const labels = sortedForecasts.map(f => {
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return `${monthNames[f.month - 1]} ${f.year}`;
        });

        const forecastData = sortedForecasts.map(f => f.forecast_units);
        const actualData = sortedForecasts.map(f => {
            const key = `${f.year}-${f.month}`;
            return actualMap.get(key) || 0;
        });

        if (this.chart) {
            this.chart.destroy();
        }

        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Forecast',
                    data: forecastData,
                    borderColor: 'rgb(251, 146, 60)',
                    backgroundColor: 'rgba(251, 146, 60, 0.1)',
                    tension: 0.4
                }, {
                    label: 'Actual',
                    data: actualData,
                    borderColor: 'rgb(37, 91, 227)',
                    backgroundColor: 'rgba(37, 91, 227, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return value.toLocaleString();
                            }
                        }
                    }
                }
            }
        });
    }

    /**
     * Render provider comparison chart
     */
    renderProviderComparisonChart() {
        const comparisonHTML = `
            <div class="bg-card border rounded-lg p-6 mb-6">
                <h3 class="text-lg font-semibold mb-4">Provider Cost Comparison</h3>
                <div class="relative" style="height: 300px;">
                    <canvas id="providerComparisonChart"></canvas>
                </div>
            </div>
        `;
        document.getElementById('productViewContent').insertAdjacentHTML('beforeend', comparisonHTML);

        setTimeout(() => this.initProviderComparisonChart(), 100);
    }

    /**
     * Initialize provider comparison chart
     */
    initProviderComparisonChart() {
        const ctx = document.getElementById('providerComparisonChart');
        if (!ctx || !window.Chart) return;

        const providers = new Map();
        Object.entries(this.pricingDetails).forEach(([itemId, itemPricing]) => {
            const pricingEntries = Object.values(itemPricing);
            pricingEntries.forEach(p => {
                if (!providers.has(p.provider_id)) {
                    providers.set(p.provider_id, {
                        name: p.provider_name || `Provider ${p.provider_id}`,
                        total: 0,
                        count: 0
                    });
                }
                const data = providers.get(p.provider_id);
                data.total += p.final_price || 0;
                data.count++;
            });
        });

        const labels = [];
        const avgPrices = [];
        providers.forEach(data => {
            labels.push(data.name);
            avgPrices.push(data.count > 0 ? data.total / data.count : 0);
        });

        if (this.providerChart) {
            this.providerChart.destroy();
        }

        this.providerChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Average Price',
                    data: avgPrices,
                    backgroundColor: ['rgba(59, 130, 246, 0.6)', 'rgba(251, 146, 60, 0.6)'],
                    borderColor: ['rgb(59, 130, 246)', 'rgb(251, 146, 60)'],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toFixed(2);
                            }
                        }
                    }
                }
            }
        });
    }

    /**
     * Render allocations summary
     */
    renderAllocationsSummary() {
        const summaryHTML = `
            <div class="bg-card border rounded-lg p-6 mb-6">
                <h3 class="text-lg font-semibold mb-4">Provider Allocations Summary</h3>
                <div class="space-y-4">
                    ${this.renderAllocationCards()}
                </div>
            </div>
        `;
        document.getElementById('productViewContent').insertAdjacentHTML('beforeend', summaryHTML);
    }

    /**
     * Render allocation summary cards
     */
    renderAllocationCards() {
        const cards = [];

        Object.entries(this.allocations).forEach(([itemId, allocation]) => {
            const itemName = `Item ${itemId}`;
            if (!allocation.providers || allocation.providers.length === 0) {
                cards.push(`
                    <div class="border border-border rounded-lg p-4">
                        <div class="flex items-center justify-between mb-2">
                            <h4 class="font-medium">${this.escapeHtml(itemName)}</h4>
                            <span class="text-xs text-muted-foreground">No allocations</span>
                        </div>
                    </div>
                `);
                return;
            }

            const providersHTML = allocation.providers.map(p => `
                <div class="flex items-center justify-between text-sm">
                    <span class="text-muted-foreground">${this.escapeHtml(p.provider_name || `Provider ${p.provider_id}`)}</span>
                    <div class="flex items-center gap-2">
                        <span class="font-medium">${p.value}${allocation.mode === 'percentage' ? '%' : ' units'}</span>
                        ${allocation.locked && p.provider_id === allocation.lockedProviderId ? '<span class="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700">Locked</span>' : ''}
                    </div>
                </div>
            `).join('');

            cards.push(`
                <div class="border border-border rounded-lg p-4">
                    <div class="flex items-center justify-between mb-3">
                        <h4 class="font-medium">${this.escapeHtml(itemName)}</h4>
                        <div class="flex items-center gap-2">
                            <span class="text-xs px-2 py-1 rounded bg-secondary capitalize">${allocation.mode}</span>
                            ${allocation.locked ? '<span class="text-xs px-2 py-1 rounded bg-red-100 text-red-700">Locked</span>' : ''}
                        </div>
                    </div>
                    <div class="space-y-2">
                        ${providersHTML}
                    </div>
                </div>
            `);
        });

        return cards.join('');
    }

    /**
     * Escape HTML
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Format date
     */
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    /**
     * Destroy all charts (cleanup)
     */
    destroy() {
        if (this.chart) this.chart.destroy();
        if (this.providerChart) this.providerChart.destroy();
    }
}

// Export for global use
window.ProductReportDashboard = ProductReportDashboard;
