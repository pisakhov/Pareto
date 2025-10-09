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

        const formData = new FormData(event.target);
        const itemIds = Array.from(formData.getAll('items')).map(id => parseInt(id));

        const data = {
            name: formData.get('name'),
            description: formData.get('description') || '',
            status: formData.get('status'),
            item_ids: itemIds,
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
            console.error('Error saving product:', error);
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

            const itemSelect = document.getElementById('productItems');
            Array.from(itemSelect.options).forEach(option => option.selected = false);
            product.item_ids.forEach(itemId => {
                const option = itemSelect.querySelector(`option[value="${itemId}"]`);
                if (option) {
                    option.selected = true;
                }
            });

            this.modalManager.showProductModal(true);
        } catch (error) {
            console.error('Error loading product:', error);
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
            console.error('Error deleting product:', error);
            this.uiManager.showNotification(error.message, 'error');
        } finally {
            button.textContent = originalText;
            button.disabled = false;
        }
    }
}
