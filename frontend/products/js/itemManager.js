/**
 * ItemManager - Manages item selection and provider allocation within Product modal
 * Updated for COLLECTIVE allocations (applies to all items)
 */
class ItemManager {
  constructor() {
    // Changed from Map to single allocation object
    this.selectedItems = []; // Array of items in the product
    this.collectiveAllocation = null; // Single allocation for all items
    this.container = document.getElementById('productItemsContainer');
    this.itemSelect = document.getElementById('itemSelect');
    this.addItemBtn = document.getElementById('addItemBtn');
    this.allItems = [];
    this.availableProviders = []; // All providers across all items

    this.setupEventListeners();
  }

  setupEventListeners() {
    if (this.addItemBtn) {
      this.addItemBtn.addEventListener('click', () => this.handleAddItem());
    }
  }

  setItems(items) {
    this.allItems = items;
    this.updateItemSelect();
  }

  setProviders(providers) {
    this.availableProviders = providers;
  }

  updateItemSelect() {
    if (!this.itemSelect) return;

    this.itemSelect.innerHTML = '<option value="">Select an item</option>';

    const addedItemIds = this.selectedItems.map(i => i.item_id);
    const availableItems = this.allItems.filter(
      i => !addedItemIds.includes(i.item_id) && i.status === 'active'
    );

    availableItems.forEach(item => {
      const option = document.createElement('option');
      option.value = item.item_id;
      option.textContent = item.item_name;
      this.itemSelect.appendChild(option);
    });
  }

  async handleAddItem() {
    const itemId = parseInt(this.itemSelect.value);
    if (!itemId) return;

    await this.addItem(itemId);
    this.itemSelect.value = '';
  }

  async addItem(itemId) {
    const item = this.allItems.find(i => i.item_id === itemId);
    if (!item) return;

    this.selectedItems.push(item);

    // Initialize collective allocation if not already set
    if (!this.collectiveAllocation) {
      // Get all unique providers from all items
      const allProviders = await this.loadAllProviders();
      this.collectiveAllocation = {
        mode: 'percentage',
        locked: false,
        lockedProviderId: null,
        providers: allProviders, // All providers across all items
        providerValues: new Map(allProviders.map(p => [p.provider_id, 0]))
      };
    }

    this.render();
    this.updateItemSelect();

    // Update Contract Adjustments UI
    if (window.contractAdjustments) {
      window.contractAdjustments.renderAdjustments(this.selectedItems);
    }
  }

  async loadAllProviders() {
    // Get unique providers from all items
    const uniqueProviders = new Map();

    for (const item of this.selectedItems) {
      try {
        const response = await fetch(`/api/items/${item.item_id}/providers`);
        const providers = await response.json();
        providers.forEach(p => {
          if (!uniqueProviders.has(p.provider_id)) {
            uniqueProviders.set(p.provider_id, p);
          }
        });
      } catch (error) {
        console.error('Error loading providers for item', item.item_id, error);
      }
    }

    // Also add all providers that were pre-loaded
    this.availableProviders.forEach(p => {
      if (!uniqueProviders.has(p.provider_id)) {
        uniqueProviders.set(p.provider_id, p);
      }
    });

    return Array.from(uniqueProviders.values());
  }

  removeItem(itemId) {
    this.selectedItems = this.selectedItems.filter(i => i.item_id !== itemId);

    // Remove corresponding contract multiplier if present
    if (window.contractAdjustments && window.contractAdjustments.multipliers) {
      delete window.contractAdjustments.multipliers[itemId];
    }

    this.render();
    this.updateItemSelect();

    // Update Contract Adjustments UI
    if (window.contractAdjustments) {
      window.contractAdjustments.renderAdjustments(this.selectedItems);
    }
  }

  render() {
    if (!this.container) return;

    if (this.selectedItems.length === 0) {
      this.container.innerHTML = '<p class="text-sm text-muted-foreground text-center py-4">No items added yet</p>';
      // Also clear contract adjustments UI
      if (window.contractAdjustments) {
        window.contractAdjustments.renderAdjustments([]);
      }
      return;
    }

    this.container.innerHTML = '';

    // Show items list
    const itemsList = this.createItemsList();
    this.container.appendChild(itemsList);

    // Show collective allocation section (only if we have items)
    if (this.selectedItems.length > 0) {
      const allocationSection = this.createAllocationSection();
      this.container.appendChild(allocationSection);
    }

    // Update Contract Adjustments UI to reflect current items
    if (window.contractAdjustments) {
      window.contractAdjustments.renderAdjustments(this.selectedItems);
    }
  }

  createItemsList() {
    const itemsList = document.createElement('div');
    itemsList.className = 'border border-border rounded-lg p-4 bg-secondary/10';

    const header = document.createElement('div');
    header.className = 'flex items-center justify-between mb-3';
    header.innerHTML = `
      <div>
        <h4 class="font-medium text-foreground">Items in Product</h4>
        <p class="text-sm text-muted-foreground mt-1">Allocation applies to all items below</p>
      </div>
    `;
    itemsList.appendChild(header);

    // Items grid
    const itemsGrid = document.createElement('div');
    itemsGrid.className = 'flex flex-wrap gap-2';

    this.selectedItems.forEach(item => {
      const itemBadge = document.createElement('div');
      itemBadge.className = 'flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-md';
      itemBadge.innerHTML = `
        <span class="font-medium">${this.escapeHtml(item.item_name)}</span>
        <button type="button" class="text-red-600 hover:text-red-800 ml-2" onclick="window.itemManager.removeItem(${item.item_id})">
          Remove
        </button>
      `;
      itemsGrid.appendChild(itemBadge);
    });

    itemsList.appendChild(itemsGrid);
    return itemsList;
  }

  createAllocationSection() {
    const allocationBlock = document.createElement('div');
    allocationBlock.className = 'border border-border rounded-lg p-4 bg-card mt-4';

    const header = document.createElement('div');
    header.className = 'mb-4';
    header.innerHTML = `
      <h4 class="font-medium text-foreground">Provider Allocations</h4>
      <p class="text-sm text-muted-foreground mt-1">Applies to ALL items above</p>
    `;
    allocationBlock.appendChild(header);

    if (!this.collectiveAllocation || this.collectiveAllocation.providers.length === 0) {
      const noProviders = document.createElement('p');
      noProviders.className = 'text-sm text-muted-foreground text-center py-4';
      noProviders.textContent = 'No providers available';
      allocationBlock.appendChild(noProviders);
      return allocationBlock;
    }

    // Mode toggle
    const modeToggle = document.createElement('div');
    modeToggle.className = 'flex items-center gap-4 mb-4 text-sm';
    modeToggle.innerHTML = `
      <label class="flex items-center gap-1 cursor-pointer">
        <input type="radio" name="mode-collective" value="percentage"
               ${this.collectiveAllocation.mode === 'percentage' ? 'checked' : ''}
               onchange="window.itemManager.handleModeToggle('percentage')"
               class="focus:ring-2 focus:ring-ring">
        <span>Percentage</span>
      </label>
      <label class="flex items-center gap-1 cursor-pointer">
        <input type="radio" name="mode-collective" value="units"
               ${this.collectiveAllocation.mode === 'units' ? 'checked' : ''}
               onchange="window.itemManager.handleModeToggle('units')"
               class="focus:ring-2 focus:ring-ring">
        <span>Units</span>
      </label>
    `;
    allocationBlock.appendChild(modeToggle);

    // Lock message if applicable
    if (this.collectiveAllocation.locked) {
      const lockMsg = document.createElement('div');
      lockMsg.className = 'mb-4 px-3 py-2 rounded-md bg-amber-50 border border-amber-200 text-amber-900 text-sm flex items-center gap-2';
      lockMsg.innerHTML = `
        <span>🔒</span>
        <span><strong>Non-negotiable constraint:</strong> Locked to ${this.getLockedProviderName()}</span>
      `;
      allocationBlock.appendChild(lockMsg);
    }

    // Providers table
    const table = document.createElement('table');
    table.className = 'w-full text-sm';

    const thead = document.createElement('thead');
    thead.className = 'border-b border-border';
    thead.innerHTML = `
      <tr>
        <th class="text-left py-2 font-medium text-muted-foreground">Provider</th>
        <th class="text-left py-2 font-medium text-muted-foreground">Allocation</th>
        <th class="text-right py-2 font-medium text-muted-foreground">Action</th>
      </tr>
    `;
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    this.collectiveAllocation.providers.forEach(provider => {
      const row = this.createProviderRow(provider);
      tbody.appendChild(row);
    });
    table.appendChild(tbody);
    allocationBlock.appendChild(table);

    // Total section with validation
    const total = this.calculateTotal();
    const proxyQuantityInput = document.getElementById('proxyQuantity');
    const proxyQuantity = proxyQuantityInput ? parseInt(proxyQuantityInput.value) || 0 : 0;

    let isValid = false;
    let validationIcon = '';

    if (this.collectiveAllocation.mode === 'percentage') {
      isValid = total === 100;
      validationIcon = isValid ? '<span class="text-green-600">✓</span>' :
                       (total < 100 ? '<span class="text-yellow-600">⚠️</span>' : '<span class="text-red-600">❌</span>');
    } else {
      isValid = total === proxyQuantity;
      validationIcon = isValid ? '<span class="text-green-600">✓</span>' :
                       (total < proxyQuantity ? '<span class="text-yellow-600">⚠️</span>' : '<span class="text-red-600">❌</span>');
    }

    const totalDiv = document.createElement('div');
    totalDiv.className = 'mt-4 pt-3 border-t border-border';

    if (this.collectiveAllocation.mode === 'percentage') {
      totalDiv.innerHTML = `
        <div class="flex items-center justify-between">
          <span class="font-medium">Total:</span>
          <span class="flex items-center gap-2">
            <span class="font-semibold">${total}%</span>
            ${validationIcon}
          </span>
        </div>
        ${!isValid ? `<div class="text-xs text-red-600 mt-1 text-right">Total allocation must equal 100%</div>` : ''}
      `;
    } else {
      totalDiv.innerHTML = `
        <div class="flex items-center justify-between">
          <span class="font-medium">Total:</span>
          <span class="flex items-center gap-2">
            <span class="font-semibold">${total} units</span>
            ${validationIcon}
          </span>
        </div>
        ${!isValid ? `<div class="text-xs text-red-600 mt-1 text-right">Total units must equal Proxy Quantity (${proxyQuantity.toLocaleString()})</div>` : ''}
      `;
    }
    allocationBlock.appendChild(totalDiv);

    return allocationBlock;
  }

  createProviderRow(provider) {
    const allocation = this.collectiveAllocation;
    const isLocked = allocation.locked && allocation.lockedProviderId === provider.provider_id;
    const isDisabled = allocation.locked && !isLocked;
    const suffix = allocation.mode === 'percentage' ? '%' : 'units';
    const value = allocation.providerValues.get(provider.provider_id) || 0;

    const row = document.createElement('tr');
    if (isDisabled) {
      row.className = 'opacity-50';
    }

    row.innerHTML = `
      <td class="py-2">${this.escapeHtml(provider.company_name)}</td>
      <td class="py-2">
        <input type="number"
               value="${value}"
               min="0"
               max="${allocation.mode === 'percentage' ? '100' : ''}"
               ${isDisabled ? 'disabled' : ''}
               onchange="window.itemManager.handleAllocationChange(${provider.provider_id}, this.value)"
               class="w-24 px-2 py-1 border border-input rounded-md focus:ring-2 focus:ring-ring ${isDisabled ? 'bg-muted' : ''}">
        <span class="ml-1 text-muted-foreground">${suffix}</span>
      </td>
      <td class="py-2 text-right">
        ${isLocked ? `
          <button type="button"
                  onclick="window.itemManager.handleUnlock()"
                  title="Unlock allocation"
                  class="px-3 py-1 text-sm rounded-md border border-input hover:bg-accent">
            🔓 Unlock
          </button>
        ` : `
          <button type="button"
                  onclick="window.itemManager.handleLockProvider(${provider.provider_id})"
                  title="Lock to this provider"
                  ${isDisabled ? 'disabled' : ''}
                  class="px-3 py-1 text-sm rounded-md border border-input hover:bg-accent ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}">
            🔒 Lock
          </button>
        `}
      </td>
    `;

    return row;
  }

  handleModeToggle(mode) {
    if (!this.collectiveAllocation) return;

    this.collectiveAllocation.mode = mode;

    if (this.collectiveAllocation.locked && mode === 'percentage') {
      const lockedProviderId = this.collectiveAllocation.lockedProviderId;
      this.collectiveAllocation.providerValues.forEach((value, providerId) => {
        this.collectiveAllocation.providerValues.set(providerId, providerId === lockedProviderId ? 100 : 0);
      });
    }

    this.render();
  }

  handleLockProvider(providerId) {
    if (!this.collectiveAllocation) return;

    this.collectiveAllocation.locked = true;
    this.collectiveAllocation.lockedProviderId = providerId;

    if (this.collectiveAllocation.mode === 'percentage') {
      this.collectiveAllocation.providerValues.forEach((value, pId) => {
        this.collectiveAllocation.providerValues.set(pId, pId === providerId ? 100 : 0);
      });
    }

    this.render();
  }

  handleUnlock() {
    if (!this.collectiveAllocation) return;

    this.collectiveAllocation.locked = false;
    this.collectiveAllocation.lockedProviderId = null;

    this.render();
  }

  handleAllocationChange(providerId, value) {
    if (!this.collectiveAllocation) return;

    const numValue = parseFloat(value) || 0;
    this.collectiveAllocation.providerValues.set(providerId, numValue);

    this.render();
  }

  calculateTotal() {
    if (!this.collectiveAllocation) return 0;

    let total = 0;
    this.collectiveAllocation.providerValues.forEach(value => {
      total += value;
    });
    return total;
  }

  getLockedProviderName() {
    if (!this.collectiveAllocation || !this.collectiveAllocation.lockedProviderId) {
      return '';
    }

    const provider = this.collectiveAllocation.providers.find(p => p.provider_id === this.collectiveAllocation.lockedProviderId);
    return provider ? provider.company_name : '';
  }

  validateAllocations() {
    if (!this.collectiveAllocation) return false;

    // Get proxy quantity from the form
    const proxyQuantityInput = document.getElementById('proxyQuantity');
    const proxyQuantity = proxyQuantityInput ? parseInt(proxyQuantityInput.value) || 0 : 0;

    const total = this.calculateTotal();

    if (this.collectiveAllocation.mode === 'percentage') {
      // Percentage mode: must total 100
      return total === 100;
    } else if (this.collectiveAllocation.mode === 'units') {
      // Units mode: must equal proxy_quantity
      return total === proxyQuantity;
    }
    return true;
  }

  getAllocationData() {
    if (!this.collectiveAllocation) {
      return {};
    }

    const providerList = [];

    this.collectiveAllocation.providerValues.forEach((value, providerId) => {
      const provider = this.collectiveAllocation.providers.find(p => p.provider_id === providerId);
      if (provider) {
        providerList.push({
          provider_id: providerId,
          provider_name: provider.company_name,
          value: value
        });
      }
    });

    // Return collective format (NOT per-item)
    return {
      mode: this.collectiveAllocation.mode,
      locked: this.collectiveAllocation.locked,
      lockedProviderId: this.collectiveAllocation.lockedProviderId,
      providers: providerList
    };
  }

  getItemIds() {
    return this.selectedItems.map(i => i.item_id);
  }

  reset() {
    this.selectedItems = [];
    this.collectiveAllocation = null;
    this.render();
    this.updateItemSelect();
    if (window.contractAdjustments) {
      window.contractAdjustments.multipliers = {};
      window.contractAdjustments.renderAdjustments([]);
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Create singleton instance
const itemManager = new ItemManager();
window.itemManager = itemManager;
