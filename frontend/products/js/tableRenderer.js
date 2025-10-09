/**
 * Card Renderer - Handles rendering products as cards in a grid layout
 */
class TableRenderer {
    constructor() {
        this.products = [];
        this.filteredProducts = [];
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
                
                <div class="flex items-center justify-between mb-4 pb-4 border-b border-border">
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
                
                <div class="flex gap-2">
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
}
