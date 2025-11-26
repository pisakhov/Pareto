/**
 * Data Service - Pure API communication layer
 */
const dataService = {
    async loadProducts() {
        const response = await fetch('/api/products');
        if (!response.ok) throw new Error(`Failed to load products: ${response.status}`);
        return await response.json();
    },

    async loadItems() {
        const response = await fetch('/api/items');
        if (!response.ok) throw new Error(`Failed to load items: ${response.status}`);
        return await response.json();
    },

    async loadProviders() {
        const response = await fetch('/api/providers');
        if (!response.ok) throw new Error(`Failed to load providers: ${response.status}`);
        return await response.json();
    },

    async getAllContracts() {
        const response = await fetch('/api/contracts');
        if (!response.ok) throw new Error(`Failed to load contracts: ${response.status}`);
        return await response.json();
    },

    async loadProductsPricing() {
        const response = await fetch('/api/products/pricing-details');
        if (!response.ok) throw new Error(`Failed to load pricing: ${response.status}`);
        return await response.json();
    },

    async saveProduct(productData, productId) {
        const url = productId ? `/api/products/${productId}` : '/api/products';
        const method = productId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(productData),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || error.message || `Failed to save product: ${response.status}`);
        }

        return await response.json();
    },

    async deleteProduct(productId) {
        const response = await fetch(`/api/products/${productId}`, { method: 'DELETE' });
        if (!response.ok) throw new Error(`Failed to delete product: ${response.status}`);
        return await response.json();
    },

    async getProduct(productId) {
        const response = await fetch(`/api/products/${productId}`);
        if (!response.ok) throw new Error(`Failed to get product: ${response.status}`);
        return await response.json();
    }
};
