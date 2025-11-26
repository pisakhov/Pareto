/**
 * Form Handler - Handles form submissions for products
 */
class FormHandler {
    constructor(dataService, modalManager, uiManager) {
        this.dataService = dataService;
        this.modalManager = modalManager;
        this.uiManager = uiManager;
    }

    setupForms() {
        const form = document.getElementById('productForm');
        if (form) {
            form.addEventListener('submit', (e) => this.handleProductSubmit(e));
        }
    }

    async handleProductSubmit(event) {
        event.preventDefault();

        if (!window.itemManager.validateAllocations()) {
            window.Toast.show(
                'Invalid allocations: All percentage items must total 100%',
                'error'
            );
            return;
        }

        const formData = new FormData(event.target);
        const contractSelections = window.itemManager.getContractSelections();

        const data = {
            name: formData.get('name'),
            description: formData.get('description') || '',
            status: formData.get('status'),
            contract_selections: contractSelections,
            allocations: window.itemManager.getAllocationData(),
            price_multipliers: window.contractAdjustments.getMultiplierData(),
            forecasts: window.forecastManager.getForecastData(),
            actuals: window.forecastManager.getActualData(),
        };

        try {
            await this.dataService.saveProduct(data, window.editingProductId);
            this.modalManager.closeProductModal();
            await window.productsApp.refreshData();
            window.Toast.show(
                window.editingProductId ? 'Product updated successfully' : 'Product created successfully',
                'success'
            );
        } catch (error) {
            window.Toast.show(error.message, 'error');
        }
    }

    async editProduct(productId) {
        try {
            const product = await this.dataService.getProduct(productId);

            window.editingProductId = productId;
            document.getElementById('productModalTitle').textContent = 'Edit Product';
            
            document.getElementById('productId').value = product.product_id;
            document.getElementById('productName').value = product.name;
            document.getElementById('productDescription').value = product.description;
            document.getElementById('productStatus').value = product.status;

            // Set status toggle
            const isActive = product.status === 'active';
            const statusToggle = document.getElementById('productStatusToggle');
            if (statusToggle) {
                statusToggle.checked = isActive;
            }
            const statusLabel = document.getElementById('productStatusLabel');
            if (statusLabel) {
                statusLabel.textContent = isActive ? 'Active' : 'Inactive';
            }

            // Load forecasts and actuals
            if (window.forecastManager) {
                window.forecastManager.loadFromProduct(product);
            }

            // Load contracts into itemManager
            if (window.itemManager) {
                window.itemManager.reset();

                const allContracts = await this.dataService.getAllContracts();
                window.itemManager.setContracts(allContracts);

                if (product.contracts && product.contracts.length > 0) {
                    for (const processData of product.contracts) {
                        const fullProcess = allContracts.find(p => p.process_id === processData.process_id);
                        if (fullProcess) {
                            const processCopy = {
                                ...fullProcess,
                                items: fullProcess.items.filter(item =>
                                    processData.items.some(si => si.item_id === item.item_id)
                                )
                            };
                            await window.itemManager.addProcess(processCopy);
                        }
                    }
                }

                // Restore allocations
                if (product.allocations) {
                    // Check if backend returned collective format (no numeric item keys)
                    // or per-item format (with numeric item_id keys)
                    const firstKey = Object.keys(product.allocations)[0];
                    const isCollectiveFormat = !firstKey || isNaN(parseInt(firstKey, 10));

                    if (isCollectiveFormat) {
                        // Collective format: single allocation object
                        window.itemManager.selectedContracts.forEach((processData, processId) => {
                            const allocation = product.allocations;

                            // Update allocation metadata
                            processData.allocation.mode = allocation.mode || 'percentage';
                            processData.allocation.locked = allocation.locked || false;
                            processData.allocation.lockedProviderId = allocation.lockedProviderId || null;

                            // Clear and rebuild providerValues
                            processData.allocation.providerValues.clear();

                            // Ensure ALL providers (from UI) have entries in the Map
                            // The backend may only return locked provider(s), but UI loaded all providers
                            processData.allocation.providers.forEach(provider => {
                                const backendProvider = allocation.providers.find(p => p.provider_id === provider.provider_id);
                                const value = backendProvider ? (backendProvider.value || 0) : 0;
                                processData.allocation.providerValues.set(provider.provider_id, value);
                            });
                        });
                    } else {
                        // Per-item format: allocations by item_id
                        const processAllocations = {};

                        // Iterate through each contract/process
                        window.itemManager.selectedContracts.forEach((processData, processId) => {
                            const itemIds = processData.selectedItems.map(item => item.item_id);
                            const allProviders = new Map();

                            // Collect allocations from all items in this process
                            itemIds.forEach(itemId => {
                                const itemAlloc = product.allocations[itemId] || product.allocations[itemId.toString()];
                                if (itemAlloc && itemAlloc.providers) {
                                    itemAlloc.providers.forEach(provider => {
                                        if (!allProviders.has(provider.provider_id)) {
                                            allProviders.set(provider.provider_id, {
                                                provider_id: provider.provider_id,
                                                provider_name: provider.provider_name
                                            });
                                        }
                                    });
                                }
                            });

                            // Build providers array WITH their actual values from backend
                            const providersWithValues = [];
                            allProviders.forEach((provider, providerId) => {
                                let value = 0;
                                for (const itemId of itemIds) {
                                    const itemAlloc = product.allocations[itemId] || product.allocations[itemId.toString()];
                                    if (itemAlloc && itemAlloc.providers) {
                                        const providerData = itemAlloc.providers.find(p => p.provider_id === providerId);
                                        if (providerData && providerData.value !== undefined) {
                                            value = providerData.value;
                                            break;
                                        }
                                    }
                                }
                                providersWithValues.push({
                                    provider_id: providerId,
                                    provider_name: provider.provider_name,
                                    value: value
                                });
                            });

                            processAllocations[processId] = {
                                mode: (product.allocations[itemIds[0]] || {}).mode || 'percentage',
                                locked: (product.allocations[itemIds[0]] || {}).locked || false,
                                lockedProviderId: (product.allocations[itemIds[0]] || {}).lockedProviderId || null,
                                providers: providersWithValues
                            };
                        });

                        // Apply allocations to each process
                        for (const [processIdStr, allocation] of Object.entries(processAllocations)) {
                            const processId = parseInt(processIdStr, 10);
                            const processData = window.itemManager.selectedContracts.get(processId);
                            if (processData && processData.allocation) {
                                processData.allocation.mode = allocation.mode;
                                processData.allocation.locked = allocation.locked;
                                processData.allocation.lockedProviderId = allocation.lockedProviderId;

                                processData.allocation.providerValues.clear();
                                allocation.providers.forEach(provider => {
                                    processData.allocation.providerValues.set(provider.provider_id, provider.value);
                                });
                            }
                        }
                    }
                    window.itemManager.render();
                }
            }

            if (product.price_multipliers) {
                window.contractAdjustments.multipliers = product.price_multipliers;
            }

            // Render Pricing Adjustments for current items
            if (window.itemManager && window.contractAdjustments) {
                const selectedItems = window.itemManager.selectedItems.map(item => ({
                    id: item.item_id,
                    name: item.item_name
                }));
                window.contractAdjustments.renderAdjustments(selectedItems);
            }

            this.modalManager.showProductModal(true);
        } catch (error) {
            console.error('[EDIT PRODUCT] Error:', error);
            window.Toast.show('Failed to load product: ' + error.message, 'error');
        }
    }

    async deleteProduct(productId, button) {
        if (!confirm('Are you sure you want to delete this product?')) {
            return;
        }

        const originalText = button.textContent;
        button.textContent = 'Deleting...';
        button.disabled = true;

        try {
            await this.dataService.deleteProduct(productId);
            window.Toast.show('Product deleted successfully', 'success');
            await window.productsApp.refreshData();
        } catch (error) {
            window.Toast.show(error.message, 'error');
        } finally {
            button.textContent = originalText;
            button.disabled = false;
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}
