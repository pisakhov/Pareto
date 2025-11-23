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
    const container = document.getElementById("providersCardsContainer");
    if (!container) return;

    container.innerHTML = "";

    if (this.data.providers.length === 0) {
      container.innerHTML = `
        <div class="col-span-full flex flex-col items-center justify-center py-12 text-slate-500">
          <svg class="w-12 h-12 text-slate-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
          </svg>
          <p class="text-sm font-medium">No providers found</p>
          <p class="text-xs text-slate-400 mt-1">Add your first provider to get started</p>
        </div>
      `;
      return;
    }

    this.data.providers.forEach((provider) => {
      const card = this.createProviderCard(provider);
      container.appendChild(card);
    });
  }

  createActionButtons(editHandler, deleteHandler, editLabel = "Edit", deleteLabel = "Delete") {
    return `
      <div class="flex items-center justify-end space-x-1">
        <button onclick="${editHandler}" class="inline-flex items-center justify-center w-8 h-8 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors" title="${editLabel}">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
            <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
          </svg>
        </button>
        <button onclick="${deleteHandler}" class="inline-flex items-center justify-center w-8 h-8 text-muted-foreground hover:text-destructive hover:bg-accent rounded-md transition-colors" title="${deleteLabel}">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
            <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.067-2.09 1.02-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
          </svg>
        </button>
      </div>
    `;
  }

  createItemActionButtons(editHandler, deleteHandler, editLabel = "Edit", deleteLabel = "Delete") {
    return `
      <div class="flex items-center justify-end gap-2">
        <button onclick="${editHandler}" class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 hover:border-slate-400 rounded-md transition-all" title="${editLabel}">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" class="w-3.5 h-3.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
          </svg>
          <span>Edit</span>
        </button>
        <button onclick="${deleteHandler}" class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 hover:border-red-300 rounded-md transition-all" title="${deleteLabel}">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" class="w-3.5 h-3.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.067-2.09 1.02-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
          </svg>
          <span>Delete</span>
        </button>
      </div>
    `;
  }

  createProviderCard(provider) {
    const isActive = provider.status?.toLowerCase() === "active";
    const contractCount = provider.contract_count || 0;

    const card = document.createElement("div");
    card.className = `
      bg-white border border-slate-200 rounded-xl p-6
      hover:shadow-lg hover:border-[#023047]/30
      transition-all duration-200
      ${!isActive ? 'opacity-60' : ''}
    `;

    card.innerHTML = `
      <div class="flex items-start justify-between mb-4">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-[#023047] to-[#023047]/80 flex items-center justify-center shadow-sm">
            <svg class="w-6 h-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 21h19.5m-18-18v18m2.25-18v18m13.5-18v18m2.25-18v18M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.25 21h7.5v-17.25c0-3.309-2.691-6-6-6h-3c-3.309 0-6 2.691-6 6V21zM3.375 10.5h17.25c.621 0 1.125-.504 1.125-1.125V6.375c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v3.75c0 .621.504 1.125 1.125 1.125z" />
            </svg>
          </div>
          <div>
            <h3 class="font-semibold text-slate-900 text-base ${!isActive ? 'line-through text-slate-500' : ''}">${provider.company_name}</h3>
            <div class="flex items-center gap-2 mt-1">
              <span class="w-2 h-2 rounded-full ${isActive ? "bg-[#023047]" : "bg-red-500"}"></span>
              <span class="text-xs font-medium ${isActive ? 'text-[#023047]' : 'text-red-600'}">${isActive ? 'Active' : 'Inactive'}</span>
            </div>
          </div>
        </div>
      </div>

      ${provider.details ? `
        <p class="text-sm text-slate-600 mb-4 line-clamp-2">${provider.details}</p>
      ` : '<div class="mb-4"></div>'}

      <div class="flex items-center justify-between pt-4 border-t border-slate-200">
        <div class="flex items-center gap-2">
          <span class="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#023047]/10 text-[#023047] border border-[#023047]/20">
            ${contractCount} ${contractCount === 1 ? 'Contract' : 'Contracts'}
          </span>
        </div>
        <div class="flex items-center gap-2">
          <button onclick="${`window.formHandler.populateProviderForm(${provider.provider_id})`}" class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#023047] bg-[#023047]/10 hover:bg-[#023047]/20 border border-[#023047]/30 hover:border-[#023047]/50 rounded-lg transition-all" title="Edit Provider">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" class="w-3.5 h-3.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
            </svg>
            <span>Edit</span>
          </button>
          <button onclick="${`window.formHandler.deleteProvider(${provider.provider_id}, this)`}" class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 hover:border-red-300 rounded-lg transition-all" title="Delete Provider">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" class="w-3.5 h-3.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.067-2.09 1.02-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
            <span>Delete</span>
          </button>
        </div>
      </div>
    `;

    return card;
  }

  // Item table rendering
  renderItems() {
    const tbody = document.getElementById("itemsTableBody");
    if (!tbody) return;

    tbody.innerHTML = "";

    if (this.data.items.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="4" class="text-center py-12 text-slate-500"><div class="flex flex-col items-center gap-2"><svg class="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2 2v-5m16 0h-2M4 13h2m13-8l-4-4m0 0l-4 4m4-4v12"/></svg><p class="text-sm font-medium">No items found</p><p class="text-xs text-slate-400">Create your first item to get started</p></div></td></tr>';
      return;
    }

    // Get process info for each item
    const itemProcessMap = this.getItemProcessMap();

    this.data.items.forEach((item) => {
      const row = this.createItemRow(item, itemProcessMap);
      tbody.appendChild(row);
    });
  }

  // Filter items based on search query
  filterItems(query) {
    const tbody = document.getElementById("itemsTableBody");
    if (!tbody) return;

    const searchQuery = query.toLowerCase().trim();
    const rows = tbody.querySelectorAll("tr");

    if (!searchQuery) {
      // Show all rows if search is empty
      rows.forEach(row => {
        row.style.display = "";
      });
      return;
    }

    // Get process info for filtering
    const itemProcessMap = this.getItemProcessMap();

    rows.forEach(row => {
      // Get the item data from the row
      const itemNameCell = row.querySelector("td:first-child");
      if (!itemNameCell) return;

      const itemName = itemNameCell.querySelector("span")?.textContent?.toLowerCase() || "";
      const itemDescription = itemNameCell.querySelectorAll("span")[1]?.textContent?.toLowerCase() || "";

      // Get process name from the second column
      const processCell = row.querySelector("td:nth-child(2)");
      const processName = processCell?.textContent?.toLowerCase() || "";

      // Check if any field matches the search query
      const matches =
        itemName.includes(searchQuery) ||
        itemDescription.includes(searchQuery) ||
        processName.includes(searchQuery);

      row.style.display = matches ? "" : "none";
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
    // Get providers who offer this item
    const itemProviders = this.data.providerItems.filter(
      (pi) => pi.item_id === item.item_id,
    );

    // Build map of provider IDs who offer this item
    const providerIdsForItem = new Set(itemProviders.map(pi => pi.provider_id));

    // Count tiers per provider for THIS specific item only
    const providerTierCounts = new Map();
    this.data.offers
      .filter(offer => offer.item_id === item.item_id)
      .forEach(offer => {
        const count = providerTierCounts.get(offer.provider_id) || 0;
        providerTierCounts.set(offer.provider_id, count + 1);
      });

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

    const isActive = item.status === 'active';

    // Build providers list HTML - horizontal compact format
    let providersHtml = '';
    const providerList = [];

    providerIdsForItem.forEach(providerId => {
      const provider = this.data.providers.find(p => p.provider_id === providerId);
      const tierCount = providerTierCounts.get(providerId) || 0;

      if (provider) {
        providerList.push(`${provider.company_name}: ${tierCount} ${tierCount === 1 ? 'tier' : 'tiers'}`);
      }
    });

    if (providerList.length > 0) {
      providersHtml = `<span class="text-sm text-slate-900">${providerList.join(' • ')}</span>`;
    } else {
      providersHtml = '<span class="text-xs text-slate-500">No providers</span>';
    }

    const row = document.createElement("tr");
    row.className = `hover:bg-slate-50/80 transition-colors ${!isActive ? 'opacity-60' : ''}`;
    row.innerHTML = `
            <td class="px-8 py-4 whitespace-nowrap">
                <div class="flex flex-col">
                    <span class="text-sm font-semibold text-slate-900 ${!isActive ? 'line-through text-slate-500' : ''}">${item.item_name}</span>
                    ${item.description ? `<span class="text-xs text-slate-500 mt-0.5">${item.description}</span>` : ''}
                    <div class="flex items-center gap-2 mt-1">
                      <span class="w-2 h-2 rounded-full ${isActive ? "bg-[#023047]" : "bg-red-500"}"></span>
                      <span class="text-xs font-medium ${isActive ? 'text-[#023047]' : 'text-red-600'}">${isActive ? 'Active' : 'Inactive'}</span>
                    </div>
                </div>
            </td>
            <td class="px-8 py-4 whitespace-nowrap">
                <span class="text-xs font-medium px-3 py-1.5 rounded-full bg-slate-100 text-slate-700">${processName}</span>
            </td>
            <td class="px-8 py-4">
                ${providersHtml}
            </td>
            <td class="px-8 py-4 whitespace-nowrap text-right">
                ${this.createItemActionButtons(
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

    // Get contracts for current process (or all if no specific process)
    const contracts = await this.getContractsForCurrentProcess();

    // Show contracts matrix view
    if (contracts.length > 0) {
      const html = await this.createContractsMatrixHTML(contracts);
      matrix.innerHTML = html;
    } else {
      const currentProcessId = window.CURRENT_PROCESS_ID;
      if (currentProcessId) {
        matrix.innerHTML = `
          <div class="text-center py-12">
            <div class="mx-auto w-16 h-16 mb-4 text-muted-foreground">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <h3 class="text-lg font-semibold text-foreground mb-2">No contracts yet</h3>
            <p class="text-sm text-muted-foreground mb-6">Create a process with contracts to get started</p>
            <div class="flex justify-center gap-3">
            </div>
          </div>
        `;
      } else {
        matrix.innerHTML =
          '<p class="text-center text-muted-foreground py-8">No data available for relationship matrix</p>';
      }
    }
  }

  async createRelationshipMatrixHTML() {
    const providerTierData = await this.fetchAllProviderTiers();
    const allocations = await dataService.fetchProviderItemAllocations() || {};

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
                <span class="font-medium${tierClass}">T${offer.tier_number}${tooltipHTML}</span> • <span class="text-green-600 font-semibold">$${parseFloat(offer.price_per_unit.toFixed(4))}</span>
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
        const response = await fetch(`/api/providers/${provider.provider_id}/tier-thresholds`);
        tierData[provider.provider_id] = await response.json();
      })
    );
    return tierData;
  }

  // Get contracts for the current process
  async getContractsForCurrentProcess() {
    const currentProcessId = window.CURRENT_PROCESS_ID;
    if (!currentProcessId) return [];

    const response = await fetch(`/api/processes/${currentProcessId}`);
    const process = await response.json();

    // Get contracts for this process
    const contractsResponse = await fetch(`/api/contracts/process/${process.process_name}`);
    return await contractsResponse.json();
  }

  // Create contracts matrix HTML (3-column layout: Provider + Merged Tiers + Items)
  async createContractsMatrixHTML(contracts) {
    // Group contracts by provider and fetch their tiers
    const providerContracts = {};
    const contractTiers = {};

    // Fetch tiers for each contract
    for (const contract of contracts) {
      const response = await fetch(`/api/contract-tiers/${contract.contract_id}`);
      contractTiers[contract.contract_id] = await response.json();
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
    // Filter out inactive providers
    const activeProviders = providers.filter(provider => {
      const providerData = this.data.providers.find(p => p.provider_id === provider.provider_id);
      return providerData?.status?.toLowerCase() === "active";
    });

    const items = this.getFilteredItems();

    if (activeProviders.length === 0) {
      return '<p class="text-center text-muted-foreground py-8">No contracts found for this process</p>';
    }

    let html = `
      <div class="bg-card rounded-lg border border-border overflow-hidden">
        <div class="overflow-x-auto">
          <table class="border-collapse text-sm w-full">
            <thead>
              <tr class="bg-secondary/50">
                <th class="border border-border px-2 py-3 bg-secondary font-medium text-left w-[80px]">Provider</th>
                <th class="border border-border px-4 py-3 bg-secondary font-medium text-left min-w-[300px]">Contract Tiers</th>
    `;

    // Add item columns
    items.forEach(item => {
      html += `<th class="border border-border px-4 py-3 bg-secondary font-medium text-center min-w-[150px]">${item.item_name}</th>`;
    });

    html += `
              </tr>
            </thead>
            <tbody>
    `;

    // Provider rows (only active providers)
    activeProviders.forEach(provider => {
      // Get all tiers sorted by tier_number
      const allTiers = [];
      provider.contracts.forEach(contract => {
        contract.tiers.forEach(tier => {
          allTiers.push({
            tier_number: tier.tier_number,
            threshold_units: tier.threshold_units,
            contract_name: contract.contract_name,
            is_selected: tier.is_selected,
            contract_tier_id: tier.contract_tier_id
          });
        });
      });

      allTiers.sort((a, b) => a.tier_number - b.tier_number);

      html += `
              <tr class="hover:bg-secondary/20 border-t-2 border-slate-300 first:border-t-0">
                <td class="border border-border px-0 py-4 font-medium bg-secondary/30 align-middle">
                  <div class="h-full flex items-center justify-center">
                    <div class="font-semibold text-foreground -rotate-90 whitespace-nowrap text-sm tracking-wide">${provider.provider_name}</div>
                  </div>
                </td>
                <td class="border border-border px-4 py-2 align-top">
      `;

      // Stack all tiers vertically for this provider
      html += '<div class="flex flex-col gap-2">';

      allTiers.forEach((tier, index) => {
        const isSelected = tier.is_selected;
        html += `
          <div
            class="rounded-md border border-border ${isSelected ? 'bg-green-100 border-green-300' : 'bg-card hover:bg-accent'} p-3 cursor-pointer transition-colors"
            onclick="window.tableRenderer.selectTier(${tier.contract_tier_id}, ${tier.tier_number}, '${provider.provider_name}', ${provider.provider_id})"
            title="Click to select this tier"
          >
            <div class="text-sm font-medium text-foreground">
              <span class="text-blue-600 font-semibold">T${tier.tier_number}:</span>
              <span class="text-foreground"> &lt; ${tier.threshold_units.toLocaleString()}</span>
            </div>
          </div>
        `;
      });

      if (allTiers.length === 0) {
        html += '<span class="text-muted-foreground text-sm">No tiers configured</span>';
      }

      html += '</div>';

      html += `
                </td>
      `;

      // Add item cells with tier prices - merged vertically
      items.forEach(item => {
        // Get offers for this provider and item
        const currentProcessId = window.CURRENT_PROCESS_ID;
        const offers = this.data.offers
          .filter(
            (o) =>
              o.provider_id === provider.provider_id &&
              o.item_id === item.item_id &&
              (!currentProcessId || o.process_id === currentProcessId)
          )
          .sort((a, b) => a.tier_number - b.tier_number);

        html += `<td class="border border-border px-4 py-2 align-top">`;

        if (offers.length > 0) {
          html += '<div class="flex flex-col gap-2">';

          // Match offers to tiers
          allTiers.forEach(tier => {
            const offer = offers.find(o => o.tier_number === tier.tier_number);
            const isSelected = tier.is_selected;

            html += `
              <div
                class="rounded-md border ${isSelected ? 'bg-green-100 border-green-300' : 'bg-card border-border hover:bg-accent'} p-3 transition-colors cursor-pointer"
                onclick="window.formHandler.populateItemForm(${item.item_id})"
                title="Click to edit item"
              >
                <div class="text-sm font-medium text-foreground">
                  <span class="text-blue-600 font-semibold">T${tier.tier_number}:</span>
            `;

            if (offer) {
              const inactiveClass = offer.status === "inactive" ? "text-gray-400 line-through" : "text-green-600";
              html += ` <span class="font-semibold ${inactiveClass}">$${parseFloat(offer.price_per_unit.toFixed(4))}</span>`;
            } else {
              html += ` <span class="text-muted-foreground">—</span>`;
            }

            html += `
                </div>
              </div>
            `;
          });

          html += "</div>";
        } else {
          html += '<div class="flex flex-col gap-2">';
          allTiers.forEach(tier => {
            const isSelected = tier.is_selected;
            html += `
              <div class="rounded-md border ${isSelected ? 'bg-green-100 border-green-300' : 'bg-card border-border hover:bg-accent'} p-3 transition-colors cursor-pointer" onclick="window.formHandler.populateItemForm(${item.item_id})" title="Click to edit item">
                <div class="text-sm font-medium text-foreground">
                  <span class="text-blue-600 font-semibold">T${tier.tier_number}:</span>
                  <span class="text-muted-foreground"> —</span>
                </div>
              </div>
            `;
          });
          html += "</div>";
        }

        html += '</td>';
      });

      html += `
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
    if (window.uiManager) {
      window.uiManager.showNotification(`Selecting Tier ${tierNumber} for ${providerName}...`, 'info');
    }

    const providerData = this.data.providerContracts[providerId];
    if (!providerData) {
      return;
    }

    const tierIdsToDeselect = [];
    providerData.contracts.forEach(contract => {
      contract.tiers.forEach(tier => {
        tierIdsToDeselect.push(tier.contract_tier_id);
      });
    });

    await Promise.all(tierIdsToDeselect.map(async (tierId) => {
      await fetch(`/api/contract-tiers/${tierId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          is_selected: false
        })
      });
    }));

    await new Promise(resolve => setTimeout(resolve, 100));

    await fetch(`/api/contract-tiers/${contractTierId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        is_selected: true
      })
    });

    if (window.uiManager) {
      window.uiManager.showNotification(`Tier ${tierNumber} selected for ${providerName}`, 'success');
    }

    await this.renderRelationshipMatrix();
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
