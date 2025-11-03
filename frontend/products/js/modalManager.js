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

            // Reset itemManager
            if (window.itemManager) {
                window.itemManager.reset();
            }

            // Reset forecastManager
            if (window.forecastManager) {
                window.forecastManager.reset();
            }
        }

        modal.classList.remove('hidden');
        modal.classList.add('flex');

        setTimeout(() => {
            document.getElementById('productName')?.focus();
            if (window.chartManager) {
                window.chartManager.initChart();
            }
        }, 100);
    },

    closeProductModal() {
        const modal = document.getElementById('productModal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');

            if (window.itemManager) {
                window.itemManager.reset();
            }

            if (window.contractAdjustments) {
                window.contractAdjustments.renderAdjustments([]);
                window.contractAdjustments.multipliers = {};
            }

            if (window.forecastManager) {
                window.forecastManager.reset();
            }

            if (window.chartManager) {
                window.chartManager.destroyChart();
            }
        }
    },

    showViewModal() {
        const modal = document.getElementById('productViewModal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }
    },

    closeViewModal() {
        const modal = document.getElementById('productViewModal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
    },

    setupModalHandlers() {
        document.addEventListener('click', (event) => {
            if (event.target.id === 'productViewModal') {
                this.closeViewModal();
            }
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                this.closeProductModal();
                this.closeViewModal();
            }
        });
    },
};
