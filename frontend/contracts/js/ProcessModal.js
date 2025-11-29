/**
 * Process Modal - Manages Add/Edit Process modals and their logic
 * Consolidates logic previously in processGraphEdit.js
 */
class ProcessModal {
    constructor() {
        this.modals = {
            add: 'addProcessModal',
            edit: 'editProcessModal'
        };
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Close buttons
        document.querySelectorAll('[data-modal-close]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modalId = e.currentTarget.dataset.modalClose;
                this.closeModal(modalId);
            });
        });
    }

    showAddModal() {
        const modal = document.getElementById(this.modals.add);
        if (!modal) return;

        modal.classList.remove('hidden');
        modal.classList.add('flex');
        this.resetAddForm();
        this.populateProviderSelect('addNewProviderSelect', 'addContractsContainer');

        // Focus on process name
        setTimeout(() => {
            const processName = document.getElementById('newProcessName');
            if (processName) processName.focus();
        }, 150);
    }

    showEditModal(processId) {
        const modal = document.getElementById(this.modals.edit);
        if (!modal) return;

        modal.classList.remove('hidden');
        modal.classList.add('flex');

        document.getElementById('editProcessId').value = processId;
        this.populateEditForm(processId);
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId || this.modals.add); // Default to add if null
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
        
        if (modalId === this.modals.add) {
            this.resetAddForm();
        } else if (modalId === this.modals.edit) {
            this.resetEditForm();
        }
    }

    resetAddForm() {
        document.getElementById('newProcessName').value = '';
        document.getElementById('newProcessDescription').value = '';
        
        const container = document.getElementById('addContractsContainer');
        if (container) container.innerHTML = '';
        
        const emptyState = document.getElementById('addContractsEmpty');
        if (emptyState) emptyState.style.display = 'block';
        
        const select = document.getElementById('addNewProviderSelect');
        if (select) select.value = '';
    }

    resetEditForm() {
        document.getElementById('editProcessId').value = '';
        document.getElementById('editProcessName').value = '';
        document.getElementById('editProcessDescription').value = '';
        
        const container = document.getElementById('editContractsContainer');
        if (container) container.innerHTML = '';
        
        const emptyState = document.getElementById('editContractsEmpty');
        if (emptyState) emptyState.style.display = 'block';
        
        const select = document.getElementById('editNewProviderSelect');
        if (select) select.value = '';
    }

    async populateProviderSelect(selectId, containerId) {
        const select = document.getElementById(selectId);
        const container = document.getElementById(containerId);
        if (!select || !processGraph || !processGraph.providers) return;

        // Get currently selected providers
        const existingProviders = new Set();
        if (container) {
            container.querySelectorAll('[data-provider-id]').forEach(el => {
                existingProviders.add(parseInt(el.dataset.providerId));
            });
        }

        const availableProviders = processGraph.providers.filter(p => 
            !existingProviders.has(p.provider_id) && p.status === 'active'
        );

        select.innerHTML = '';
        
        if (availableProviders.length === 0) {
            const option = document.createElement('option');
            option.textContent = "No providers available";
            select.appendChild(option);
            select.disabled = true;
        } else {
            select.disabled = false;
            availableProviders.forEach(provider => {
                const option = document.createElement('option');
                option.value = provider.provider_id;
                option.textContent = provider.company_name;
                select.appendChild(option);
            });
        }
    }

    async addProvider(mode) {
        // mode: 'add' or 'edit'
        const selectId = mode === 'add' ? 'addNewProviderSelect' : 'editNewProviderSelect';
        const containerId = mode === 'add' ? 'addContractsContainer' : 'editContractsContainer';
        const emptyStateId = mode === 'add' ? 'addContractsEmpty' : 'editContractsEmpty';
        
        const select = document.getElementById(selectId);
        if (!select || !select.value) {
            Toast.show('Please select a provider', 'error');
            return;
        }

        const providerId = parseInt(select.value);
        const provider = processGraph.providers.find(p => p.provider_id === providerId);
        
        if (!provider) return;

        const container = document.getElementById(containerId);
        const emptyState = document.getElementById(emptyStateId);
        if (emptyState) emptyState.style.display = 'none';

        if (mode === 'edit') {
            // In edit mode, we create the contract immediately
            const processId = parseInt(document.getElementById('editProcessId').value);
            await this.createContractForEdit(processId, providerId);
        } else {
            // In add mode, we just add to the UI
            this.renderContractRow(container, {
                provider_id: provider.provider_id,
                provider_name: provider.company_name,
                tiers: [{ tier_number: 1, threshold_units: 1000 }] // Default tier
            }, mode);
            
            // Refresh select
            this.populateProviderSelect(selectId, containerId);
        }
    }

    async createContractForEdit(processId, providerId) {
        // Create contract
        const newContract = await dataService.createContract({
            process_id: processId,
            provider_id: providerId,
            status: 'active'
        });

        // Create default tier
        await dataService.createContractTier({
            contract_id: newContract.contract_id,
            tier_number: 1,
            threshold_units: 1000,
            is_selected: false
        });
        
        // Create default lookup
        await dataService.saveContractLookup({
            contract_id: newContract.contract_id,
            source: 'actuals',
            method: 'SUM',
            lookback_months: 0
        });

        Toast.show('Contract created successfully', 'success');
        
        // Reload contracts list
        this.loadContractsForEdit(processId);
        
        // Refresh select
        this.populateProviderSelect('editNewProviderSelect', 'editContractsContainer');
    }

    renderContractRow(container, data, mode) {
        // data: { contract_id (opt), provider_id, provider_name, tiers: [], lookup: {} }
        const id = data.contract_id ? `contract-${data.contract_id}` : `temp-contract-${Date.now()}`;
        
        const div = document.createElement('div');
        div.id = id;
        div.className = 'p-4 bg-card border border-border rounded-md space-y-4 mb-4';
        div.dataset.providerId = data.provider_id;
        if (data.contract_id) div.dataset.contractId = data.contract_id;

        // Lookup Defaults
        const lookup = data.lookup || { source: 'actuals', method: 'SUM', lookback_months: 0 };

        div.innerHTML = `
            <div class="flex items-center justify-between border-b border-border pb-3">
                <div class="flex items-center gap-2">
                    <div class="p-1.5 bg-emerald-50 text-emerald-600 rounded">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                        </svg>
                    </div>
                    <h5 class="font-semibold text-foreground">${data.provider_name}</h5>
                </div>
                <button type="button" onclick="processModal.removeContract('${id}', '${mode}')" 
                        class="text-muted-foreground hover:text-destructive transition-colors p-1 hover:bg-destructive/10 rounded">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <!-- Left: Volume Lookup Strategy -->
                <div class="space-y-3">
                    <div class="flex items-center gap-2 mb-2">
                        <div class="p-1 bg-slate-100 rounded-md">
                            <svg class="w-3.5 h-3.5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                            </svg>
                        </div>
                        <span class="text-xs font-semibold uppercase tracking-wider text-slate-500">Volume Lookup Strategy</span>
                    </div>
                    
                    <div class="space-y-4">
                        <!-- Source Toggle -->
                        <div class="space-y-1.5">
                            <label class="text-xs font-medium text-slate-500">Source</label>
                            <div class="flex p-1 bg-slate-50 border border-slate-200 rounded-lg h-8">
                                <input type="hidden" class="lookup-source" value="${lookup.source}">
                                <button type="button" 
                                    class="flex-1 px-2 text-xs font-medium rounded transition-all ${lookup.source === 'actuals' ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}"
                                    onclick="processModal.toggleOption(this, 'actuals')">
                                    Actuals
                                </button>
                                <button type="button" 
                                    class="flex-1 px-2 text-xs font-medium rounded transition-all ${lookup.source === 'forecasts' ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}"
                                    onclick="processModal.toggleOption(this, 'forecasts')">
                                    Forecasts
                                </button>
                            </div>
                        </div>
                        
                        <!-- Method Toggle -->
                        <div class="space-y-1.5">
                            <label class="text-xs font-medium text-slate-500">Method</label>
                            <div class="flex p-1 bg-slate-50 border border-slate-200 rounded-lg h-8">
                                <input type="hidden" class="lookup-method" value="${lookup.method}">
                                <button type="button" 
                                    class="flex-1 px-2 text-xs font-medium rounded transition-all ${lookup.method === 'SUM' ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}"
                                    onclick="processModal.toggleOption(this, 'SUM')">
                                    Total
                                </button>
                                <button type="button" 
                                    class="flex-1 px-2 text-xs font-medium rounded transition-all ${lookup.method === 'AVG' ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}"
                                    onclick="processModal.toggleOption(this, 'AVG')">
                                    Average
                                </button>
                            </div>
                        </div>
                        
                        <!-- Lookback Input -->
                        <div class="space-y-1.5">
                            <div class="flex items-center justify-between">
                                <label class="text-xs font-medium text-slate-500">Lookback Period (Months)</label>
                                <span class="text-[10px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">0 = Current only</span>
                            </div>
                            <div class="relative">
                                <input type="number" min="0" max="12" value="${lookup.lookback_months}" 
                                       class="lookup-range w-full px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all h-9"
                                       oninput="if(this.value === '') return; if(this.value < 0) this.value = 0; if(this.value > 12) this.value = 12;">
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Right: Volume Tiers -->
                <div class="space-y-3 border-l border-border pl-6">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <div class="p-1 bg-emerald-50 rounded-md">
                                <svg class="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
                                </svg>
                            </div>
                            <span class="text-xs font-semibold uppercase tracking-wider text-slate-500">Volume Tiers</span>
                        </div>
                        <button type="button" onclick="processModal.addTierRow('${id}')" 
                                class="text-xs px-2.5 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-md transition-colors flex items-center gap-1.5 font-medium border border-emerald-100">
                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                            </svg>
                            Add Tier
                        </button>
                    </div>
                    
                    <div class="tier-container space-y-2 max-h-[200px] overflow-y-auto pr-1">
                        <!-- Tiers will be injected here -->
                    </div>
                </div>
            </div>
        `;

        container.appendChild(div);

        // Add initial tiers
        if (data.tiers && data.tiers.length > 0) {
            data.tiers.sort((a, b) => a.tier_number - b.tier_number).forEach(tier => {
                this.addTierRow(id, tier.tier_number, tier.threshold_units);
            });
        } else {
            this.addTierRow(id, 1, 1000);
        }
    }

    toggleOption(btn, value) {
        const container = btn.parentElement;
        const input = container.querySelector('input[type="hidden"]');
        const buttons = container.querySelectorAll('button');
        
        // Update hidden input
        input.value = value;
        
        // Update styles
        buttons.forEach(b => {
            if (b === btn) {
                b.className = 'flex-1 px-2 text-xs font-medium rounded transition-all bg-white text-slate-900 shadow-sm border border-slate-200';
            } else {
                b.className = 'flex-1 px-2 text-xs font-medium rounded transition-all text-slate-500 hover:text-slate-700';
            }
        });
    }

    addTierRow(contractRowId, tierNum = null, threshold = 0) {
        const contractRow = document.getElementById(contractRowId);
        if (!contractRow) return;
        
        const container = contractRow.querySelector('.tier-container');
        const currentTiers = container.querySelectorAll('.tier-row').length;
        const nextTier = tierNum || (currentTiers + 1);
        
        const row = document.createElement('div');
        row.className = 'tier-row flex items-center gap-3 p-2 bg-slate-50 rounded-lg border border-slate-200 shadow-sm group hover:border-emerald-500/30 transition-colors';
        row.innerHTML = `
            <div class="flex items-center justify-center w-7 h-7 rounded-md bg-white text-xs font-bold text-slate-600 border border-slate-200 shadow-sm">
                T${nextTier}
            </div>
            <span class="text-xs font-medium text-slate-500">Less than</span>
            <div class="flex-1 relative">
                <input type="number" min="0" value="${threshold}" data-tier="${nextTier}"
                       class="tier-input w-full pl-3 pr-8 py-1.5 text-sm bg-white border border-slate-200 rounded-md focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder-slate-400">
                <span class="absolute right-3 top-1.5 text-xs text-slate-400 pointer-events-none">units</span>
            </div>
            ${nextTier > 1 ? `
                <button type="button" onclick="this.closest('.tier-row').remove()" class="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors opacity-0 group-hover:opacity-100">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                </button>
            ` : '<div class="w-7"></div>'}
        `;
        
        container.appendChild(row);
    }

    async removeContract(id, mode) {
        const el = document.getElementById(id);
        if (!el) return;

        if (mode === 'edit') {
            const contractId = el.dataset.contractId;
            if (contractId) {
                if (confirm('Are you sure? This will delete the contract and its history.')) {
                    await dataService.deleteContract(contractId);
                    el.remove();
                    Toast.show('Contract deleted', 'success');
                    
                    // Refresh Select
                    this.populateProviderSelect('editNewProviderSelect', 'editContractsContainer');
                }
            }
        } else {
            el.remove();
            // Refresh Select
            this.populateProviderSelect('addNewProviderSelect', 'addContractsContainer');
        }
    }

    async loadContractsForEdit(processId) {
        const container = document.getElementById('editContractsContainer');
        container.innerHTML = '';
        
        // Get Process to double check existence
        try {
            const process = await dataService.getProcess(processId);
            if (!process) {
                Toast.show('Process not found', 'error');
                return;
            }
        } catch (e) { return; }

        // Load contracts
        const contracts = await dataService.loadContractsForProcessId(processId);
        
        if (contracts.length === 0) {
            document.getElementById('editContractsEmpty').style.display = 'block';
        } else {
            document.getElementById('editContractsEmpty').style.display = 'none';
            
            // Load details for each contract (Tiers + Lookup)
            for (const contract of contracts) {
                const [tiers, lookup] = await Promise.all([
                    dataService.loadContractTiers(contract.contract_id),
                    dataService.loadContractLookup(contract.contract_id)
                ]);
                
                this.renderContractRow(container, {
                    contract_id: contract.contract_id,
                    provider_id: contract.provider_id,
                    provider_name: contract.provider_name,
                    tiers: tiers,
                    lookup: lookup
                }, 'edit');
            }
        }
        
        this.populateProviderSelect('editNewProviderSelect', 'editContractsContainer');
    }

    async populateEditForm(processId) {
        const process = processGraph.processes.find(p => p.process_id === processId);
        if (process) {
            document.getElementById('editProcessName').value = process.process_name;
            document.getElementById('editProcessDescription').value = process.description || '';
        }
        
        await this.loadContractsForEdit(processId);
    }

    // SUBMIT HANDLERS

    async handleCreateProcess(e) {
        e.preventDefault();
        
        const name = document.getElementById('newProcessName').value;
        const desc = document.getElementById('newProcessDescription').value;
        const container = document.getElementById('addContractsContainer');
        
        const contractRows = container.children;
        if (contractRows.length === 0) {
            Toast.show('Please add at least one provider', 'error');
            return;
        }

        // 1. Create Process
        const process = await dataService.createProcess({
            process_name: name,
            description: desc,
            provider_id: 0 // Legacy field
        });

        // 2. Create Contracts, Tiers, Lookups
        for (const row of contractRows) {
            const providerId = parseInt(row.dataset.providerId);
            
            // Create Contract
            const contract = await dataService.createContract({
                process_id: process.process_id,
                provider_id: providerId,
                contract_name: `${name} - Provider ${providerId}`
            });

            // Create Tiers
            const tiers = row.querySelectorAll('.tier-input');
            for (const tierInput of tiers) {
                await dataService.createContractTier({
                    contract_id: contract.contract_id,
                    tier_number: parseInt(tierInput.dataset.tier),
                    threshold_units: parseInt(tierInput.value) || 0
                });
            }

            // Create Lookup
            const source = row.querySelector('.lookup-source').value;
            const method = row.querySelector('.lookup-method').value;
            const rangeVal = parseInt(row.querySelector('.lookup-range').value);
            const lookbackMonths = isNaN(rangeVal) ? 0 : Math.max(0, rangeVal);

            await dataService.saveContractLookup({
                contract_id: contract.contract_id,
                source: source,
                method: method,
                lookback_months: lookbackMonths
            });
        }

        Toast.show('Process created successfully', 'success');
        this.closeModal('addProcessModal');
        // Refresh parent graph
        if (processGraph) {
            processGraph.init();
        }
    }

    async handleEditProcess(e) {
        e.preventDefault();
        
        const processId = parseInt(document.getElementById('editProcessId').value);
        const name = document.getElementById('editProcessName').value;
        const desc = document.getElementById('editProcessDescription').value;
        
        // Update Process Details
        await dataService.updateProcess(processId, {
            process_name: name,
            description: desc
        });

        // Update Contract Details (Tiers and Lookups)
        const container = document.getElementById('editContractsContainer');
        for (const row of container.children) {
            const contractId = parseInt(row.dataset.contractId);
            if (!contractId) continue; // Should have ID in edit mode

            // Update Tiers
            // First, get existing tiers to know IDs
            const existingTiers = await dataService.loadContractTiers(contractId);
            const inputs = row.querySelectorAll('.tier-input');
            
            // Map inputs to tiers (simple sync)
            const processedTierIds = new Set();
            
            for (const input of inputs) {
                const tierNum = parseInt(input.dataset.tier);
                const val = parseInt(input.value) || 0;
                
                const existing = existingTiers.find(t => t.tier_number === tierNum);
                if (existing) {
                    await dataService.updateContractTier(existing.contract_tier_id, { threshold_units: val });
                    processedTierIds.add(existing.contract_tier_id);
                } else {
                    await dataService.createContractTier({
                        contract_id: contractId,
                        tier_number: tierNum,
                        threshold_units: val
                    });
                }
            }

            // Delete removed tiers
            for (const tier of existingTiers) {
                if (!processedTierIds.has(tier.contract_tier_id)) {
                    await dataService.deleteContractTier(tier.contract_tier_id);
                }
            }

            // Update Lookup
            const source = row.querySelector('.lookup-source').value;
            const method = row.querySelector('.lookup-method').value;
            const rangeVal = parseInt(row.querySelector('.lookup-range').value);
            const lookbackMonths = isNaN(rangeVal) ? 0 : Math.max(0, rangeVal);

            await dataService.saveContractLookup({
                contract_id: contractId,
                source: source,
                method: method,
                lookback_months: lookbackMonths
            });
        }

        Toast.show('Process updated successfully', 'success');
        this.closeModal('editProcessModal');
        // Refresh parent graph
        if (processGraph) {
            processGraph.init();
        }
    }
}

const processModal = new ProcessModal();
window.processModal = processModal;
