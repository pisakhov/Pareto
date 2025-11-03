/**
 * ItemManager - Manages item selection and provider allocation within Product modal
 */
class ItemManager {
  constructor() {
    this.itemAllocations = new Map();
    this.container = document.getElementById('productItemsContainer');
    this.itemSelect = document.getElementById('itemSelect');
    this.addItemBtn = document.getElementById('addItemBtn');
    this.allItems = [];
    this.allProviders = [];
    
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
    this.allProviders = providers;
  }

  updateItemSelect() {
    if (!this.itemSelect) return;
    
    this.itemSelect.innerHTML = '<option value="">Select an item</option>';
    
    const addedItemIds = Array.from(this.itemAllocations.keys());
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
    
    await this.addItemAllocation(itemId);
    this.itemSelect.value = '';
  }

  async addItemAllocation(itemId) {
    const item = this.allItems.find(i => i.item_id === itemId);
    if (!item) return;

    // Fetch providers for this item
    const providers = await this.loadItemProviders(itemId);
    
    this.itemAllocations.set(itemId, {
      item: item,
      providers: providers,
      allocation: {
        mode: 'percentage',
        locked: false,
        lockedProviderId: null,
        providerValues: new Map(providers.map(p => [p.provider_id, 0]))
      }
    });
    
    this.render();
    this.updateItemSelect();
  }

  async loadItemProviders(itemId) {
    try {
      const response = await fetch(`/api/items/${itemId}/providers`);
      return await response.json();
    } catch (error) {
      console.error('Error loading providers for item:', error);
      return [];
    }
  }

  removeItemAllocation(itemId) {
    this.itemAllocations.delete(itemId);
    // Remove corresponding contract multiplier if present
    if (window.contractAdjustments && window.contractAdjustments.multipliers) {
      delete window.contractAdjustments.multipliers[itemId];
    }
    this.render();
    this.updateItemSelect();
  }

  render() {
    if (!this.container) return;
    
    if (this.itemAllocations.size === 0) {
      this.container.innerHTML = '<p class="text-sm text-muted-foreground text-center py-4">No items added yet</p>';
      // Also clear contract adjustments UI
      if (window.contractAdjustments) {
        window.contractAdjustments.renderAdjustments([]);
      }
      return;
    }
    
    this.container.innerHTML = '';
    
    this.itemAllocations.forEach((data, itemId) => {
      const itemBlock = this.createItemBlock(itemId, data);
      this.container.appendChild(itemBlock);
    });

    // Update Contract Adjustments UI to reflect current items
    if (window.contractAdjustments) {
      const selectedItems = Array.from(this.itemAllocations.entries()).map(([id, data]) => ({
        id: id,
        name: data.item.item_name
      }));
      window.contractAdjustments.renderAdjustments(selectedItems);
    }
  }

  createItemBlock(itemId, data) {
    const itemBlock = document.createElement('div');
    itemBlock.className = 'border border-border rounded-lg p-4 bg-secondary/10';
    itemBlock.dataset.item = itemId;
    
    const header = document.createElement('div');
    header.className = 'flex items-center justify-between mb-3';
    header.innerHTML = `
      <div class="flex items-center gap-2">
        <h4 class="font-medium text-foreground">${this.escapeHtml(data.item.item_name)}</h4>
        <span class="px-2 py-0.5 text-xs rounded-full bg-secondary text-secondary-foreground">
          ${data.providers.length} ${data.providers.length === 1 ? 'provider' : 'providers'}
        </span>
      </div>
      <button type="button" class="text-red-600 hover:text-red-800 text-sm" onclick="window.itemManager.removeItemAllocation(${itemId})">
        Remove
      </button>
    `;
    itemBlock.appendChild(header);

    if (data.providers.length === 0) {
      const noProviders = document.createElement('p');
      noProviders.className = 'text-sm text-muted-foreground text-center py-4';
      noProviders.textContent = 'No providers available for this item';
      itemBlock.appendChild(noProviders);
      return itemBlock;
    }

    // Mode toggle
    const modeToggle = document.createElement('div');
    modeToggle.className = 'flex items-center gap-4 mb-3 text-sm';
    modeToggle.innerHTML = `
      <label class="flex items-center gap-1 cursor-pointer">
        <input type="radio" name="mode-${itemId}" value="percentage" 
               ${data.allocation.mode === 'percentage' ? 'checked' : ''}
               onchange="window.itemManager.handleModeToggle(${itemId}, 'percentage')"
               class="focus:ring-2 focus:ring-ring">
        <span>Percentage</span>
      </label>
      <label class="flex items-center gap-1 cursor-pointer">
        <input type="radio" name="mode-${itemId}" value="units"
               ${data.allocation.mode === 'units' ? 'checked' : ''}
               onchange="window.itemManager.handleModeToggle(${itemId}, 'units')"
               class="focus:ring-2 focus:ring-ring">
        <span>Units</span>
      </label>
    `;
    itemBlock.appendChild(modeToggle);

    // Lock message if applicable
    if (data.allocation.locked) {
      const lockMsg = document.createElement('div');
      lockMsg.className = 'mb-3 px-3 py-2 rounded-md bg-amber-50 border border-amber-200 text-amber-900 text-sm flex items-center gap-2';
      lockMsg.innerHTML = `
        <span>🔒</span>
        <span><strong>Non-negotiable constraint:</strong> Locked to ${this.getProviderName(itemId, data.allocation.lockedProviderId)}</span>
      `;
      itemBlock.appendChild(lockMsg);
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
    data.providers.forEach(provider => {
      const row = this.createProviderRow(itemId, provider, data.allocation);
      tbody.appendChild(row);
    });
    table.appendChild(tbody);
    itemBlock.appendChild(table);

    // Total section with validation
    const total = this.calculateTotal(itemId);
    const proxyQuantityInput = document.getElementById('proxyQuantity');
    const proxyQuantity = proxyQuantityInput ? parseInt(proxyQuantityInput.value) || 0 : 0;
    
    let isValid = false;
    let validationIcon = '';
    
    if (data.allocation.mode === 'percentage') {
      isValid = total === 100;
      validationIcon = isValid ? '<span class="text-green-600">✓</span>' : 
                       (total < 100 ? '<span class="text-yellow-600">⚠️</span>' : '<span class="text-red-600">❌</span>');
    } else {
      isValid = total === proxyQuantity;
      validationIcon = isValid ? '<span class="text-green-600">✓</span>' : 
                       (total < proxyQuantity ? '<span class="text-yellow-600">⚠️</span>' : '<span class="text-red-600">❌</span>');
    }
    
    const totalDiv = document.createElement('div');
    totalDiv.className = 'mt-3 pt-3 border-t border-border';
    
    if (data.allocation.mode === 'percentage') {
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
    itemBlock.appendChild(totalDiv);

    return itemBlock;
  }

  createProviderRow(itemId, provider, allocation) {
    const row = document.createElement('tr');
    const isLocked = allocation.locked && allocation.lockedProviderId === provider.provider_id;
    const isDisabled = allocation.locked && !isLocked;
    const suffix = allocation.mode === 'percentage' ? '%' : 'units';
    const value = allocation.providerValues.get(provider.provider_id) || 0;

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
               onchange="window.itemManager.handleAllocationChange(${itemId}, ${provider.provider_id}, this.value)"
               class="w-24 px-2 py-1 border border-input rounded-md focus:ring-2 focus:ring-ring ${isDisabled ? 'bg-muted' : ''}">
        <span class="ml-1 text-muted-foreground">${suffix}</span>
      </td>
      <td class="py-2 text-right">
        ${isLocked ? `
          <button type="button" 
                  onclick="window.itemManager.handleUnlock(${itemId})"
                  title="Unlock allocation"
                  class="px-3 py-1 text-sm rounded-md border border-input hover:bg-accent">
            🔓 Unlock
          </button>
        ` : `
          <button type="button" 
                  onclick="window.itemManager.handleLockProvider(${itemId}, ${provider.provider_id})"
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

  handleModeToggle(itemId, mode) {
    const data = this.itemAllocations.get(itemId);
    if (!data) return;
    
    data.allocation.mode = mode;
    
    if (data.allocation.locked && mode === 'percentage') {
      const lockedProviderId = data.allocation.lockedProviderId;
      data.allocation.providerValues.forEach((value, providerId) => {
        data.allocation.providerValues.set(providerId, providerId === lockedProviderId ? 100 : 0);
      });
    }
    
    this.render();
  }

  handleLockProvider(itemId, providerId) {
    const data = this.itemAllocations.get(itemId);
    if (!data) return;
    
    data.allocation.locked = true;
    data.allocation.lockedProviderId = providerId;
    
    if (data.allocation.mode === 'percentage') {
      data.allocation.providerValues.forEach((value, pId) => {
        data.allocation.providerValues.set(pId, pId === providerId ? 100 : 0);
      });
    }
    
    this.render();
  }

  handleUnlock(itemId) {
    const data = this.itemAllocations.get(itemId);
    if (!data) return;
    
    data.allocation.locked = false;
    data.allocation.lockedProviderId = null;
    
    this.render();
  }

  handleAllocationChange(itemId, providerId, value) {
    const data = this.itemAllocations.get(itemId);
    if (!data) return;
    
    const numValue = parseFloat(value) || 0;
    data.allocation.providerValues.set(providerId, numValue);
    
    this.render();
  }

  calculateTotal(itemId) {
    const data = this.itemAllocations.get(itemId);
    if (!data) return 0;
    
    let total = 0;
    data.allocation.providerValues.forEach(value => {
      total += value;
    });
    return total;
  }

  getProviderName(itemId, providerId) {
    const data = this.itemAllocations.get(itemId);
    if (!data) return '';
    
    const provider = data.providers.find(p => p.provider_id === providerId);
    return provider ? provider.company_name : '';
  }

  validateAllocations() {
    // Get proxy quantity from the form
    const proxyQuantityInput = document.getElementById('proxyQuantity');
    const proxyQuantity = proxyQuantityInput ? parseInt(proxyQuantityInput.value) || 0 : 0;
    
    for (const [itemId, data] of this.itemAllocations) {
      const total = this.calculateTotal(itemId);
      
      if (data.allocation.mode === 'percentage') {
        // Percentage mode: must total 100
        if (total !== 100) {
          return false;
        }
      } else if (data.allocation.mode === 'units') {
        // Units mode: must equal proxy_quantity
        if (total !== proxyQuantity) {
          return false;
        }
      }
    }
    return true;
  }

  getAllocationData() {
    const allocations = {};
    
    this.itemAllocations.forEach((data, itemId) => {
      const providerList = [];
      
      data.allocation.providerValues.forEach((value, providerId) => {
        const provider = data.providers.find(p => p.provider_id === providerId);
        if (provider) {
          providerList.push({
            provider_id: providerId,
            provider_name: provider.company_name,
            value: value
          });
        }
      });
      
      allocations[itemId] = {
        mode: data.allocation.mode,
        locked: data.allocation.locked,
        lockedProviderId: data.allocation.lockedProviderId,
        providers: providerList
      };
    });
    
    return allocations;
  }

  getItemIds() {
    return Array.from(this.itemAllocations.keys());
  }

  reset() {
    this.itemAllocations.clear();
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
