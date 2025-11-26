/**
 * ItemManager - Manages contract-based item selection and provider allocation
 */
class ItemManager {
  constructor() {
    this.selectedItems = [];
    this.container = document.getElementById('productItemsContainer');
    this.contractSelect = document.getElementById('contractSelect');
    this.addContractBtn = document.getElementById('addContractBtn');
    this.allProcessesAddedMsg = document.getElementById('allProcessesAddedMsg');
    this.allContracts = [];
    this.selectedContracts = new Map(); // contract_id -> {contract, selectedItems: [], allocation: {...}}
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
    const processProviders = await this.loadProvidersForProcess(processData);
    this.selectedContracts.set(processData.process_id, {
      process: processData,
      selectedItems: [...processData.items],
      selectAll: true,
      allocation: {
        mode: 'percentage',
        providers: processProviders,
        providerValues: new Map(processProviders.map(p => [p.provider_id, 0]))
      }
    });

    this.rebuildSelectedItems();
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

  async loadProvidersForProcess(processData) {
    const uniqueProviders = new Map();

    processData.items.forEach(item => {
      item.providers.forEach(provider => {
        if (!uniqueProviders.has(provider.provider_id)) {
          uniqueProviders.set(provider.provider_id, {
            provider_id: provider.provider_id,
            company_name: provider.provider_name
          });
        }
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
    const processData = this.selectedContracts.get(processId);
    if (!processData) return document.createElement('div');

    const allocation = processData.allocation;
    const allocationBlock = document.createElement('div');
    allocationBlock.className = 'bg-gradient-to-r from-[#fb923c]/5 to-[#fb923c]/10 border border-[#fb923c]/20 rounded-lg p-4';

    const header = document.createElement('div');
    header.className = 'mb-4 flex items-center justify-between';
    header.innerHTML = `
      <h4 class="text-sm font-semibold text-slate-700">Provider Allocations</h4>
      <div role="radiogroup" class="flex gap-2 text-sm bg-white rounded-lg p-1 border border-[#fb923c]/20">
        <button type="button"
                onclick="window.itemManager.handleModeToggle('${processId}', 'percentage')"
                class="px-3 py-1 rounded-md cursor-pointer ${allocation.mode === 'percentage' ? 'bg-[#fb923c] text-white' : 'text-slate-700 hover:bg-slate-50'}">
          %
        </button>
        <button type="button"
                onclick="window.itemManager.handleModeToggle('${processId}', 'units')"
                class="px-3 py-1 rounded-md cursor-pointer ${allocation.mode === 'units' ? 'bg-[#fb923c] text-white' : 'text-slate-700 hover:bg-slate-50'}">
          Units
        </button>
      </div>
    `;
    allocationBlock.appendChild(header);

    if (!allocation || allocation.providers.length === 0) {
      const noProviders = document.createElement('div');
      noProviders.className = 'text-sm text-slate-600 text-center py-8';
      allocationBlock.appendChild(noProviders);
      return allocationBlock;
    }

    const table = document.createElement('div');
    table.className = 'space-y-2';

    allocation.providers.forEach(provider => {
      const suffix = allocation.mode === 'percentage' ? '%' : 'units';
      const value = allocation.providerValues.get(provider.provider_id) || 0;

      const row = document.createElement('div');
      row.className = 'flex items-center justify-between py-2 px-3 bg-white rounded-lg border border-[#fb923c]/20';
      row.innerHTML = `
        <div class="flex items-center gap-3">
          <span class="font-medium text-slate-900">${this.escapeHtml(provider.company_name || 'Unknown Provider')}</span>
        </div>
        <div class="flex items-center gap-2">
          <input type="number" value="${value}" min="0"
                 onchange="window.itemManager.handleAllocationChange('${processId}', '${provider.provider_id}', this.value)"
                 class="w-20 px-2 py-1 border border-slate-300 rounded text-center text-sm font-medium focus:ring-2 focus:ring-[#fb923c] focus:border-[#fb923c]">
          <span class="text-sm text-slate-600 w-12 text-left">${suffix}</span>
          ${allocation.mode === 'percentage' ? `
            <button type="button" onclick="window.itemManager.handleLockProvider('${processId}', '${provider.provider_id}')"
                    class="text-xs text-slate-500 hover:text-[#fb923c] px-2 py-1 hover:bg-slate-50 rounded transition-colors">
              🔒 Lock
            </button>
          ` : ''}
        </div>
      `;
      table.appendChild(row);
    });

    allocationBlock.appendChild(table);

    // Total section
    const total = this.calculateTotal(processId);
    const suffix = allocation.mode === 'percentage' ? '%' : 'units';
    const isValid = allocation.mode === 'percentage' ? total === 100 : true;
    const totalDiv = document.createElement('div');
    totalDiv.className = 'mt-3 pt-3 border-t border-[#fb923c]/30 flex items-center justify-between';
    totalDiv.innerHTML = `
      <span class="text-sm font-semibold text-slate-700">Total:</span>
      <span class="text-sm font-semibold ${isValid ? 'text-green-600' : 'text-amber-600'}">${total} ${suffix} ${isValid ? '✓' : '⚠️'}</span>
    `;
    allocationBlock.appendChild(totalDiv);

    return allocationBlock;
  }

  handleModeToggle(processId, mode) {
    const processData = this.selectedContracts.get(parseInt(processId, 10));
    if (!processData) return;

    const allocation = processData.allocation;

    // Always reset values when switching modes
    allocation.mode = mode;
    
    

    allocation.providerValues.forEach((value, providerId) => {
      allocation.providerValues.set(providerId, 0);
    });

    this.render();
  }

  handleLockProvider(processId, providerId) {
    const processData = this.selectedContracts.get(parseInt(processId, 10));
    if (!processData) return;

    const allocation = processData.allocation;
    if (allocation.mode !== 'percentage') {
      return;
    }

    // Convert string to number for comparison
    const numericProviderId = parseInt(providerId, 10);

    
    

    allocation.providerValues.forEach((value, pId) => {
      const newValue = pId === numericProviderId ? 100 : 0;
      allocation.providerValues.set(pId, newValue);
    });

    this.render();
  }


  handleAllocationChange(processId, providerId, value) {
    const processData = this.selectedContracts.get(parseInt(processId, 10));
    if (!processData) return;

    // Convert providerId to number for consistency with the Map
    const numericProviderId = parseInt(providerId, 10);
    const allocation = processData.allocation;
    const numValue = parseFloat(value);
    const finalValue = isNaN(numValue) ? 0 : numValue;

    allocation.providerValues.set(numericProviderId, finalValue);

    this.render();
  }

  calculateTotal(processId) {
    const processData = this.selectedContracts.get(parseInt(processId, 10));
    if (!processData) return 0;

    let total = 0;
    processData.allocation.providerValues.forEach(value => {
      total += value;
    });
    return total;
  }


  validateAllocations() {
    // All process allocations must be valid
    for (const [processId, processData] of this.selectedContracts) {
      const total = this.calculateTotal(processId);
      const allocation = processData.allocation;

      // Percentage mode must total 100%
      if (allocation.mode === 'percentage' && total !== 100) {
        return false;
      }
      // Units mode has no limit
    }
    return true;
  }

  getAllocationData() {
    // Convert per-process allocations to per-item allocations for backend
    const allocations = {};
    this.selectedContracts.forEach((processData, processId) => {
      const allocation = processData.allocation;
      const providerList = [];
      allocation.providerValues.forEach((value, providerId) => {
        const provider = allocation.providers.find(p => p.provider_id === providerId);
        providerList.push({
          provider_id: providerId,
          provider_name: provider.company_name,
          value: value
        });
      });

      // Apply same allocation to all items in this process
      processData.selectedItems.forEach(item => {
        allocations[item.item_id] = {
          mode: allocation.mode,
          locked: allocation.locked,
          lockedProviderId: allocation.lockedProviderId,
          providers: providerList
        };
      });
    });
    return allocations;
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
