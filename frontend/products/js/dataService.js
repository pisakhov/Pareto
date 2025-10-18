/**
 * Data Service - Handles all API requests for products and items
 */
const dataService = {
    async loadProducts() {
        const isDebug = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        if (isDebug) console.log('DEBUG: Starting to load products from API');

        const response = await fetch('/api/products');
        if (isDebug) {
            console.log('DEBUG: Response status:', response.status);
            console.log('DEBUG: Response ok:', response.ok);
        }

        if (!response.ok) {
            if (isDebug) {
                console.error('DEBUG: Response not ok, status:', response.status);
                const errorText = await response.text();
                console.error('DEBUG: Error response body:', errorText);
            }
            throw new Error('Failed to load products');
        }

        const data = await response.json();
        if (isDebug) console.log('DEBUG: Successfully loaded products:', data);
        return data;
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
    }
};
