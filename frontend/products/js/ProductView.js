/**
 * Product View - Handles product details view modal
 */
class ProductView {
    constructor() {
        this.modalId = 'productViewModal';
    }

    async show(productId) {
        try {
            // Load fresh data to get details
            const product = await dataService.getProduct(productId);
            this.render(product);
            this.openModal();
        } catch (error) {
            console.error('Failed to load product details:', error);
            if (window.Toast) {
                Toast.show('Failed to load product details', 'error');
            } else {
                alert('Failed to load product details');
            }
        }
    }

    render(product) {
        // Populate fields
        const nameEl = document.getElementById('viewProductName');
        if (nameEl) nameEl.textContent = product.name;

        const descEl = document.getElementById('viewProductDescription');
        if (descEl) descEl.textContent = product.description || 'No description provided';
        
        const statusEl = document.getElementById('viewProductStatus');
        if (statusEl) {
            const isActive = product.status === 'active';
            statusEl.textContent = isActive ? 'Active' : 'Inactive';
            statusEl.className = `px-2.5 py-0.5 rounded-full text-xs font-medium border ${isActive ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-700 border-gray-200'}`;
        }

        // Dates
        const createdEl = document.getElementById('viewProductCreated');
        if (createdEl) createdEl.textContent = this.formatDate(product.date_creation);
        
        const updatedEl = document.getElementById('viewProductUpdated');
        if (updatedEl) updatedEl.textContent = this.formatDate(product.date_last_update);
        
        // Stats
        const countEl = document.getElementById('viewProductItemCount');
        if (countEl) countEl.textContent = product.item_ids ? product.item_ids.length : 0;
    }

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    }

    openModal() {
        const modal = document.getElementById(this.modalId);
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }
        
        // Close on Escape
        document.addEventListener('keydown', this.handleEscape);
    }

    close() {
        const modal = document.getElementById(this.modalId);
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
        document.removeEventListener('keydown', this.handleEscape);
    }

    handleEscape = (e) => {
        if (e.key === 'Escape') this.close();
    }
}

// Initialize
const productView = new ProductView();
window.productView = productView;
