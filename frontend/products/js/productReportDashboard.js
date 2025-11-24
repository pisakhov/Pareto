/**
 * Product Report Dashboard - Provider and Contract Analysis Dashboard
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
        // Load pricing details if not already loaded
        if (Object.keys(this.pricingDetails).length === 0) {
            this.pricingDetails = await this.loadPricingDetails();
        }

        // Load tier thresholds (floor prices)
        this.tierThresholds = await this.loadTierThresholds();

        // Calculate tier from actuals
        const tierResults = this.calculateTierFromActuals();

        this.renderHeader();
        this.renderKPIs();
        this.renderProviderBreakdown();
        this.renderTierBreakdown();
        this.renderItemPriceTable();
        this.renderProviderComparison();
        this.renderAllocationsSummary();
    }

    /**
     * Load pricing details from API
     */
    async loadPricingDetails() {
        try {



            const response = await fetch('/api/products/pricing-details');
            const allPricing = await response.json();




            const productPricing = allPricing[this.productId] || {};



            return productPricing;
        } catch (error) {

            return {};
        }
    }

    /**
     * Load tier thresholds (floor prices) for all providers
     */
    async loadTierThresholds() {
        try {


            // Get unique provider IDs from pricing details
            const providerIds = new Set();
            Object.entries(this.pricingDetails).forEach(([itemId, itemPricing]) => {
                const pricingEntries = Object.values(itemPricing);
                pricingEntries.forEach(p => {
                    if (p.provider_id) {
                        providerIds.add(p.provider_id);
                    }
                });
            });



            const tierData = {};

            // Fetch tier thresholds for each provider
            for (const providerId of providerIds) {
                try {
                    const response = await fetch(`/api/providers/${providerId}/tier-thresholds`);
                    const data = await response.json();
                    tierData[providerId] = data;

                } catch (error) {

                    tierData[providerId] = { thresholds: {}, base_prices: {} };
                }
            }


            return tierData;

        } catch (error) {

            return {};
        }
    }

    /**
     * Calculate which tier we fall under based on latest actuals
     */
    calculateTierFromActuals() {



        if (!this.productData.actuals || this.productData.actuals.length === 0) {

            return null;
        }

        // Find the latest actual (by year, then month)
        const sortedActuals = [...this.productData.actuals].sort((a, b) => {
            if (a.year !== b.year) return b.year - a.year;
            return b.month - a.month;
        });

        const latestActual = sortedActuals[0];


        const totalUnits = latestActual.actual_units;


        // Get thresholds for each provider
        const providerThresholds = {};
        Object.entries(this.pricingDetails).forEach(([itemId, itemPricing]) => {
            const pricingData = Object.values(itemPricing)[0];


            // For now, using the first provider's tier (assuming all providers use same thresholds)
            const providerId = pricingData.provider_id;
            if (providerId && !providerThresholds[providerId]) {
                // In a real implementation, we'd fetch thresholds from API
                // For now, we'll use placeholder thresholds
                providerThresholds[providerId] = {
                    1: 1000000,   // Tier 1: up to 1M units
                    2: 2000000,   // Tier 2: up to 2M units
                    3: 5000000,   // Tier 3: up to 5M units
                };
            }
        });



        // Calculate tier for each provider
        const tierResults = {};
        Object.entries(providerThresholds).forEach(([providerId, thresholds]) => {
            let currentTier = 1;
            const tierKeys = Object.keys(thresholds).map(Number).sort((a, b) => a - b);


            for (const tier of tierKeys) {
                if (totalUnits >= thresholds[tier]) {
                    currentTier = tier;
                } else {
                    break;
                }
            }

            tierResults[providerId] = currentTier;

        });




        return tierResults;
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
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                        </svg>
                        <span class="text-xs text-muted-foreground">Total Providers</span>
                    </div>
                    <div class="text-2xl font-bold text-foreground">${kpis.totalProviders}</div>
                    <div class="text-xs text-muted-foreground mt-1">across ${kpis.totalItems} items</div>
                </div>

                <div class="bg-card border rounded-lg p-4">
                    <div class="flex items-center gap-2 mb-2">
                        <svg class="w-4 h-4 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        <span class="text-xs text-muted-foreground">Avg Tier Level</span>
                    </div>
                    <div class="text-2xl font-bold text-blue-600">${kpis.avgTier}</div>
                    <div class="text-xs text-muted-foreground mt-1">tier ${kpis.minTier}-${kpis.maxTier} range</div>
                </div>

                <div class="bg-card border rounded-lg p-4">
                    <div class="flex items-center gap-2 mb-2">
                        <svg class="w-4 h-4 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        <span class="text-xs text-muted-foreground">Avg Cost/Item</span>
                    </div>
                    <div class="text-2xl font-bold text-green-600">$${kpis.avgCost.toFixed(2)}</div>
                    <div class="text-xs text-muted-foreground mt-1">range: $${kpis.minCost.toFixed(2)} - $${kpis.maxCost.toFixed(2)}</div>
                </div>

                <div class="bg-card border rounded-lg p-4">
                    <div class="flex items-center gap-2 mb-2">
                        <svg class="w-4 h-4 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
                        </svg>
                        <span class="text-xs text-muted-foreground">Pricing Adjustments</span>
                    </div>
                    <div class="text-2xl font-bold text-amber-600">${kpis.adjustmentCount}</div>
                    <div class="text-xs text-muted-foreground mt-1">${kpis.discountCount} discounts, ${kpis.premiumCount} premiums</div>
                </div>
            </div>
        `;

        document.getElementById('productViewContent').insertAdjacentHTML('beforeend', kpiHTML);
    }

    /**
     * Calculate KPI values
     */
    calculateKPIs() {




        const tiers = [];
        const costs = [];

        // Process each item's pricing data
        Object.entries(this.pricingDetails).forEach(([itemId, itemPricing]) => {


            // itemPricing is an object like {provider_id: 1, provider_name: 'Equifax', ...}
            // We need to get the values from this object
            const pricingEntries = Object.values(itemPricing);


            pricingEntries.forEach(p => {

                if (p.tier !== undefined && p.tier !== null) tiers.push(p.tier);
                if (p.final_price !== undefined && p.final_price !== null) {
                    const price = parseFloat(p.final_price);
                    if (!isNaN(price)) costs.push(price);
                }
            });
        });





        const totalProviders = new Set();
        Object.values(this.allocations).forEach(item => {
            if (item.providers) {
                item.providers.forEach(p => totalProviders.add(p.provider_id));
            }
        });

        const adjustmentCount = Object.keys(this.priceMultipliers).length;
        let discountCount = 0;
        let premiumCount = 0;
        Object.values(this.priceMultipliers).forEach(pm => {
            const multiplier = pm.multiplier || pm;
            if (multiplier < 1) discountCount++;
            if (multiplier > 1) premiumCount++;
        });

        return {
            totalProviders: totalProviders.size,
            totalItems: Object.keys(this.allocations).length,
            avgTier: tiers.length > 0 ? (tiers.reduce((a, b) => a + b, 0) / tiers.length).toFixed(1) : 0,
            minTier: tiers.length > 0 ? Math.min(...tiers) : 0,
            maxTier: tiers.length > 0 ? Math.max(...tiers) : 0,
            avgCost: costs.length > 0 ? costs.reduce((a, b) => a + b, 0) / costs.length : 0,
            minCost: costs.length > 0 ? Math.min(...costs) : 0,
            maxCost: costs.length > 0 ? Math.max(...costs) : 0,
            adjustmentCount,
            discountCount,
            premiumCount
        };
    }

    /**
     * Render provider breakdown section
     */
    renderProviderBreakdown() {
        const breakdownHTML = `
            <div class="bg-card border rounded-lg p-6 mb-6">
                <h3 class="text-lg font-semibold mb-4">Provider Breakdown</h3>
                <div class="overflow-x-auto">
                    <table class="w-full text-sm">
                        <thead class="border-b border-border">
                            <tr>
                                <th class="text-left py-2">Provider</th>
                                <th class="text-right py-2">Tier</th>
                                <th class="text-right py-2">Floor Price</th>
                                <th class="text-right py-2">Base Price</th>
                                <th class="text-right py-2">Multiplier</th>
                                <th class="text-right py-2">Final Price</th>
                                <th class="text-left py-2">Items</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.renderProviderRows()}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        document.getElementById('productViewContent').insertAdjacentHTML('beforeend', breakdownHTML);
    }

    /**
     * Render provider rows for the table
     */
    renderProviderRows() {




        const rows = [];
        const providerItemMap = {};

        // Map providers to items
        Object.entries(this.allocations).forEach(([itemId, allocation]) => {
            if (allocation.providers) {
                allocation.providers.forEach(provider => {
                    if (!providerItemMap[provider.provider_id]) {
                        providerItemMap[provider.provider_id] = [];
                    }
                    providerItemMap[provider.provider_id].push({
                        itemId: parseInt(itemId),
                        value: provider.value,
                        mode: allocation.mode,
                        locked: allocation.locked
                    });
                });
            }
        });

        // Process pricing details correctly
        Object.entries(this.pricingDetails).forEach(([itemId, itemPricing]) => {


            // itemPricing is an object like {provider_id: 1, provider_name: 'Equifax', ...}
            const pricingEntries = Object.values(itemPricing);


            pricingEntries.forEach(p => {


                const providerItems = providerItemMap[p.provider_id] || [];
                const itemCount = providerItems.filter(pi => pi.itemId === parseInt(itemId)).length;
                const itemsText = itemCount > 0 ? `${itemCount} item${itemCount > 1 ? 's' : ''}` : 'N/A';

                const multiplier = p.multiplier || 1;
                const isDiscount = multiplier < 1;
                const isPremium = multiplier > 1;

                // Get floor price for this provider and tier
                const tierData = this.tierThresholds[p.provider_id] || {};
                const basePrices = tierData.base_prices || {};
                const floorPrice = basePrices[p.tier] || 0;


                rows.push(`
                    <tr class="border-b border-border last:border-0">
                        <td class="py-3 font-medium">${this.escapeHtml(p.provider_name || `Provider ${p.provider_id}`)}</td>
                        <td class="py-3 text-right">
                            <span class="px-2 py-1 rounded text-xs font-semibold bg-blue-100 text-blue-800">
                                Tier ${p.tier || 'N/A'}
                            </span>
                        </td>
                        <td class="py-3 text-right">
                            <span class="font-medium text-gray-700" title="Minimum price regardless of volume">
                                $${floorPrice.toFixed(2)}
                            </span>
                        </td>
                        <td class="py-3 text-right">$${(p.base_price || 0).toFixed(2)}</td>
                        <td class="py-3 text-right">
                            ${multiplier !== 1 ? `
                                <span class="font-semibold ${isDiscount ? 'text-green-600' : isPremium ? 'text-amber-600' : ''}">
                                    ${multiplier.toFixed(2)}x
                                </span>
                            ` : '1.00x'}
                        </td>
                        <td class="py-3 text-right font-semibold text-green-600">$${(p.final_price || 0).toFixed(2)}</td>
                        <td class="py-3 text-muted-foreground">${itemsText}</td>
                    </tr>
                `);
            });
        });




        return rows.join('') || '<tr><td colspan="7" class="py-4 text-center text-muted-foreground">No provider data available</td></tr>';
    }

    /**
     * Render tier breakdown section
     */
    renderTierBreakdown() {
        const tierData = this.calculateTierBreakdown();

        const tierHTML = `
            <div class="bg-card border rounded-lg p-6 mb-6">
                <h3 class="text-lg font-semibold mb-4">Tier Distribution</h3>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    ${tierData.map(tier => `
                        <div class="border border-border rounded-lg p-4">
                            <div class="flex items-center justify-between mb-3">
                                <div class="flex items-center gap-2">
                                    <div class="w-3 h-3 rounded-full bg-blue-500"></div>
                                    <h4 class="font-semibold">Tier ${tier.level}</h4>
                                </div>
                                <span class="text-sm text-muted-foreground">${tier.count} provider${tier.count !== 1 ? 's' : ''}</span>
                            </div>
                            <div class="space-y-2">
                                ${tier.providers.map(provider => `
                                    <div class="flex items-center justify-between text-sm">
                                        <span class="text-muted-foreground">${this.escapeHtml(provider.name)}</span>
                                        <span class="font-medium">$${provider.price.toFixed(2)}</span>
                                    </div>
                                `).join('')}
                            </div>
                            ${tier.avgPrice ? `
                                <div class="mt-3 pt-3 border-t border-border">
                                    <div class="flex items-center justify-between text-sm">
                                        <span class="text-muted-foreground">Avg Price</span>
                                        <span class="font-bold">$${tier.avgPrice.toFixed(2)}</span>
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        document.getElementById('productViewContent').insertAdjacentHTML('beforeend', tierHTML);
    }

    /**
     * Calculate tier breakdown data
     */
    calculateTierBreakdown() {

        const tierMap = new Map();

        Object.entries(this.pricingDetails).forEach(([itemId, itemPricing]) => {


            const pricingEntries = Object.values(itemPricing);
            pricingEntries.forEach(p => {

                const tier = p.tier || 0;
                if (!tierMap.has(tier)) {
                    tierMap.set(tier, []);
                }
                tierMap.get(tier).push({
                    providerId: p.provider_id,
                    name: p.provider_name || `Provider ${p.provider_id}`,
                    price: p.final_price || 0
                });
            });
        });

        const result = Array.from(tierMap.entries())
            .sort((a, b) => a[0] - b[0])
            .map(([level, providers]) => {
                const avgPrice = providers.length > 0
                    ? providers.reduce((sum, p) => sum + p.price, 0) / providers.length
                    : 0;
                return {
                    level,
                    count: providers.length,
                    providers,
                    avgPrice
                };
            });



        return result;
    }

    /**
     * Render item price breakdown table
     */
    renderItemPriceTable() {
        const itemsHTML = `
            <div class="bg-card border rounded-lg p-6 mb-6">
                <h3 class="text-lg font-semibold mb-4">Item Price Breakdown</h3>
                <div class="overflow-x-auto">
                    <table class="w-full text-sm">
                        <thead class="border-b border-border">
                            <tr>
                                <th class="text-left py-2">Item</th>
                                <th class="text-left py-2">Process</th>
                                <th class="text-right py-2">Provider</th>
                                <th class="text-right py-2">Tier</th>
                                <th class="text-right py-2">Floor Price</th>
                                <th class="text-right py-2">Base Price</th>
                                <th class="text-right py-2">Multiplier</th>
                                <th class="text-right py-2">Final Price</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.renderItemPriceRows()}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        document.getElementById('productViewContent').insertAdjacentHTML('beforeend', itemsHTML);
    }

    /**
     * Render item price rows
     */
    renderItemPriceRows() {

        const rows = [];

        Object.entries(this.pricingDetails).forEach(([itemId, itemPricing]) => {


            const pricingEntries = Object.values(itemPricing);
            pricingEntries.forEach((p, index) => {


                const itemName = `Item ${itemId}`;
                const processName = `Process ${p.process_id || 1}`;

                const multiplier = p.multiplier || 1;
                const isDiscount = multiplier < 1;
                const isPremium = multiplier > 1;

                // Get floor price for this provider and tier
                const tierData = this.tierThresholds[p.provider_id] || {};
                const basePrices = tierData.base_prices || {};
                const floorPrice = basePrices[p.tier] || 0;

                rows.push(`
                    <tr class="border-b border-border last:border-0">
                        <td class="py-3 font-medium">${this.escapeHtml(itemName)}</td>
                        <td class="py-3 text-muted-foreground">${this.escapeHtml(processName)}</td>
                        <td class="py-3 text-right">${this.escapeHtml(p.provider_name || `Provider ${p.provider_id}`)}</td>
                        <td class="py-3 text-right">${p.tier || 'N/A'}</td>
                        <td class="py-3 text-right font-medium text-gray-700" title="Minimum price regardless of volume">
                            $${floorPrice.toFixed(2)}
                        </td>
                        <td class="py-3 text-right">$${(p.base_price || 0).toFixed(2)}</td>
                        <td class="py-3 text-right">
                            ${multiplier !== 1 ? `
                                <span class="${isDiscount ? 'text-green-600' : isPremium ? 'text-amber-600' : ''}">
                                    ${multiplier.toFixed(2)}x
                                </span>
                            ` : '1.00x'}
                        </td>
                        <td class="py-3 text-right font-semibold text-green-600">$${(p.final_price || 0).toFixed(2)}</td>
                    </tr>
                `);
            });
        });



        return rows.join('') || '<tr><td colspan="8" class="py-4 text-center text-muted-foreground">No pricing data available</td></tr>';
    }

    /**
     * Render provider comparison section
     */
    renderProviderComparison() {
        const comparisonHTML = `
            <div class="bg-card border rounded-lg p-6 mb-6">
                <h3 class="text-lg font-semibold mb-4">Provider Cost Comparison</h3>
                <div class="relative" style="height: 300px;">
                    <canvas id="providerComparisonChart"></canvas>
                </div>
            </div>
        `;
        document.getElementById('productViewContent').insertAdjacentHTML('beforeend', comparisonHTML);

        setTimeout(() => {
            this.initProviderComparisonChart();
        }, 100);
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
                    backgroundColor: 'rgba(59, 130, 246, 0.6)',
                    borderColor: 'rgb(59, 130, 246)',
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
     * Render allocations summary section
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
     * Render allocation summary cards - Updated for collective allocations
     */
    renderAllocationCards() {
        // Check if allocations is in collective format (single object) or legacy format (per-item)
        const isCollectiveFormat = this.allocations && !Object.keys(this.allocations).some(k => {
            const keyStr = String(k);
            // Try to parse as integer to see if it's an item ID
            const parsed = parseInt(keyStr);
            return !isNaN(parsed) && parsed.toString() === keyStr && parsed > 0;
        });

        if (isCollectiveFormat) {
            // Collective allocation format - show single allocation for entire product
            const allocation = this.allocations;
            if (!allocation.providers || allocation.providers.length === 0) {
                return '<p class="text-sm text-muted-foreground text-center py-4">No allocations configured</p>';
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

            return `
                <div class="border border-border rounded-lg p-4">
                    <div class="flex items-center justify-between mb-3">
                        <h4 class="font-medium">All Items (Collective)</h4>
                        <div class="flex items-center gap-2">
                            <span class="text-xs px-2 py-1 rounded bg-secondary capitalize">${allocation.mode}</span>
                            ${allocation.locked ? '<span class="text-xs px-2 py-1 rounded bg-red-100 text-red-700">Locked</span>' : ''}
                        </div>
                    </div>
                    <div class="space-y-2">
                        ${providersHTML}
                    </div>
                </div>
            `;
        } else {
            // Legacy per-item allocation format - show each item's allocation
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
     * Destroy all charts (cleanup)
     */
    destroy() {
        if (this.providerChart) this.providerChart.destroy();
    }
}

// Export for global use
window.ProductReportDashboard = ProductReportDashboard;
