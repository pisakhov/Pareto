/**
 * Card Renderer - Handles rendering products as cards in a grid layout
 */
class TableRenderer {
    constructor() {
        this.products = [];
        this.filteredProducts = [];
        this._popoverInit = false;
    }

    setData(data) {
        this.products = data.products || [];
        this.filteredProducts = this.products;
    }

    renderAll() {
        this.renderProducts();
    }

    filterProducts(searchTerm, statusFilter) {
        this.filteredProducts = this.products.filter(product => {
            const matchesSearch = !searchTerm || 
                product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                product.description.toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesStatus = statusFilter === 'all' || product.status === statusFilter;
            
            return matchesSearch && matchesStatus;
        });
        this.renderProducts();
    }

    renderProducts() {
        const grid = document.getElementById('productsGrid');
        const emptyState = document.getElementById('emptyState');
        
        if (!grid || !emptyState) return;

        grid.innerHTML = '';

        if (this.filteredProducts.length === 0) {
            grid.classList.add('hidden');
            emptyState.classList.remove('hidden');
            return;
        }

        grid.classList.remove('hidden');
        emptyState.classList.add('hidden');

        this.filteredProducts.forEach(product => {
            const card = this.createProductCard(product);
            grid.appendChild(card);
        });
        this.ensurePopoverListeners();
    }

    createProductCard(product) {
        const isActive = product.status === 'active';
        const card = document.createElement('div');
        card.className = `
            bg-white border border-slate-200 rounded-xl overflow-hidden
            hover:shadow-xl hover:border-[#fb923c]/30
            transition-all duration-300
            ${!isActive ? 'opacity-70' : ''}
        `;

        // Build process information
        const processInfo = this.getProcessInfo(product);

        card.innerHTML = `
            <div class="bg-gradient-to-r from-[#fb923c]/10 to-[#fb923c]/5 border-b border-[#fb923c]/10 p-4">
                <div class="flex items-start justify-between">
                    <div class="flex items-start gap-3 flex-1">
                        <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-[#fb923c] to-[#fb923c]/80 flex items-center justify-center shadow-sm">
                            <svg class="w-6 h-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                        </div>
                        <div class="flex-1 min-w-0">
                            <h3 class="font-semibold text-slate-900 text-lg ${!isActive ? 'line-through text-slate-500' : ''}">${this.escapeHtml(product.name)}</h3>
                            <div class="flex items-center gap-2 mt-1">
                                <span class="w-2 h-2 rounded-full ${isActive ? 'bg-green-500' : 'bg-gray-400'}"></span>
                                <span class="text-xs font-medium ${isActive ? 'text-green-700' : 'text-gray-600'}">${isActive ? 'Active' : 'Inactive'}</span>
                            </div>
                        </div>
                    </div>
                </div>
                ${product.description ? `
                    <p class="text-sm text-slate-600 mt-3 line-clamp-2">${this.escapeHtml(product.description)}</p>
                ` : ''}
            </div>

            <div class="p-4 space-y-4">
                <!-- Process Information -->
                <div class="space-y-2">
                    <h4 class="text-xs font-semibold text-slate-700 uppercase tracking-wider">Processes & Items</h4>
                    ${processInfo}
                </div>

                <!-- Allocation Summary -->
                <div class="pt-3 border-t border-slate-200">
                    <div class="flex items-center justify-between mb-2">
                        <div class="flex items-center text-sm text-slate-600">
                            <svg class="w-4 h-4 mr-1.5 text-[#fb923c]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            <span class="font-medium text-slate-700">Total Items:</span>
                            <span class="ml-1 font-semibold text-[#fb923c]">${product.item_ids?.length || 0}</span>
                        </div>
                        <div class="text-xs text-slate-500">
                            ${this.formatDate(product.date_last_update)}
                        </div>
                    </div>

                    ${product.proxy_quantity > 0 ? `
                        <details class="text-sm">
                            <summary class="flex items-center cursor-pointer hover:text-[#fb923c] transition-colors list-none">
                                <svg class="w-4 h-4 mr-1 text-[#fb923c]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                                <span class="text-slate-600">Est. Files:</span>
                                <span class="ml-1 font-semibold text-[#fb923c]">${product.proxy_quantity.toLocaleString()}</span>
                                <svg class="w-3 h-3 ml-1 text-slate-400 transition-transform details-chevron" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                                </svg>
                            </summary>
                            <div class="mt-2 ml-5 pl-3 border-l-2 border-[#fb923c]/20 space-y-1">
                                ${this.getItemBreakdown(product)}
                            </div>
                        </details>
                    ` : ''}
                </div>

                <!-- Action Buttons -->
                <div class="flex items-center gap-2 pt-2">
                    <button onclick="window.formHandler.viewProduct(${product.product_id})"
                            class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#fb923c] bg-[#fb923c]/10 hover:bg-[#fb923c]/20 border border-[#fb923c]/30 hover:border-[#fb923c]/50 rounded-lg transition-all"
                            title="View Details">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" class="w-3.5 h-3.5">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                            <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>View</span>
                    </button>
                    <button onclick="window.formHandler.editProduct(${product.product_id})"
                            class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#fb923c] bg-[#fb923c]/10 hover:bg-[#fb923c]/20 border border-[#fb923c]/30 hover:border-[#fb923c]/50 rounded-lg transition-all"
                            title="Edit Product">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" class="w-3.5 h-3.5">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                        </svg>
                        <span>Edit</span>
                    </button>
                    <button onclick="window.formHandler.deleteProduct(${product.product_id}, this)"
                            class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 hover:border-red-300 rounded-lg transition-all"
                            title="Delete Product">
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

    getProcessInfo(product) {
        // Get items data from the global app data
        const items = window.productsApp?.data?.items || [];
        const contracts = window.productsApp?.data?.contracts || [];

        console.log('[PRODUCT CARD DEBUG] Product:', product.name);
        console.log('[PRODUCT CARD DEBUG] Items:', items);
        console.log('[PRODUCT CARD DEBUG] Contracts:', contracts);

        if (!product.item_ids || product.item_ids.length === 0) {
            return '<p class="text-xs text-slate-500 italic">No processes assigned</p>';
        }

        // Build process map from contracts data
        const processMap = new Map();

        // First, populate process names from contracts
        contracts.forEach(contract => {
            if (contract.process_id && contract.process_name) {
                processMap.set(contract.process_id, {
                    name: contract.process_name,
                    items: []
                });
                console.log('[PRODUCT CARD DEBUG] Added process:', contract.process_id, contract.process_name);
            }
        });

        // Now assign items to their processes
        product.item_ids.forEach(itemId => {
            const item = items.find(i => i.item_id === itemId);
            if (item) {
                // Find the contract that contains this item
                const contract = contracts.find(c =>
                    c.items && c.items.some(ci => ci.item_id === itemId)
                );

                if (contract && contract.process_id) {
                    console.log('[PRODUCT CARD DEBUG] Item:', item.item_name, 'Process ID:', contract.process_id, 'Process Name:', contract.process_name);

                    // Use the contract's process_id, not the item's (which may be undefined)
                    if (!processMap.has(contract.process_id)) {
                        processMap.set(contract.process_id, {
                            name: contract.process_name || `Process ${contract.process_id}`,
                            items: []
                        });
                    }
                    processMap.get(contract.process_id).items.push(item);
                }
            }
        });

        console.log('[PRODUCT CARD DEBUG] Final Process Map:', processMap);

        // Generate HTML for processes (only show processes with items)
        const processesHTML = Array.from(processMap.entries())
            .filter(([processId, process]) => process.items.length > 0) // Only show processes with items
            .map(([processId, process]) => {
                const itemCount = process.items.length;

                return `
                <div class="bg-slate-50 rounded-lg p-3 border border-slate-200">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center">
                            <div class="w-2 h-2 rounded-full bg-[#fb923c] mr-2"></div>
                            <span class="text-sm font-semibold text-slate-800">${this.escapeHtml(process.name)}</span>
                        </div>
                        <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#fb923c]/10 text-[#fb923c] border border-[#fb923c]/20">
                            ${itemCount} ${itemCount === 1 ? 'item' : 'items'}
                        </span>
                    </div>
                </div>
            `;
            }).join('');

        return processesHTML;
    }

    getItemBreakdown(product) {
        if (!product.item_ids || product.item_ids.length === 0) {
            return '<div class="text-xs text-muted-foreground">No items assigned</div>';
        }

        const pricing = window.productsApp?.data?.pricing || {};
        const productPricing = pricing[product.product_id] || {};

        const providers = {};
        product.item_ids.forEach(itemId => {
            const itemData = (window.productsApp?.data?.items || []).find(i => i.item_id === itemId);
            const itemName = itemData ? itemData.item_name : `Item #${itemId}`;
            const itemPricing = productPricing[itemId];
            const list = Array.isArray(itemPricing) ? itemPricing : (itemPricing ? [itemPricing] : []);
            list.forEach(pd => {
                const pid = String(pd.provider_id);
                const base = Number(pd.base_price ?? pd.final_price ?? 0);
                const mult = Number(pd.multiplier ?? 1);
                const final = Number(pd.final_price ?? base * mult);
                if (!providers[pid]) providers[pid] = { name: pd.provider_name || `Provider ${pid}`, items: [], subtotal: 0 };
                providers[pid].items.push({ id: itemId, name: itemName, base, final, tier: pd.tier, mult });
                providers[pid].subtotal += final;
            });
        });

        let perFileTotal = 0;
        const groupHtml = Object.values(providers).map(group => {
            perFileTotal += group.subtotal;
            const rows = group.items.map(it => {
                const isMult = it.mult !== 1;
                const isPremium = it.mult > 1;
                const change = `${isPremium ? '+' : '-'}${Math.abs((it.mult - 1) * 100).toFixed(0)}%`;
                const dotClass = isPremium ? 'bg-amber-500' : 'bg-green-500';
                const popId = `pp-${product.product_id}-${group.name.replace(/\s+/g,'-')}-${it.id}`;
                const pop = isMult ? `
                    <span class=\"relative inline-flex items-center ml-1\" data-popover-root>
                        <button type=\"button\" class=\"inline-block w-1.5 h-1.5 rounded-full ${dotClass}\" aria-label=\"Pricing adjustment\" onclick=\"window.tableRenderer.togglePopover('${popId}')\"></button>
                        <div id=\"${popId}\" class=\"price-popover hidden absolute z-50 mt-2 right-0 w-44 rounded-md border border-border bg-card shadow p-2 text-[11px]\">
                            <div class=\"flex items-center justify-between\"><span class=\"text-muted-foreground\">Base</span><span class=\"font-medium\">$${this.formatPrice(it.base)}</span></div>
                            <div class=\"flex items-center justify-between\"><span class=\"text-muted-foreground\">Multiplier</span><span class=\"font-medium ${isPremium ? 'text-amber-700' : 'text-green-700'}\">×${it.mult.toFixed(2)}</span></div>
                            <div class=\"flex items-center justify-between\"><span class=\"text-muted-foreground\">Change</span><span class=\"font-medium ${isPremium ? 'text-amber-700' : 'text-green-700'}\">${change}</span></div>
                        </div>
                    </span>` : '';
                return `<div class=\"text-xs text-muted-foreground flex items-start\">\n                    <svg class=\"w-3 h-3 mr-1 mt-0.5 flex-shrink-0\" xmlns=\"http://www.w3.org/2000/svg\" fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"currentColor\">\n                        <path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M9 5l7 7-7 7\" />\n                    </svg>\n                    <span class=\"flex-1\">${this.escapeHtml(it.name)}</span>\n                    <div class=\"ml-auto text-right flex items-center\">\n                        <span class=\"font-semibold text-green-600\">$${this.formatPrice(it.final)}</span>\n                        <span class=\"text-xs text-muted-foreground ml-1\">(T${it.tier})</span>
                        ${pop}
                    </div>\n                </div>`;
            }).join('');
            return `<div class=\"mb-2\">\n                <div class=\"flex items-center justify-between font-medium text-foreground mb-1\">\n                    <span>${this.escapeHtml(group.name)}</span>\n                    <span class=\"text-sm\">$${this.formatPrice(group.subtotal)}</span>\n                </div>\n                <div class=\"space-y-1\">${rows}</div>\n            </div>`;
        }).join('');

        const files = Number(product.proxy_quantity || 0);
        const grandTotal = files > 0 ? perFileTotal * files : perFileTotal;

        const totalRow = grandTotal > 0 
            ? `<div class="text-xs flex items-center justify-between pt-2 mt-2 border-t border-blue-200">
                    <span class="font-medium text-foreground">Total</span>
                    <span class="font-semibold text-green-700">$${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
               </div>`
            : '';

        return groupHtml + totalRow;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
        
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    formatPrice(value) {
        const n = Number(value);
        if (!isFinite(n)) return '0.00';
        const needsThree = Math.abs(n * 100 - Math.round(n * 100)) > 1e-8 || n < 0.1;
        return needsThree ? n.toFixed(3) : n.toFixed(2);
    }

    ensurePopoverListeners() {
        if (this._popoverInit) return;
        document.addEventListener('click', (e) => {
            if (!e.target.closest('[data-popover-root]')) this.closeAllPopovers();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeAllPopovers();
        });
        this._popoverInit = true;
    }

    togglePopover(id) {
        const el = document.getElementById(id);
        if (!el) return;
        const hidden = el.classList.contains('hidden');
        this.closeAllPopovers();
        if (hidden) el.classList.remove('hidden');
    }

    closeAllPopovers() {
        document.querySelectorAll('.price-popover').forEach(el => el.classList.add('hidden'));
    }
}
