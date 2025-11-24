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
      this.container.innerHTML = '<p class="text-sm text-muted-foreground text-center py-4">No items added yet</p>';
      if (window.contractAdjustments) {
        window.contractAdjustments.renderAdjustments([]);
      }
      return;
    }

    this.container.innerHTML = '';

    const contractsList = this.createContractsList();
    this.container.appendChild(contractsList);

    if (window.contractAdjustments) {
      window.contractAdjustments.renderAdjustments(this.selectedItems);
    }
  }

  createContractsList() {
    const contractsList = document.createElement('div');
    contractsList.className = 'space-y-6';

    this.selectedContracts.forEach((processData, processId) => {
      // Create a beautiful, minimalistic card for each process
      const processCard = document.createElement('div');
      processCard.className = 'bg-card border border-border rounded-xl shadow-sm overflow-hidden';

      // Card Header
      const cardHeader = document.createElement('div');
      cardHeader.className = 'px-6 py-4 bg-gradient-to-r from-[#fb923c]/5 to-[#fb923c]/10 border-b border-border';
      cardHeader.innerHTML = `
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="p-2 bg-white rounded-lg border border-slate-200 shadow-sm">
              <svg class="w-5 h-5 text-[#fb923c]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <div>
              <h3 class="text-lg font-semibold text-slate-900">${this.escapeHtml(processData.process.process_name)}</h3>
              <p class="text-sm text-slate-600 mt-0.5">Configure items and allocations</p>
            </div>
          </div>
          <button type="button" onclick="window.itemManager.removeContract(${processId})"
                  class="text-red-600 hover:text-red-800 text-sm font-medium inline-flex items-center gap-1 px-3 py-1.5 hover:bg-red-50 rounded-md transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Remove
          </button>
        </div>
      `;
      processCard.appendChild(cardHeader);

      // Card Body
      const cardBody = document.createElement('div');
      cardBody.className = 'p-6';

      // Items Section
      const itemsSection = document.createElement('div');
      itemsSection.className = 'mb-6';

      const selectAllId = `selectAll_${processId}`;
      itemsSection.innerHTML = `
        <div class="flex items-center justify-between mb-3">
          <h4 class="text-sm font-semibold text-slate-700">Items in Process</h4>
          <label for="${selectAllId}" class="text-sm font-medium cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
            <input type="checkbox" id="${selectAllId}" ${processData.selectAll ? 'checked' : ''}
                   onchange="window.itemManager.toggleContractSelectAll(${processId}, this.checked)"
                   class="focus:ring-2 focus:ring-[#fb923c] rounded">
            <span>Select All (${processData.process.items.length})</span>
          </label>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      `;

      processData.process.items.forEach(item => {
        const isSelected = processData.selectedItems.find(i => i.item_id === item.item_id) !== undefined;
        const providerNames = item.providers.map(p => this.escapeHtml(p.provider_name)).join(' · ');
        const itemCard = document.createElement('div');
        itemCard.className = `border-2 rounded-xl p-4 transition-all duration-200 hover:shadow-md ${isSelected ? 'border-[#fb923c] bg-gradient-to-br from-[#fb923c]/5 to-[#fb923c]/10 shadow-sm' : 'border-slate-200 hover:border-slate-300'}`;
        itemCard.innerHTML = `
          <label class="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" ${isSelected ? 'checked' : ''}
                   onchange="window.itemManager.toggleContractItem(${processId}, ${item.item_id}, this.checked)"
                   class="mt-1 w-5 h-5 text-[#fb923c] focus:ring-2 focus:ring-[#fb923c] focus:ring-offset-0 rounded border-2 border-slate-300">
            <div class="flex-1 min-w-0">
              <div class="text-sm font-semibold text-slate-900 mb-1">${this.escapeHtml(item.item_name)}</div>
              <div class="text-xs text-slate-600 flex items-center gap-1">
                <svg class="w-3.5 h-3.5 text-slate-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
                </svg>
                <span>${providerNames}</span>
              </div>
            </div>
          </label>
        `;
        itemsSection.querySelector('div.grid').appendChild(itemCard);
      });

      itemsSection.innerHTML += `</div>`;
      cardBody.appendChild(itemsSection);

      // Allocation Section (only show if there are selected items)
      const selectedItemsForProcess = processData.selectedItems.length;
      if (selectedItemsForProcess > 0) {
        const allocationSection = this.createProcessAllocationSection(processId);
        cardBody.appendChild(allocationSection);
      }

      processCard.appendChild(cardBody);
      contractsList.appendChild(processCard);
    });

    return contractsList;
  }

  createProcessAllocationSection(processId) {
    const allocationBlock = document.createElement('div');
    allocationBlock.className = 'bg-gradient-to-r from-[#fb923c]/5 to-[#fb923c]/10 border border-[#fb923c]/20 rounded-lg p-4';

    const header = document.createElement('div');
    header.className = 'mb-3 flex items-center justify-between';
    header.innerHTML = `
      <h4 class="text-sm font-semibold text-slate-700 flex items-center gap-2">
        <svg class="w-4 h-4 text-[#fb923c]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        Provider Allocations
      </h4>
      <div role="radiogroup" class="flex gap-3 text-sm">
        <label class="flex items-center gap-1.5 cursor-pointer">
          <input type="radio" name="allocationMode_${processId}" value="percentage"
                 ${this.collectiveAllocation.mode === 'percentage' ? 'checked' : ''}
                 onchange="window.itemManager.handleModeToggle('percentage')"
                 class="focus:ring-2 focus:ring-[#fb923c]">
          <span class="text-slate-700 font-medium">Percentage</span>
        </label>
        <label class="flex items-center gap-1.5 cursor-pointer">
          <input type="radio" name="allocationMode_${processId}" value="units"
                 ${this.collectiveAllocation.mode === 'units' ? 'checked' : ''}
                 onchange="window.itemManager.handleModeToggle('units')"
                 class="focus:ring-2 focus:ring-[#fb923c]">
          <span class="text-slate-700 font-medium">Units</span>
        </label>
      </div>
    `;
    allocationBlock.appendChild(header);

    if (!this.collectiveAllocation || this.collectiveAllocation.providers.length === 0) {
      const noProviders = document.createElement('div');
      noProviders.className = 'text-sm text-slate-600 text-center py-4';
      noProviders.innerHTML = `
        <svg class="w-8 h-8 mx-auto mb-2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        No providers available
      `;
      allocationBlock.appendChild(noProviders);
      return allocationBlock;
    }

    const providersGrid = document.createElement('div');
    providersGrid.className = 'space-y-3';

    this.collectiveAllocation.providers.forEach(provider => {
      const isLocked = this.collectiveAllocation.locked && this.collectiveAllocation.lockedProviderId === provider.provider_id;
      const suffix = this.collectiveAllocation.mode === 'percentage' ? '%' : 'units';
      const value = this.collectiveAllocation.providerValues.get(provider.provider_id) || 0;

      const providerCard = document.createElement('div');
      providerCard.className = 'bg-white border border-[#fb923c]/20 rounded-lg p-3';
      providerCard.innerHTML = `
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-full bg-[#fb923c]/10 flex items-center justify-center border border-[#fb923c]/30">
              <span class="text-[#fb923c] font-semibold text-sm">${(provider.company_name || 'P').charAt(0)}</span>
            </div>
            <span class="font-medium text-slate-900">${this.escapeHtml(provider.company_name || 'Unknown Provider')}</span>
          </div>
          <div class="flex items-center gap-2">
            <input type="number" value="${value}" min="0"
                   onchange="window.itemManager.handleAllocationChange('${provider.provider_id}', this.value)"
                   class="w-20 px-3 py-1.5 border border-[#fb923c]/30 rounded-md text-center font-medium">
            <span class="text-sm font-medium text-slate-600">${suffix}</span>
            ${isLocked ? '<span class="text-amber-600">🔒</span>' : ''}
          </div>
        </div>
        ${this.collectiveAllocation.mode === 'percentage' ? `
          <div class="mt-2 text-right">
            ${isLocked ? `
              <button type="button" onclick="window.itemManager.handleUnlock()"
                      class="text-xs text-amber-600 hover:text-amber-800 font-medium inline-flex items-center gap-1 px-2 py-1 hover:bg-amber-50 rounded-md transition-colors">
                🔓 Unlock
              </button>
            ` : `
              <button type="button" onclick="window.itemManager.handleLockProvider('${provider.provider_id}')"
                      class="text-xs text-slate-600 hover:text-slate-800 font-medium inline-flex items-center gap-1 px-2 py-1 hover:bg-slate-100 rounded-md transition-colors">
                🔒 Lock
              </button>
            `}
          </div>
        ` : ''}
      `;
      providersGrid.appendChild(providerCard);
    });

    allocationBlock.appendChild(providersGrid);

    // Total section
    const total = this.calculateTotal();
    const suffix = this.collectiveAllocation.mode === 'percentage' ? '%' : 'units';
    const isValid = this.collectiveAllocation.mode === 'percentage' ? total === 100 : true;
    const totalDiv = document.createElement('div');
    totalDiv.className = 'mt-4 pt-3 border-t border-[#fb923c]/20';
    totalDiv.innerHTML = `
      <div class="flex items-center justify-between">
        <span class="text-sm font-semibold text-slate-700">Total Allocation:</span>
        <div class="flex items-center gap-2">
          <span class="text-lg font-bold ${isValid ? 'text-green-600' : 'text-amber-600'}">${total} ${suffix}</span>
          ${isValid ? '<span class="text-green-600">✓</span>' : '<span class="text-amber-600">⚠️</span>'}
        </div>
      </div>
      ${!isValid && this.collectiveAllocation.mode === 'percentage' ?
        '<div class="text-xs text-amber-600 mt-1 text-right">Must equal 100%</div>' : ''}
    `;
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

    const oldMode = this.collectiveAllocation.mode;
    this.collectiveAllocation.mode = mode;

    if (mode === 'units') {
      this.collectiveAllocation.locked = false;
      this.collectiveAllocation.lockedProviderId = null;
      this.collectiveAllocation.providerValues.forEach((value, providerId) => {
        this.collectiveAllocation.providerValues.set(providerId, 0);
      });
    } else if (mode === 'percentage' && oldMode === 'units') {
      this.collectiveAllocation.locked = false;
      this.collectiveAllocation.lockedProviderId = null;
      this.collectiveAllocation.providerValues.forEach((value, providerId) => {
        this.collectiveAllocation.providerValues.set(providerId, 0);
      });
    } else if (mode === 'percentage' && this.collectiveAllocation.locked) {
      const lockedProviderId = this.collectiveAllocation.lockedProviderId;
      this.collectiveAllocation.providerValues.forEach((value, providerId) => {
        this.collectiveAllocation.providerValues.set(providerId, providerId === lockedProviderId ? 100 : 0);
      });
    }

    this.render();
  }

  handleLockProvider(providerId) {
    if (!this.collectiveAllocation || this.collectiveAllocation.mode !== 'percentage') {
      return;
    }

    // Convert string to number for comparison
    const numericProviderId = parseInt(providerId, 10);

    this.collectiveAllocation.locked = true;
    this.collectiveAllocation.lockedProviderId = numericProviderId;

    this.collectiveAllocation.providerValues.forEach((value, pId) => {
      this.collectiveAllocation.providerValues.set(pId, pId === numericProviderId ? 100 : 0);
    });

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

    // Convert providerId to number for consistency with the Map
    const numericProviderId = parseInt(providerId, 10);

    const numValue = parseFloat(value);
    const finalValue = isNaN(numValue) ? 0 : numValue;

    this.collectiveAllocation.providerValues.set(numericProviderId, finalValue);

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
