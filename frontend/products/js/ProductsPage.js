/**
 * Products Page - Handles product listing, cards, and filtering
 * Combines: productsApp, tableRenderer, uiManager
 */

class ProductGrid {
    constructor() {
        this.products = [];
        this.filteredProducts = [];
        this.data = {
            items: [],
            contracts: [],
            providers: [],
            pricing: {}
        };
        this.itemProcessMap = new Map();
    }

    setData(products, data) {
        this.products = products;
        this.filteredProducts = products;
        this.data = data || { items: [], contracts: [], providers: [], pricing: {} };
        
        // Pre-compute item -> process mapping for O(1) lookup
        this.itemProcessMap.clear();
        this.data.contracts.forEach(c => {
            if (c.items) {
                c.items.forEach(i => {
                    this.itemProcessMap.set(i.item_id, { id: c.process_id, name: c.process_name });
                });
            }
        });
    }

    filter(searchTerm, statusFilter) {
        const lowerSearch = searchTerm ? searchTerm.toLowerCase() : '';
        this.filteredProducts = this.products.filter(p => {
            const matchesSearch = !lowerSearch ||
                p.name.toLowerCase().includes(lowerSearch) ||
                (p.description && p.description.toLowerCase().includes(lowerSearch));
            const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
        this.render();
    }

    render() {
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

        // Create fragment for better performance
        const fragment = document.createDocumentFragment();
        this.filteredProducts.forEach(product => {
            fragment.appendChild(this.createCard(product));
        });
        grid.appendChild(fragment);

        this.updateCount();
    }

    createCard(product) {
        const isActive = product.status === 'active';
        const card = document.createElement('div');
        card.className = `bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-xl hover:border-[#fb923c]/30 transition-all duration-300 ${!isActive ? 'opacity-70' : ''}`;

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
                            <h3 class="font-semibold text-slate-900 text-lg ${!isActive ? 'line-through text-slate-500' : ''}">${this.escapeHtml(product.name || 'Untitled Product')}</h3>
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
                <div class="space-y-2">
                    <h4 class="text-xs font-semibold text-slate-700 uppercase tracking-wider">Processes & Items</h4>
                    ${processInfo}
                </div>

                <div class="pt-3 border-t border-slate-200">
                    <div class="flex items-center justify-between">
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
                </div>

                <div class="flex items-center gap-2 pt-2">
                    <button onclick="productsPage.editProduct(${product.product_id})"
                            class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#fb923c] bg-[#fb923c]/10 hover:bg-[#fb923c]/20 border border-[#fb923c]/30 hover:border-[#fb923c]/50 rounded-lg transition-all"
                            title="Edit Product">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" class="w-3.5 h-3.5">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                        </svg>
                        <span>Edit</span>
                    </button>
                    <button onclick="productsPage.deleteProduct(${product.product_id}, this)"
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
        if (!product.item_ids?.length) {
            return '<p class="text-xs text-slate-500 italic">No processes assigned</p>';
        }

        const productProcesses = new Map(); // processId -> {name, count}
        
        product.item_ids.forEach(itemId => {
            const process = this.itemProcessMap.get(itemId);
            if (process) {
                if (!productProcesses.has(process.id)) {
                    productProcesses.set(process.id, { name: process.name, count: 0 });
                }
                productProcesses.get(process.id).count++;
            }
        });

        return Array.from(productProcesses.values())
            .map(process => `
                <div class="bg-slate-50 rounded-lg p-3 border border-slate-200">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center">
                            <div class="w-2 h-2 rounded-full bg-[#fb923c] mr-2"></div>
                            <span class="text-sm font-semibold text-slate-800">${this.escapeHtml(process.name)}</span>
                        </div>
                        <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#fb923c]/10 text-[#fb923c] border border-[#fb923c]/20">
                            ${process.count} ${process.count === 1 ? 'item' : 'items'}
                        </span>
                    </div>
                </div>
            `).join('');
    }

    updateCount() {
        const countEl = document.getElementById('productCount');
        if (countEl) {
            const count = this.filteredProducts.length;
            const total = this.products.length;
            countEl.textContent = count === total ? total : `${count} of ${total}`;
        }
    }

    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';
        
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

const productsPage = {
    grid: new ProductGrid(),
    data: { products: [], items: [], contracts: [], providers: [], pricing: {} },

    async init() {
        this.setupHandlers();
        await this.refresh();
    },

    async refresh() {
        try {
            const [products, contracts, providers, pricing, items] = await Promise.all([
                dataService.loadProducts(),
                dataService.getAllContracts(),
                dataService.loadProviders(),
                dataService.loadProductsPricing(),
                dataService.loadItems()
            ]);

            this.data = { products, contracts, providers, pricing, items };
            this.grid.setData(products, this.data);
            
            // Re-apply active filters
            const searchTerm = document.getElementById('searchInput')?.value || '';
            const statusFilter = document.getElementById('statusFilter')?.value || 'all';
            this.grid.filter(searchTerm, statusFilter);
        } catch (error) {
            Toast.show('Error loading data: ' + error.message, 'error');
        }
    },

    setupHandlers() {
        document.getElementById('addProductButton')?.addEventListener('click', () => {
            productModal.show();
        });

        document.getElementById('searchInput')?.addEventListener('input', (e) => {
            const statusFilter = document.getElementById('statusFilter')?.value || 'all';
            this.grid.filter(e.target.value, statusFilter);
        });

        document.getElementById('statusFilter')?.addEventListener('change', (e) => {
            const searchTerm = document.getElementById('searchInput')?.value || '';
            this.grid.filter(searchTerm, e.target.value);
        });
    },

    async editProduct(productId) {
        await productModal.editProduct(productId);
    },

    async deleteProduct(productId, button) {
        if (!confirm('Are you sure you want to delete this product?')) return;

        const originalText = button.textContent;
        button.textContent = 'Deleting...';
        button.disabled = true;

        try {
            await dataService.deleteProduct(productId);
            await this.refresh();
            Toast.show('Product deleted successfully', 'success');
        } catch (error) {
            Toast.show(error.message, 'error');
        } finally {
            button.textContent = originalText;
            button.disabled = false;
        }
    }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    window.productsPage = productsPage;
    productsPage.init();
});