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
        const card = document.createElement('div');
        card.className = 'bg-card border rounded-lg overflow-hidden hover:shadow-lg transition-shadow duration-200';
        
        const statusBadgeClass = product.status === 'active' 
            ? 'bg-green-100 text-green-800' 
            : 'bg-gray-100 text-gray-800';
        
        const truncatedDesc = product.description.length > 100 
            ? product.description.substring(0, 100) + '...' 
            : product.description;

        card.innerHTML = `
            <div class="p-6">
                <div class="flex items-start justify-between mb-3">
                    <h3 class="text-lg font-semibold text-foreground line-clamp-2 flex-1">${this.escapeHtml(product.name)}</h3>
                    <span class="ml-2 px-2 py-1 text-xs rounded-full ${statusBadgeClass} whitespace-nowrap">
                        ${product.status}
                    </span>
                </div>
                
                <p class="text-sm text-muted-foreground mb-4 line-clamp-3 min-h-[3rem]">
                    ${this.escapeHtml(truncatedDesc) || 'No description provided'}
                </p>
                
                <div class="flex flex-col gap-2 mb-4 pb-4 border-b border-border">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center text-sm text-muted-foreground">
                            <svg class="w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                            </svg>
                            <span class="font-medium text-foreground">${product.item_ids.length}</span>
                            <span class="ml-1">${product.item_ids.length === 1 ? 'item' : 'items'}</span>
                        </div>
                        <div class="text-xs text-muted-foreground">
                            ${this.formatDate(product.date_last_update)}
                        </div>
                    </div>
                    ${product.proxy_quantity > 0 ? `
                        <details class="text-sm">
                            <summary class="flex items-center cursor-pointer hover:text-blue-600 transition-colors list-none">
                                <svg class="w-4 h-4 mr-1 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                                <span class="text-muted-foreground">Est. Files:</span>
                                <span class="ml-1 font-semibold text-blue-600">${product.proxy_quantity.toLocaleString()}</span>
                                <svg class="w-3 h-3 ml-1 text-muted-foreground transition-transform details-chevron" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                                </svg>
                            </summary>
                            <div class="mt-2 ml-5 pl-3 border-l-2 border-blue-200 space-y-1">
                                ${this.getItemBreakdown(product)}
                            </div>
                        </details>
                    ` : ''}
                </div>
                
                <div class="flex gap-2">
                    <button onclick="window.formHandler.viewProduct(${product.product_id})"
                            class="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 h-9 px-3 border border-input bg-background hover:bg-accent hover:text-accent-foreground"
                            aria-label="View ${this.escapeHtml(product.name)}">
                        <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                    </button>
                    <button onclick="window.formHandler.editProduct(${product.product_id})"
                            class="flex-1 inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 h-9 px-3 border border-input bg-background hover:bg-accent hover:text-accent-foreground"
                            aria-label="Edit ${this.escapeHtml(product.name)}">
                        <svg class="w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                    </button>
                    <button onclick="window.formHandler.deleteProduct(${product.product_id}, this)"
                            class="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 h-9 px-3 text-destructive hover:bg-destructive/10"
                            aria-label="Delete ${this.escapeHtml(product.name)}">
                        <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </div>
            </div>
        `;
        
        return card;
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
