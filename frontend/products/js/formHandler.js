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
            this.uiManager.showNotification(
                'Invalid allocations: All percentage items must total 100%',
                'error'
            );
            return;
        }

        const formData = new FormData(event.target);
        const itemIds = window.itemManager.getItemIds();

        const data = {
            name: formData.get('name'),
            description: formData.get('description') || '',
            status: formData.get('status'),
            item_ids: itemIds,
            allocations: window.itemManager.getAllocationData(),
            price_multipliers: window.contractAdjustments.getMultiplierData(),
            forecasts: window.forecastManager.getForecastData(),
            actuals: window.forecastManager.getActualData(),
        };

        try {
            await this.dataService.saveProduct(data, window.editingProductId);
            this.modalManager.closeProductModal();
            await window.productsApp.refreshData();
            this.uiManager.showNotification(
                window.editingProductId ? 'Product updated successfully' : 'Product created successfully',
                'success'
            );
        } catch (error) {
            this.uiManager.showNotification(error.message, 'error');
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

            // Load forecasts and actuals
            if (window.forecastManager) {
                window.forecastManager.loadFromProduct(product);
            }

            // Load items into itemManager
            if (window.itemManager) {
                window.itemManager.reset();
                
                // Add each item with its providers
                for (const itemId of product.item_ids) {
                    await window.itemManager.addItemAllocation(itemId);
                }
                
                // Restore allocations
                if (product.allocations) {
                    for (const [itemIdStr, allocation] of Object.entries(product.allocations)) {
                        const itemId = parseInt(itemIdStr);
                        const data = window.itemManager.itemAllocations.get(itemId);
                        if (data) {
                            data.allocation.mode = allocation.mode;
                            data.allocation.locked = allocation.locked;
                            data.allocation.lockedProviderId = allocation.lockedProviderId;
                            
                            // Restore provider values (from list format)
                            allocation.providers.forEach(provider => {
                                data.allocation.providerValues.set(provider.provider_id, provider.value);
                            });
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
                const selectedItems = Array.from(window.itemManager.itemAllocations.entries()).map(([id, data]) => ({
                    id: id,
                    name: data.item.item_name
                }));
                window.contractAdjustments.renderAdjustments(selectedItems);
            }

            this.modalManager.showProductModal(true);
        } catch (error) {
            this.uiManager.showNotification('Failed to load product', 'error');
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
            this.uiManager.showNotification('Product deleted successfully', 'success');
            await window.productsApp.refreshData();
        } catch (error) {
            this.uiManager.showNotification(error.message, 'error');
        } finally {
            button.textContent = originalText;
            button.disabled = false;
        }
    }

    async viewProduct(productId) {
        try {
            const product = await this.dataService.getProduct(productId);
            const items = await this.dataService.loadItems();
            
            const itemsMap = {};
            items.forEach(item => {
                itemsMap[item.item_id] = item.item_name;
            });

            let content = `
                <div class="border-b border-border pb-4">
                    <div class="flex items-center justify-between mb-2">
                        <h4 class="text-xl font-bold text-foreground">${this.escapeHtml(product.name)}</h4>
                        <span class="px-3 py-1 text-sm rounded-full ${
                            product.status === 'active'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                        }">
                            ${product.status}
                        </span>
                    </div>
                    ${product.description ? `<p class="text-muted-foreground">${this.escapeHtml(product.description)}</p>` : ''}
                </div>

                <div>
                    <h5 class="font-semibold mb-3">Associated Items</h5>
                    ${product.item_ids.length > 0 ? `
                        <div class="flex flex-wrap gap-2">
                            ${product.item_ids.map(itemId => `
                                <span class="px-3 py-1 bg-secondary text-secondary-foreground rounded-md text-sm">
                                    ${this.escapeHtml(itemsMap[itemId] || `Item ${itemId}`)}
                                </span>
                            `).join('')}
                        </div>
                    ` : '<p class="text-muted-foreground text-sm">No items associated</p>'}
                </div>
            `;

            if (product.allocations && Object.keys(product.allocations).length > 0) {
                content += '<div><h5 class="font-semibold mb-3">Provider Allocations</h5><div class="space-y-4">';
                
                for (const [itemId, allocation] of Object.entries(product.allocations)) {
                    const itemName = itemsMap[itemId] || `Item ${itemId}`;
                    const total = allocation.providers.reduce((sum, p) => sum + p.value, 0);
                    
                    content += `
                        <div class="border border-border rounded-lg p-4">
                            <div class="flex items-center justify-between mb-3">
                                <h6 class="font-medium">${this.escapeHtml(itemName)}</h6>
                                <span class="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground">
                                    ${allocation.mode === 'percentage' ? 'Percentage' : 'Units'}
                                </span>
                            </div>
                            
                            ${allocation.locked ? `
                                <div class="mb-3 px-3 py-2 rounded-md bg-amber-50 border border-amber-200 text-amber-900 text-sm">
                                    🔒 <strong>Locked:</strong> Non-negotiable constraint
                                </div>
                            ` : ''}
                            
                            <table class="w-full text-sm">
                                <thead class="border-b border-border">
                                    <tr>
                                        <th class="text-left py-2">Provider</th>
                                        <th class="text-right py-2">Allocation</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${allocation.providers.map(provider => `
                                        <tr class="border-b border-border last:border-0">
                                            <td class="py-2">${this.escapeHtml(provider.provider_name)}</td>
                                            <td class="text-right py-2 font-medium">
                                                ${provider.value}${allocation.mode === 'percentage' ? '%' : ' units'}
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                                <tfoot class="border-t border-border">
                                    <tr>
                                        <td class="py-2 font-semibold">Total</td>
                                        <td class="text-right py-2 font-semibold">
                                            ${total}${allocation.mode === 'percentage' ? '%' : ' units'}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    `;
                }
                
                content += '</div></div>';
            }

            if (product.price_multipliers && Object.keys(product.price_multipliers).length > 0) {
                content += '<div><h5 class="font-semibold mb-3">Pricing Adjustments</h5><div class="space-y-2">';
                
                for (const [itemId, info] of Object.entries(product.price_multipliers)) {
                    const itemName = itemsMap[itemId] || `Item ${itemId}`;
                    const multiplier = info.multiplier || 1.0;
                    const notes = info.notes || '';
                    const percentage = ((multiplier - 1) * 100).toFixed(1);
                    const label = multiplier < 1 ? `${Math.abs(percentage)}% discount` : 
                                 multiplier > 1 ? `+${percentage}% premium` : 
                                 'Standard pricing';
                    const badgeClass = multiplier < 1 ? 'bg-green-100 text-green-800' : 
                                      multiplier > 1 ? 'bg-amber-100 text-amber-800' : 
                                      'bg-gray-100 text-gray-800';
                    
                    content += `
                        <div class="flex items-center justify-between py-2 border-b border-border last:border-0">
                            <div>
                                <span class="font-medium text-sm">${this.escapeHtml(itemName)}</span>
                                ${notes ? `<p class="text-xs text-muted-foreground mt-1">${this.escapeHtml(notes)}</p>` : ''}
                            </div>
                            <div class="flex items-center gap-2">
                                <span class="font-mono text-sm">${multiplier.toFixed(2)}x</span>
                                <span class="px-2 py-1 text-xs rounded-full ${badgeClass}">${label}</span>
                            </div>
                        </div>
                    `;
                }
                
                content += '</div></div>';
            }

            // Display Forecasts
            if (product.forecasts && product.forecasts.length > 0) {
                const monthNames = [
                    'January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'
                ];

                content += '<div><h5 class="font-semibold mb-3">Forecasts</h5><div class="space-y-2">';

                product.forecasts.forEach(forecast => {
                    content += `
                        <div class="flex items-center justify-between p-2 border border-green-200 bg-green-50 rounded-md">
                            <div class="flex items-center gap-3">
                                <span class="text-sm font-medium text-foreground">
                                    ${monthNames[forecast.month - 1]} ${forecast.year}
                                </span>
                            </div>
                            <span class="text-sm font-semibold text-green-600">
                                ${forecast.forecast_units.toLocaleString()} units
                            </span>
                        </div>
                    `;
                });

                content += '</div></div>';
            }

            // Display Actuals
            if (product.actuals && product.actuals.length > 0) {
                const monthNames = [
                    'January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'
                ];

                content += '<div><h5 class="font-semibold mb-3 mt-4">Actuals</h5><div class="space-y-2">';

                product.actuals.forEach(actual => {
                    content += `
                        <div class="flex items-center justify-between p-2 border border-blue-200 bg-blue-50 rounded-md">
                            <div class="flex items-center gap-3">
                                <span class="text-sm font-medium text-foreground">
                                    ${monthNames[actual.month - 1]} ${actual.year}
                                </span>
                            </div>
                            <span class="text-sm font-semibold text-blue-600">
                                ${actual.actual_units.toLocaleString()} units
                            </span>
                        </div>
                    `;
                });

                content += '</div></div>';
            }

            document.getElementById('productViewContent').innerHTML = content;
            this.modalManager.showViewModal();
        } catch (error) {
            this.uiManager.showNotification('Failed to load product details', 'error');
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}
