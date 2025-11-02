/**
 * Data Service - Handles all API requests for products and items
 */
const dataService = {
    async loadProducts() {
        const response = await fetch('/api/products');

        if (!response.ok) {
            throw new Error('Failed to load products');
        }

        return await response.json();
    },

    async loadItems() {
        const response = await fetch('/api/items');
        if (!response.ok) throw new Error('Failed to load items');
        return await response.json();
    },

    async loadProviders() {
        const response = await fetch('/api/providers');
        if (!response.ok) throw new Error('Failed to load providers');
        return await response.json();
    },

    async saveProduct(productData, productId) {
        const url = productId ? `/api/products/${productId}` : '/api/products';
        const method = productId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(productData),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to save product');
        }
        return await response.json();
    },

    async deleteProduct(productId) {
        const response = await fetch(`/api/products/${productId}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to delete product');
        }
        return await response.json();
    },

    async getProduct(productId) {
        const response = await fetch(`/api/products/${productId}`);
        if (!response.ok) {
            throw new Error('Failed to load product');
        }
        return await response.json();
    },

    async getItemProviders(itemId) {
        const response = await fetch(`/api/items/${itemId}/providers`);
        if (!response.ok) {
            throw new Error('Failed to load providers for item');
        }
        return await response.json();
    },

    async loadProductsPricing() {
        const response = await fetch('/api/products/pricing-details');
        if (!response.ok) throw new Error('Failed to load products pricing');
        return await response.json();
    },
};
