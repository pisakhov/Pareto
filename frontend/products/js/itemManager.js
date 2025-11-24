/**
 * ItemManager - Manages contract-based item selection and provider allocation
 */
class ItemManager {
  constructor() {
    this.selectedItems = [];
    this.collectiveAllocation = null;
    this.container = document.getElementById('productItemsContainer');
    this.contractSelect = document.getElementById('contractSelect');
    this.addContractBtn = document.getElementById('addContractBtn');
    this.allProcessesAddedMsg = document.getElementById('allProcessesAddedMsg');
    this.allContracts = [];
    this.selectedContracts = new Map(); // contract_id -> {contract, selectedItems: []}
    this.availableProviders = [];
    this.currentProcessId = null;

    this.setupEventListeners();
  }

  setupEventListeners() {
    if (this.addContractBtn) {
      this.addContractBtn.addEventListener('click', () => this.handleAddContract());
    }
  }

  setContracts(contracts, processId = null) {
    this.allContracts = contracts;
    this.currentProcessId = processId;
    this.updateContractSelect();
  }

  setProviders(providers) {
    this.availableProviders = providers;
  }

  updateContractSelect() {
    if (!this.contractSelect || !this.allProcessesAddedMsg) return;

    this.contractSelect.innerHTML = '';

    const addedProcessIds = Array.from(this.selectedContracts.keys());
    const availableProcesses = [];

    this.allContracts.forEach(process => {
      if (!addedProcessIds.includes(process.process_id)) {
        const option = document.createElement('option');
        option.value = process.process_id;
        option.textContent = process.process_name;
        this.contractSelect.appendChild(option);
        availableProcesses.push(process);
      }
    });

    // Check if all processes have been added
    const allAdded = availableProcesses.length === 0;

    // Show/hide message
    if (allAdded) {
      this.allProcessesAddedMsg.classList.remove('hidden');
    } else {
      this.allProcessesAddedMsg.classList.add('hidden');
    }

    // Hide/show the process selection card and button
    const processCard = this.contractSelect.closest('.bg-gradient-to-r');
    if (processCard) {
      processCard.style.display = allAdded ? 'none' : 'block';
    }
    if (this.addContractBtn) {
      this.addContractBtn.style.display = allAdded ? 'none' : 'inline-flex';
    }
  }

  async handleAddContract() {
    const processId = parseInt(this.contractSelect.value);
    if (!processId) return;

    const processData = this.allContracts.find(p => p.process_id === processId);
    if (!processData) return;

    await this.addProcess(processData);
    this.contractSelect.value = '';
  }

  async addProcess(processData) {
    this.selectedContracts.set(processData.process_id, {
      process: processData,
      selectedItems: [...processData.items],
      selectAll: true
    });

    this.rebuildSelectedItems();

    if (!this.collectiveAllocation) {
      const allProviders = await this.loadAllProviders();
      this.collectiveAllocation = {
        mode: 'percentage',
        locked: false,
        lockedProviderId: null,
        providers: allProviders,
        providerValues: new Map(allProviders.map(p => [p.provider_id, 0]))
      };
    }

    this.render();
    this.updateContractSelect();

    if (window.contractAdjustments) {
      window.contractAdjustments.renderAdjustments(this.selectedItems);
    }
  }

  removeContract(processId) {
    this.selectedContracts.delete(processId);
    this.rebuildSelectedItems();
    this.render();
    this.updateContractSelect();

    if (window.contractAdjustments) {
      window.contractAdjustments.renderAdjustments(this.selectedItems);
    }
  }

  toggleContractItem(processId, itemId, checked) {
    const processData = this.selectedContracts.get(processId);
    if (!processData) return;

    if (checked) {
      if (!processData.selectedItems.find(i => i.item_id === itemId)) {
        const item = processData.process.items.find(i => i.item_id === itemId);
        if (item) {
          processData.selectedItems.push(item);
        }
      }
    } else {
      processData.selectedItems = processData.selectedItems.filter(i => i.item_id !== itemId);
    }

    processData.selectAll = processData.selectedItems.length === processData.process.items.length;

    this.rebuildSelectedItems();
    this.render();
  }

  toggleContractSelectAll(processId, checked) {
    const processData = this.selectedContracts.get(processId);
    if (!processData) return;

    processData.selectAll = checked;
    if (checked) {
      processData.selectedItems = [...processData.process.items];
    } else {
      processData.selectedItems = [];
    }

    this.rebuildSelectedItems();
    this.render();
  }

  rebuildSelectedItems() {
    this.selectedItems = [];
    this.selectedContracts.forEach(processData => {
      this.selectedItems.push(...processData.selectedItems);
    });
  }

  async loadAllProviders() {
    const uniqueProviders = new Map();

    this.selectedContracts.forEach(processData => {
      processData.selectedItems.forEach(item => {
        item.providers.forEach(provider => {
          if (!uniqueProviders.has(provider.provider_id)) {
            uniqueProviders.set(provider.provider_id, {
              provider_id: provider.provider_id,
              company_name: provider.provider_name
            });
          }
        });
      });
    });

    this.availableProviders.forEach(p => {
      if (!uniqueProviders.has(p.provider_id)) {
        uniqueProviders.set(p.provider_id, p);
      }
    });

    return Array.from(uniqueProviders.values());
  }

  render() {
    if (!this.container) return;

    if (this.selectedContracts.size === 0) {
      this.container.innerHTML = '<p class="text-sm text-muted-foreground text-center py-4">No contracts added yet</p>';
      if (window.contractAdjustments) {
        window.contractAdjustments.renderAdjustments([]);
      }
      return;
    }

    this.container.innerHTML = '';

    const contractsList = this.createContractsList();
    this.container.appendChild(contractsList);

    if (this.selectedItems.length > 0) {
      const allocationSection = this.createAllocationSection();
      this.container.appendChild(allocationSection);
    }

    if (window.contractAdjustments) {
      window.contractAdjustments.renderAdjustments(this.selectedItems);
    }
  }

  createContractsList() {
    const contractsList = document.createElement('div');
    contractsList.className = 'space-y-4';

    this.selectedContracts.forEach((processData, processId) => {
      const processBlock = document.createElement('div');
      processBlock.className = 'border border-border rounded-lg p-4 bg-secondary/10';

      const header = document.createElement('div');
      header.className = 'flex items-center justify-between mb-3';
      header.innerHTML = `
        <div>
          <h4 class="font-medium text-foreground">${this.escapeHtml(processData.process.process_name)}</h4>
          <p class="text-sm text-muted-foreground mt-1">
            Select items to include in this process
          </p>
        </div>
        <button type="button" class="text-red-600 hover:text-red-800 text-sm" onclick="window.itemManager.removeContract(${processId})">
          Remove Process
        </button>
      `;
      processBlock.appendChild(header);

      const itemsList = document.createElement('div');
      itemsList.className = 'space-y-2';

      const selectAllId = `selectAll_${processId}`;
      const selectAllDiv = document.createElement('div');
      selectAllDiv.className = 'flex items-center gap-2 mb-3';
      selectAllDiv.innerHTML = `
        <input type="checkbox" id="${selectAllId}" ${processData.selectAll ? 'checked' : ''}
               onchange="window.itemManager.toggleContractSelectAll(${processId}, this.checked)"
               class="focus:ring-2 focus:ring-ring rounded">
        <label for="${selectAllId}" class="text-sm font-medium cursor-pointer">
          Select All Items (${processData.process.items.length})
        </label>
      `;
      itemsList.appendChild(selectAllDiv);

      processData.process.items.forEach(item => {
        const isSelected = processData.selectedItems.find(i => i.item_id === item.item_id) !== undefined;
        const itemRow = document.createElement('div');
        itemRow.className = 'flex items-start gap-2 ml-6';
        itemRow.innerHTML = `
          <div class="mt-1">
            <input type="checkbox" ${isSelected ? 'checked' : ''}
                   onchange="window.itemManager.toggleContractItem(${processId}, ${item.item_id}, this.checked)"
                   class="focus:ring-2 focus:ring-ring rounded">
          </div>
          <div>
            <div class="text-sm font-medium">${this.escapeHtml(item.item_name)}</div>
            <div class="text-xs text-muted-foreground mt-1">
              Available from: ${item.providers.map(p => p.provider_name).join(', ')}
            </div>
          </div>
        `;
        itemsList.appendChild(itemRow);
      });

      processBlock.appendChild(itemsList);
      contractsList.appendChild(processBlock);
    });

    return contractsList;
  }

  createAllocationSection() {
    const allocationBlock = document.createElement('div');
    allocationBlock.className = 'border border-border rounded-lg p-4 bg-card mt-4';

    const header = document.createElement('div');
    header.className = 'mb-4';
    header.innerHTML = `
      <h4 class="font-medium text-foreground">Provider Allocations</h4>
      <p class="text-sm text-muted-foreground mt-1">Applies to ALL selected items above</p>
    `;
    allocationBlock.appendChild(header);

    if (!this.collectiveAllocation || this.collectiveAllocation.providers.length === 0) {
      const noProviders = document.createElement('p');
      noProviders.className = 'text-sm text-muted-foreground text-center py-4';
      noProviders.textContent = 'No providers available';
      allocationBlock.appendChild(noProviders);
      return allocationBlock;
    }

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

    if (this.collectiveAllocation.locked) {
      const lockMsg = document.createElement('div');
      lockMsg.className = 'mb-4 px-3 py-2 rounded-md bg-amber-50 border border-amber-200 text-amber-900 text-sm flex items-center gap-2';
      lockMsg.innerHTML = `
        <span>🔒</span>
        <span><strong>Non-negotiable constraint:</strong> Locked to ${this.getLockedProviderName()}</span>
      `;
      allocationBlock.appendChild(lockMsg);
    }

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

    const proxyQuantityInput = document.getElementById('proxyQuantity');
    const proxyQuantity = proxyQuantityInput ? parseInt(proxyQuantityInput.value) || 0 : 0;

    const total = this.calculateTotal();

    if (this.collectiveAllocation.mode === 'percentage') {
      return total === 100;
    } else if (this.collectiveAllocation.mode === 'units') {
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

  getContractSelections() {
    const selections = {};
    this.selectedContracts.forEach((processData, processId) => {
      selections[processData.process.process_id] = processData.selectedItems.map(i => i.item_id);
    });
    return selections;
  }

  reset() {
    this.selectedItems = [];
    this.selectedContracts.clear();
    this.collectiveAllocation = null;
    this.render();
    this.updateContractSelect();
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

const itemManager = new ItemManager();
window.itemManager = itemManager;
