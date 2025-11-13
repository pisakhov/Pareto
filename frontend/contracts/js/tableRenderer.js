/**
 * Table Renderer - Handles all rendering operations for tables and matrices
 */

function findCurrentTier(total, thresholds) {
  const tierKeys = Object.keys(thresholds).map(t => parseInt(t)).sort((a, b) => a - b);
  
  for (let i = 0; i < tierKeys.length; i++) {
    const tier = tierKeys[i];
    const bound = thresholds[tier];
    if (total < bound) {
      return { tierNumber: tier, aboveMax: false };
    }
  }
  
  const lastTier = tierKeys[tierKeys.length - 1];
  return { tierNumber: lastTier, aboveMax: true };
}

function buildTooltipHTML(total, products, currentTier, aboveMax) {
  const prefix = aboveMax ? `Above T${currentTier} • ` : '';
  let html = `<div class="tier-tooltip">`;
  html += `<div style="font-weight: 600; margin-bottom: 4px;">${prefix}Current: ${total.toLocaleString()} files</div>`;
  
  if (products && products.length > 0) {
    products.forEach(p => {
      html += `<div style="font-size: 10px; opacity: 0.9;">• ${p.name}: ${p.count.toLocaleString()}</div>`;
    });
  }
  
  html += `</div>`;
  return html;
}

class TableRenderer {
  constructor() {
    this.data = {
      providers: [],
      items: [],
      offers: [],
      providerItems: [],
    };
  }

  // Data setters
  setData(data) {
    this.data = { ...this.data, ...data };
  }

  updateProviders(providers) {
    this.data.providers = providers;
  }

  updateItems(items) {
    this.data.items = items;
  }

  updateOffers(offers) {
    this.data.offers = offers;
  }

  updateProviderItems(providerItems) {
    this.data.providerItems = providerItems;
  }

  // Helper method to filter items by current process
  getFilteredItems() {
    const currentProcessId = window.CURRENT_PROCESS_ID;

    if (!currentProcessId) {
      return this.data.items;
    }

    const offersInCurrentProcess = this.data.offers.filter(
      offer => offer.process_id === currentProcessId
    );

    const itemIdsInCurrentProcess = new Set(
      offersInCurrentProcess.map(offer => offer.item_id)
    );

    const filteredItems = this.data.items.filter(item =>
      itemIdsInCurrentProcess.has(item.item_id)
    );

    return filteredItems;
  }

  // Provider table rendering
  renderProviders() {
    const tbody = document.getElementById("providersTableBody");
    if (!tbody) return;

    tbody.innerHTML = "";

    if (this.data.providers.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="4" class="text-center py-4 text-muted-foreground">No providers found</td></tr>';
      return;
    }

    this.data.providers.forEach((provider) => {
      const row = this.createProviderRow(provider);
      tbody.appendChild(row);
    });
  }

  createActionButtons(editHandler, deleteHandler, editLabel = "Edit", deleteLabel = "Delete") {
    return `
      <div class="flex items-center space-x-1">
        <button onclick="${editHandler}" class="p-2 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded-full transition-colors" title="${editLabel}">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
          </svg>
        </button>
        <button onclick="${deleteHandler}" class="p-2 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded-full transition-colors" title="${deleteLabel}">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.067-2.09 1.02-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
          </svg>
        </button>
      </div>
    `;
  }

  createProviderRow(provider) {
    const row = document.createElement("tr");
    row.className = "hover:bg-secondary/50";
    const tierCount = provider.tier_count || 0;
    row.innerHTML = `
            <td class="px-4 py-3 whitespace-nowrap text-sm font-medium">${provider.company_name}</td>
            <td class="px-4 py-3 whitespace-nowrap">
                <span class="px-2 py-1 text-xs rounded-full ${
                  provider.status === "active"
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }">
                    ${provider.status}
                </span>
            </td>
            <td class="px-4 py-3 whitespace-nowrap text-sm text-center">
                <span class="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">${tierCount}</span>
            </td>
            <td class="px-4 py-3 whitespace-nowrap text-sm">
                ${this.createActionButtons(
                  `window.formHandler.populateProviderForm(${provider.provider_id})`,
                  `window.formHandler.deleteProvider(${provider.provider_id}, this)`,
                  "Edit Provider",
                  "Delete Provider"
                )}
            </td>
        `;
    return row;
  }

  // Item table rendering
  renderItems() {
    const tbody = document.getElementById("itemsTableBody");
    if (!tbody) return;

    tbody.innerHTML = "";

    if (this.data.items.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="4" class="text-center py-4 text-muted-foreground">No items found</td></tr>';
      return;
    }

    // Get process info for each item
    const itemProcessMap = this.getItemProcessMap();

    this.data.items.forEach((item) => {
      const row = this.createItemRow(item, itemProcessMap);
      tbody.appendChild(row);
    });
  }

  // Helper method to get process info for each item
  getItemProcessMap() {
    const map = new Map();

    // Get all unique item IDs from offers
    this.data.offers.forEach(offer => {
      const itemId = offer.item_id;
      const processId = offer.process_id;

      // Store the process ID for this item (offers should all have same process for an item)
      if (!map.has(itemId)) {
        map.set(itemId, processId);
      }
    });

    return map;
  }

  createItemRow(item, itemProcessMap) {
    const providerCount = this.data.providerItems.filter(
      (pi) => pi.item_id === item.item_id,
    ).length;
    const offerCount = this.data.offers.filter(
      (o) => o.item_id === item.item_id,
    ).length;

    // Get process name for this item
    const processId = itemProcessMap.get(item.item_id);
    let processName = 'N/A';
    if (processId && window.contractsApp) {
      const processes = window.contractsApp.getProcesses();
      const process = processes.find(p => p.process_id === processId);
      if (process) {
        processName = process.process_name;
      }
    }

    const row = document.createElement("tr");
    row.className = "hover:bg-secondary/50";
    row.innerHTML = `
            <td class="px-4 py-3 whitespace-nowrap text-sm font-medium">${item.item_name}</td>
            <td class="px-4 py-3 whitespace-nowrap text-sm">
                <span class="text-xs px-2 py-1 rounded-full ${processId ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'}">${processName}</span>
            </td>
            <td class="px-4 py-3 whitespace-nowrap text-sm">
                <span class="text-xs text-white bg-[#023047] px-2 py-1 rounded-full mr-2">${providerCount} providers</span>
                <span class="text-xs text-white bg-[#7f4f24] px-2 py-1 rounded-full">${offerCount} offers</span>
            </td>
            <td class="px-4 py-3 whitespace-nowrap text-sm">
                ${this.createActionButtons(
                  `window.formHandler.populateItemForm(${item.item_id})`,
                  `window.formHandler.deleteItem(${item.item_id}, this)`,
                  "Edit Item",
                  "Delete Item"
                )}
            </td>
        `;
    return row;
  }


  // Relationship matrix rendering
  async renderRelationshipMatrix() {
    const matrix = document.getElementById("relationshipMatrix");
    if (!matrix) return;

    // Get filtered items based on current process
    const items = this.getFilteredItems();

    // Get contracts for current process
    const contracts = await this.getContractsForCurrentProcess();

    // Case 1: We have items - show the provider-item matrix
    if (this.data.providers.length > 0 && items.length > 0) {
      const html = await this.createRelationshipMatrixHTML();
      matrix.innerHTML = html;
    }
    // Case 2: No items but we have contracts - show contracts view
    else if (contracts.length > 0) {
      const html = await this.createContractsMatrixHTML(contracts);
      matrix.innerHTML = html;
    }
    // Case 3: No items and no contracts - show empty state
    else {
      const currentProcessId = window.CURRENT_PROCESS_ID;
      if (currentProcessId) {
        matrix.innerHTML = `
          <div class="text-center py-12">
            <div class="mx-auto w-16 h-16 mb-4 text-muted-foreground">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <h3 class="text-lg font-semibold text-foreground mb-2">No items or contracts yet</h3>
            <p class="text-sm text-muted-foreground mb-6">Add items or contracts to get started</p>
            <div class="flex justify-center gap-3">
              <button onclick="window.modalManager.showItemModal()" class="inline-flex items-center px-4 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-700 transition-colors">
                Add Item
              </button>
              <button onclick="showProcessModal()" class="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors">
                Add Contract
              </button>
            </div>
          </div>
        `;
      } else {
        matrix.innerHTML =
          '<p class="text-center text-muted-foreground py-8">No data available for relationship matrix</p>';
      }
      return;
    }
  }

  async createRelationshipMatrixHTML() {
    const providerTierData = await this.fetchAllProviderTiers();
    let allocations = {};
    try {
      allocations = await dataService.fetchProviderItemAllocations() || {};
    } catch (error) {
    }

    const items = this.getFilteredItems();

    const providerTotals = new Map();
    const providerCurrentTiers = new Map();
    const providersExceedingTiers = new Set();

    this.data.providers.forEach((provider) => {
      const tierInfo = providerTierData[provider.provider_id] || {};
      const thresholds = tierInfo.thresholds || {};

      let totalFiles = 0;
      const productMap = new Map();

      // Sum up all files across current process items for this provider
      items.forEach((item) => {
        const allocationData = allocations?.[provider.provider_id]?.[item.item_id];
        const allocationTotal = allocationData?.total || 0;
        const allocationProducts = allocationData?.products || [];
        
        if (allocationTotal > 0) {
          totalFiles += allocationTotal;
          
          // Aggregate products across all items
          allocationProducts.forEach(product => {
            if (productMap.has(product.name)) {
              productMap.set(product.name, productMap.get(product.name) + product.count);
            } else {
              productMap.set(product.name, product.count);
            }
          });
        }
      });
      
      // Convert map to array
      const productBreakdown = Array.from(productMap.entries()).map(([name, count]) => ({
        name,
        count
      }));
      
      providerTotals.set(provider.provider_id, {
        total: totalFiles,
        breakdown: productBreakdown
      });
      
      // Determine provider's tier based on TOTAL files
      if (totalFiles > 0 && Object.keys(thresholds).length > 0) {
        const tierResult = findCurrentTier(totalFiles, thresholds);
        providerCurrentTiers.set(provider.provider_id, tierResult);
        if (tierResult.aboveMax) {
          providersExceedingTiers.add(provider.provider_id);
        }
      }
    });
    
    let html =
      '<div class="overflow-x-auto"><table class="border-collapse text-sm w-auto"><thead><tr><th class="border border-border px-4 py-2 bg-secondary font-medium whitespace-nowrap">Provider \ Item</th>';

    // Add item headers as columns (filtered items)
    items.forEach((item) => {
      html += `<th class="border border-border px-4 py-2 bg-secondary text-center font-medium whitespace-nowrap">
        <div class="font-semibold">${item.item_name}</div>
      </th>`;
    });
    html += "</tr></thead><tbody>";

    // Add provider rows
    this.data.providers.forEach((provider) => {
      const tierInfo = providerTierData[provider.provider_id] || {};
      const thresholds = tierInfo.thresholds || {};
      const basePrices = tierInfo.base_prices || {};
      
      const tierKeys = Object.keys(thresholds).map(t => parseInt(t)).sort((a, b) => a - b);
      const exceedsClass = providersExceedingTiers.has(provider.provider_id) ? ' provider-exceeds-tiers' : '';
      
      const providerTotal = providerTotals.get(provider.provider_id);
      const currentTier = providerCurrentTiers.get(provider.provider_id);
      
      // Build tooltip content showing breakdown
      let tooltipContent = '';
      if (providerTotal && providerTotal.total > 0) {
        tooltipContent = `<div class="tier-tooltip">`;
        tooltipContent += `<div style="font-weight: 600; margin-bottom: 6px;">Total: ${providerTotal.total.toLocaleString()} files</div>`;
        if (providerTotal.breakdown.length > 0) {
          tooltipContent += '<div style="font-size: 11px; opacity: 0.95;">';
          providerTotal.breakdown.forEach(product => {
            tooltipContent += `<div style="margin-bottom: 2px;">• ${product.name}: ${product.count.toLocaleString()}</div>`;
          });
          tooltipContent += '</div>';
        }
        tooltipContent += `</div>`;
      }
      
      let tierDisplay = '';
      if (tierKeys.length > 0) {
        tierDisplay = '<div class="flex flex-col gap-1">';
        tierKeys.forEach(tier => {
          const files = thresholds[tier];
          const base = basePrices[tier];
          const baseText = base ? ` • $${base.toFixed(2)}` : '';
          
          // Highlight current tier
          const isCurrentTier = currentTier && tier === currentTier.tierNumber;
          const tierClass = isCurrentTier ? ' current-tier' : '';
          const tierTooltip = isCurrentTier ? tooltipContent : '';
          
          tierDisplay += `<div class="text-xs whitespace-nowrap px-2 py-1 rounded text-muted-foreground font-normal" style="position: relative;">
            <span class="font-medium${tierClass}">T${tier}${tierTooltip}</span>: &lt;${files.toLocaleString()}${baseText}
          </div>`;
        });
        tierDisplay += '</div>';
      }
      
      html += `<tr class="hover:bg-secondary/20"><td class="border border-border p-0 bg-secondary/50 font-medium">
        <div class="flex h-full">
          <div class="flex items-center justify-center px-3 border-r border-border bg-secondary/30 min-w-[2rem]${exceedsClass}">
            <div class="font-semibold whitespace-nowrap text-sm" style="writing-mode: vertical-rl; transform: rotate(180deg);">${provider.company_name}</div>
          </div>
          <div class="flex-1 px-3 py-2">
            ${tierDisplay}
          </div>
        </div>
      </td>`;

      items.forEach((item) => {
        const hasRelationship = this.data.providerItems.some(
          (pi) =>
            pi.provider_id === provider.provider_id &&
            pi.item_id === item.item_id,
        );

        // Filter offers by current process ID if we're in a process view
        const currentProcessId = window.CURRENT_PROCESS_ID;
        let offers = this.data.offers.filter(
          (o) =>
            o.provider_id === provider.provider_id &&
            o.item_id === item.item_id,
        );

        // If we have a current process, filter by it
        if (currentProcessId) {
          offers = offers.filter(o => o.process_id === currentProcessId);
        }

        const tierInfo = providerTierData[provider.provider_id] || {};
        const providerTiers = Object.keys(tierInfo.thresholds || {}).map(t => parseInt(t));
        const offerTiers = offers.map(o => o.tier_number);
        const missingTiers = providerTiers.filter(t => !offerTiers.includes(t));
        const hasMissingOffers = hasRelationship && missingTiers.length > 0;

        const cellClass = hasMissingOffers ? 'border-l-4 border-l-orange-500 bg-orange-50/20' : '';
        const cursorClass = hasMissingOffers ? 'cursor-pointer' : '';
        const clickHandler = hasMissingOffers ? `onclick="window.formHandler.populateItemForm(${item.item_id})" title="Click to add missing tiers: ${missingTiers.join(', ')}"` : '';

        // Get provider's overall tier (calculated from total across all items)
        const providerTier = providerCurrentTiers.get(provider.provider_id);
        const providerTotal = providerTotals.get(provider.provider_id);
        
        // Get allocation data for THIS specific item only
        const itemAllocationData = allocations?.[provider.provider_id]?.[item.item_id];
        const itemTotal = itemAllocationData?.total || 0;
        const itemProducts = itemAllocationData?.products || [];
        
        html += `<td class="border border-border px-4 py-2 text-center align-top ${cellClass} ${cursorClass}" ${clickHandler}>`;
        if (offers.length > 0) {
          html += '<div class="flex flex-col gap-1">';
          offers.forEach((offer) => {
            const inactiveClass =
              offer.status === "inactive" ? "text-gray-400 line-through" : "text-foreground";
            
            // Highlight if this offer tier matches provider's overall tier
            const isCurrentTier = providerTier && offer.tier_number === providerTier.tierNumber;
            const tierClass = isCurrentTier ? ' current-tier' : '';
            
            // Build tooltip for current tier showing THIS ITEM's products only
            let tooltipHTML = '';
            if (isCurrentTier && itemTotal > 0) {
              tooltipHTML = buildTooltipHTML(itemTotal, itemProducts, providerTier.tierNumber, providerTier.aboveMax);
            }
            
            html += `<div class="text-xs whitespace-nowrap px-2 py-1 hover:bg-accent rounded cursor-pointer ${inactiveClass}" onclick="event.stopPropagation(); window.formHandler.populateItemForm(${item.item_id})">
              <span class="font-medium${tierClass}">T${offer.tier_number}${tooltipHTML}</span> • <span class="text-green-600 font-semibold">$${offer.price_per_unit.toFixed(2)}</span>
            </div>`;
          });
          html += "</div>";
          if (hasMissingOffers) {
            html += `<div class="flex items-center justify-center gap-1 mt-2 px-2 py-1 bg-orange-100 rounded text-xs text-gray-900 font-bold">
              <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
              <span>T${missingTiers.join(', T')}</span>
            </div>`;
          }
        } else if (hasRelationship) {
          html += `<div class="flex items-center justify-center gap-1 px-2 py-1.5 bg-orange-100 rounded text-xs text-gray-900 font-bold">
            <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
            <span>No offers</span>
          </div>`;
        } else {
          html += '<span class="text-muted-foreground text-xs">—</span>';
        }
        html += `</td>`;
      });

      html += "</tr>";
    });

    html += "</tbody></table></div>";
    return html;
  }

  async fetchAllProviderTiers() {
    const tierData = {};
    await Promise.all(
      this.data.providers.map(async (provider) => {
        try {
          const response = await fetch(`/api/providers/${provider.provider_id}/tier-thresholds`);
          tierData[provider.provider_id] = await response.json();
        } catch (error) {
          tierData[provider.provider_id] = { thresholds: {}, base_prices: {} };
        }
      })
    );
    return tierData;
  }

  // Get contracts for the current process
  async getContractsForCurrentProcess() {
    const currentProcessId = window.CURRENT_PROCESS_ID;
    if (!currentProcessId) return [];

    try {
      const response = await fetch(`/api/processes/${currentProcessId}`);
      const process = await response.json();

      // Get contracts for this process
      const contractsResponse = await fetch(`/api/contracts/process/${process.process_name}`);
      return await contractsResponse.json();
    } catch (error) {
      console.error('Error fetching contracts:', error);
      return [];
    }
  }

  // Create contracts matrix HTML (2-column layout: Provider + Tiers stacked)
  async createContractsMatrixHTML(contracts) {
    // Group contracts by provider and fetch their tiers
    const providerContracts = {};
    const contractTiers = {};

    // Fetch tiers for each contract
    for (const contract of contracts) {
      try {
        const response = await fetch(`/api/contract-tiers/${contract.contract_id}`);
        contractTiers[contract.contract_id] = await response.json();
      } catch (error) {
        contractTiers[contract.contract_id] = [];
      }
    }

    // Group by provider
    contracts.forEach(contract => {
      if (!providerContracts[contract.provider_id]) {
        providerContracts[contract.provider_id] = {
          provider_name: contract.provider_name,
          provider_id: contract.provider_id,
          contracts: []
        };
      }
      providerContracts[contract.provider_id].contracts.push({
        ...contract,
        tiers: contractTiers[contract.contract_id] || []
      });
    });

    // Store provider contracts for later use in tier selection
    this.data.providerContracts = providerContracts;

    const providers = Object.values(providerContracts);

    if (providers.length === 0) {
      return '<p class="text-center text-muted-foreground py-8">No contracts found for this process</p>';
    }

    let html = `
      <div class="bg-card rounded-lg border border-border overflow-hidden">
        <div class="overflow-x-auto">
          <table class="border-collapse text-sm w-full">
            <thead>
              <tr class="bg-secondary/50">
                <th class="border border-border px-2 py-3 bg-secondary font-medium text-left w-[80px]">Provider</th>
                <th class="border border-border px-4 py-3 bg-secondary font-medium text-left min-w-[400px]">Tiers</th>
              </tr>
            </thead>
            <tbody>
    `;

    // Provider rows
    providers.forEach(provider => {
      html += `
              <tr class="hover:bg-secondary/20">
                <td class="border border-border px-0 py-4 font-medium bg-secondary/30 align-middle">
                  <div class="h-full flex items-center justify-center">
                    <div class="font-semibold text-foreground -rotate-90 whitespace-nowrap text-sm tracking-wide">${provider.provider_name}</div>
                  </div>
                </td>
                <td class="border border-border px-4 py-4 align-top">
      `;

      // Stack all tiers vertically for this provider
      html += '<div class="flex flex-col gap-2">';

      // Get all tiers sorted by tier_number
      const allTiers = [];
      provider.contracts.forEach(contract => {
        contract.tiers.forEach(tier => {
          allTiers.push({
            tier_number: tier.tier_number,
            threshold_units: tier.threshold_units,
            contract_name: contract.contract_name,
            is_selected: tier.is_selected
          });
        });
      });

      allTiers.sort((a, b) => a.tier_number - b.tier_number);

      allTiers.forEach(tier => {
        // Find the contract_tier_id for this tier
        let contractTierId = null;
        provider.contracts.forEach(contract => {
          const foundTier = contract.tiers.find(t => t.tier_number === tier.tier_number);
          if (foundTier && contractTierId === null) {
            contractTierId = foundTier.contract_tier_id;
          }
        });

        html += `
          <div
            class="text-sm cursor-pointer transition-colors rounded-md ${tier.is_selected ? 'bg-blue-50 hover:bg-blue-50 px-3 py-2' : 'hover:bg-accent px-3 py-2'}"
            onclick="window.tableRenderer.selectTier(${contractTierId}, ${tier.tier_number}, '${provider.provider_name}', ${provider.provider_id})"
            title="Click to select this tier"
          >
            <span class="font-medium text-foreground">T${tier.tier_number}:</span>
            <span class="text-foreground">&lt; ${tier.threshold_units.toLocaleString()} units</span>
            <span class="text-muted-foreground"> - ${tier.contract_name}</span>
          </div>
        `;
      });

      if (allTiers.length === 0) {
        html += '<span class="text-muted-foreground text-xs">No tiers configured</span>';
      }

      html += '</div>';

      html += `
                </td>
              </tr>
      `;
    });

    html += `
            </tbody>
          </table>
        </div>
      </div>
    `;

    return html;
  }

  // Handle tier selection (only one tier per provider)
  async selectTier(contractTierId, tierNumber, providerName, providerId) {
    // Show confirmation dialog
    const confirmed = confirm(
      `Select Tier ${tierNumber} for ${providerName}?\n\n` +
      `This will change the pricing tier for this provider.`
    );

    if (!confirmed) {
      return; // User cancelled
    }

    try {
      // Show loading state
      if (window.uiManager) {
        window.uiManager.showNotification(`Selecting Tier ${tierNumber} for ${providerName}...`, 'info');
      }

      // Get all tier IDs for this provider from stored data
      const providerData = this.data.providerContracts[providerId];
      if (!providerData) {
        throw new Error('Provider data not found');
      }

      // Get all contract tier IDs for this provider
      const tierIdsToDeselect = [];
      providerData.contracts.forEach(contract => {
        contract.tiers.forEach(tier => {
          tierIdsToDeselect.push(tier.contract_tier_id);
        });
      });

      // Deselect all tiers for this provider first
      await Promise.all(tierIdsToDeselect.map(async (tierId) => {
        try {
          const response = await fetch(`/api/contract-tiers/${tierId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              is_selected: false
            })
          });
          if (!response.ok) {
            console.error(`Failed to deselect tier ${tierId}`);
          }
        } catch (error) {
          console.error(`Error deselecting tier ${tierId}:`, error);
        }
      }));

      // Small delay to ensure database updates
      await new Promise(resolve => setTimeout(resolve, 100));

      // Then select the clicked tier
      const response = await fetch(`/api/contract-tiers/${contractTierId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          is_selected: true
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update tier selection');
      }

      // Show success notification
      if (window.uiManager) {
        window.uiManager.showNotification(`Tier ${tierNumber} selected for ${providerName}`, 'success');
      }

      // Refresh the relationship matrix to show updated selection
      await this.renderRelationshipMatrix();

    } catch (error) {
      console.error('Error selecting tier:', error);
      if (window.uiManager) {
        window.uiManager.showNotification(`Error selecting tier: ${error.message}`, 'error');
      }
    }
  }

  // Utility method to render all tables
  async renderAll() {
    this.renderProviders();
    this.renderItems();
    await this.renderRelationshipMatrix();
  }
}

// The TableRenderer will be instantiated in the main app
// const tableRenderer = new TableRenderer();
