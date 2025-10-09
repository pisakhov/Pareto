/**
 * Modal Manager - Handles showing and hiding modals
 */
const modalManager = {
    showProductModal(isEdit = false) {
        const modal = document.getElementById('productModal');
        const form = document.getElementById('productForm');
        const title = document.getElementById('productModalTitle');

        if (!modal || !form) return;

        if (!isEdit) {
            form.reset();
            window.editingProductId = null;
            title.textContent = 'Add Product';
        }

        modal.classList.remove('hidden');
        modal.classList.add('flex');

        setTimeout(() => {
            document.getElementById('productName')?.focus();
        }, 100);
    },

    closeProductModal() {
        const modal = document.getElementById('productModal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
    },

    setupModalHandlers() {
        document.addEventListener('click', (event) => {
            if (event.target.id === 'productModal') {
                this.closeProductModal();
            }
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                this.closeProductModal();
            }
        });
    },
};
