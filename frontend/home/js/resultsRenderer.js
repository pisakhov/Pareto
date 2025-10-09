/**
 * Results Renderer - Handles displaying optimization results
 */
class ResultsRenderer {
  constructor() {
    this.emptyState = document.getElementById('emptyState');
    this.loadingState = document.getElementById('loadingState');
    this.resultsContent = document.getElementById('resultsContent');
    this.resultsActions = document.getElementById('resultsActions');
    this.summaryStats = document.getElementById('summaryStats');
    this.comparisonTableBody = document.getElementById('comparisonTableBody');
    this.chartContainer = document.getElementById('chartContainer');
    
    this.exportBtn = document.getElementById('exportBtn');
    this.saveBtn = document.getElementById('saveBtn');
    
    this.attachActionListeners();
  }

  attachActionListeners() {
    this.exportBtn.addEventListener('click', () => this.handleExport());
    this.saveBtn.addEventListener('click', () => this.handleSave());
  }

  showEmpty() {
    this.emptyState.classList.remove('hidden');
    this.loadingState.classList.add('hidden');
    this.resultsContent.classList.add('hidden');
    this.resultsActions.classList.add('hidden');
  }

  showLoading() {
    this.emptyState.classList.add('hidden');
    this.loadingState.classList.remove('hidden');
    this.resultsContent.classList.add('hidden');
    this.resultsActions.classList.add('hidden');
  }

  showResults(results) {
    this.emptyState.classList.add('hidden');
    this.loadingState.classList.add('hidden');
    this.resultsContent.classList.remove('hidden');
    this.resultsActions.classList.remove('hidden');

    this.renderSummaryStats(results);
    this.renderComparisonTable(results);
    this.renderChart(results);
  }

  renderSummaryStats(results) {
    const { bestOffer, averageCost, totalProviders } = results.summary;
    
    this.summaryStats.innerHTML = `
      <div class="bg-[#023047]/10 border border-[#023047]/20 rounded-lg p-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-muted-foreground">Best Provider</p>
            <p class="text-2xl font-bold text-[#023047]">${bestOffer.provider.company_name}</p>
          </div>
          <svg class="w-10 h-10 text-[#023047]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
        </div>
      </div>

      <div class="bg-secondary/50 border rounded-lg p-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-muted-foreground">Best Total Cost</p>
            <p class="text-2xl font-bold text-foreground">$${bestOffer.totalCost.toFixed(2)}</p>
          </div>
          <svg class="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </div>

      <div class="bg-secondary/50 border rounded-lg p-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-muted-foreground">Potential Savings</p>
            <p class="text-2xl font-bold text-green-600">$${results.summary.maxSavings.toFixed(2)}</p>
            <p class="text-xs text-muted-foreground">vs. highest cost</p>
          </div>
          <svg class="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        </div>
      </div>
    `;
  }

  renderComparisonTable(results) {
    const { offers, bestOffer } = results;
    
    this.comparisonTableBody.innerHTML = offers.map(offer => {
      const isOptimal = offer.offer_id === bestOffer.offer_id;
      const savings = results.summary.worstCost - offer.totalCost;
      
      return `
        <tr class="${isOptimal ? 'bg-[#023047]/5 border-l-4 border-l-[#023047]' : ''}">
          <td class="px-4 py-3 whitespace-nowrap">
            <div class="flex items-center">
              <span class="font-medium text-foreground">${offer.provider.company_name}</span>
              ${isOptimal ? '<span class="ml-2 px-2 py-1 text-xs font-semibold bg-[#023047] text-white rounded">BEST</span>' : ''}
            </div>
          </td>
          <td class="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">
            ≥ ${offer.unit_range.toLocaleString()}
          </td>
          <td class="px-4 py-3 whitespace-nowrap text-sm text-foreground">
            $${offer.price_per_unit.toFixed(2)}
          </td>
          <td class="px-4 py-3 whitespace-nowrap">
            <span class="text-lg font-semibold ${isOptimal ? 'text-[#023047]' : 'text-foreground'}">
              $${offer.totalCost.toFixed(2)}
            </span>
          </td>
          <td class="px-4 py-3 whitespace-nowrap">
            ${savings > 0 ? 
              `<span class="text-green-600 font-medium">-$${savings.toFixed(2)}</span>` : 
              '<span class="text-muted-foreground">-</span>'
            }
          </td>
        </tr>
      `;
    }).join('');
  }

  renderChart(results) {
    const { offers } = results;
    const maxCost = Math.max(...offers.map(o => o.totalCost));
    const minCost = Math.min(...offers.map(o => o.totalCost));
    
    // Sort offers by total cost for better visualization
    const sortedOffers = [...offers].sort((a, b) => a.totalCost - b.totalCost);
    
    this.chartContainer.innerHTML = sortedOffers.map(offer => {
      // Calculate height percentage (minimum 20% for visibility)
      const heightPercent = Math.max(20, (offer.totalCost / maxCost) * 100);
      const isOptimal = offer.offer_id === results.bestOffer.offer_id;
      const savings = maxCost - offer.totalCost;
      
      return `
        <div class="flex flex-col items-center justify-end flex-1 group cursor-pointer" 
             style="min-height: 300px;"
             title="${offer.provider.company_name}: $${offer.totalCost.toFixed(2)}">
          <!-- Cost value on top -->
          <div class="text-sm font-bold mb-2 ${
            isOptimal ? 'text-[#023047]' : 'text-foreground'
          } group-hover:scale-110 transition-transform">
            $${offer.totalCost.toFixed(2)}
          </div>
          
          <!-- Savings badge -->
          ${savings > 0 ? `
            <div class="text-xs text-green-600 font-medium mb-1">
              -$${savings.toFixed(2)}
            </div>
          ` : ''}
          
          <!-- Bar -->
          <div class="relative w-full flex flex-col justify-end" style="height: ${heightPercent}%;">
            <div class="${
              isOptimal 
                ? 'bg-gradient-to-t from-[#023047] to-[#035a7a]' 
                : 'bg-gradient-to-t from-gray-400 to-gray-300'
            } w-full h-full rounded-t-lg transition-all group-hover:shadow-lg ${
              isOptimal ? 'shadow-md' : ''
            } relative overflow-hidden">
              <!-- Animated stripe for best offer -->
              ${isOptimal ? `
                <div class="absolute inset-0 bg-white opacity-10 animate-pulse"></div>
              ` : ''}
            </div>
          </div>
          
          <!-- Provider name -->
          <div class="mt-3 text-xs text-center font-medium ${
            isOptimal ? 'text-[#023047]' : 'text-muted-foreground'
          } max-w-[100px] leading-tight" 
               title="${offer.provider.company_name}">
            ${offer.provider.company_name}
          </div>
          
          <!-- Best badge -->
          ${isOptimal ? `
            <div class="mt-1 px-2 py-0.5 text-[10px] font-bold bg-[#023047] text-white rounded-full">
              BEST
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
  }

  handleExport() {
    alert('Export functionality will be implemented in backend phase.');
  }

  handleSave() {
    alert('Save functionality will be implemented in backend phase.');
  }
}
