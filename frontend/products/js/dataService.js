/**
 * Data Service - Handles all API requests for products and items
 */
const dataService = {
    async loadProducts() {
        try {
            const response = await fetch('/api/products');

            if (!response.ok) {
                let errorMessage = 'Failed to load products';
                let errorDetail = null;

                try {
                    const contentType = response.headers.get('content-type');
                    const responseText = await response.text();

                    if (contentType && contentType.includes('application/json')) {
                        errorDetail = JSON.parse(responseText);
                        errorMessage = errorDetail.detail || errorDetail.message || errorMessage;
                    } else {
                        errorMessage = `Server error (${response.status}): ${responseText.substring(0, 200)}`;
                    }
                } catch (parseError) {
                    errorMessage = `Server returned ${response.status} but response was not valid JSON`;
                }

                throw new Error(errorMessage);
            }

            return await response.json();
        } catch (error) {
            throw error;
        }
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
            let errorMessage = 'Failed to save product';
            let errorDetail = null;

            try {
                const contentType = response.headers.get('content-type');
                const responseText = await response.text();

                if (contentType && contentType.includes('application/json')) {
                    errorDetail = JSON.parse(responseText);
                    errorMessage = errorDetail.detail || errorDetail.message || errorMessage;
                } else {
                    errorMessage = `Server error (${response.status}): ${responseText.substring(0, 200)}`;
                }
            } catch (parseError) {
                errorMessage = `Server returned ${response.status} but response was not valid JSON`;
            }

            throw new Error(errorMessage);
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
        try {
            const response = await fetch(`/api/products/${productId}`);

            if (!response.ok) {
                let errorMessage = 'Failed to load product';
                let errorDetail = null;

                try {
                    const contentType = response.headers.get('content-type');
                    const responseText = await response.text();

                    if (contentType && contentType.includes('application/json')) {
                        errorDetail = JSON.parse(responseText);
                        errorMessage = errorDetail.detail || errorDetail.message || errorMessage;
                    } else {
                        errorMessage = `Server error (${response.status}): ${responseText.substring(0, 200)}`;
                    }
                } catch (parseError) {
                    errorMessage = `Server returned ${response.status} but response was not valid JSON`;
                }

                throw new Error(errorMessage);
            }

            return await response.json();
        } catch (error) {
            throw error;
        }
    },

    async getItemProviders(itemId) {
        const response = await fetch(`/api/items/${itemId}/providers`);
        if (!response.ok) {
            throw new Error('Failed to load providers for item');
        }
        return await response.json();
    },

    async loadProductsPricing() {
        try {
            const response = await fetch('/api/products/pricing-details');

            if (!response.ok) {
                let errorMessage = 'Failed to load products pricing';
                let errorDetail = null;

                try {
                    const contentType = response.headers.get('content-type');
                    const responseText = await response.text();

                    if (contentType && contentType.includes('application/json')) {
                        errorDetail = JSON.parse(responseText);
                        errorMessage = errorDetail.detail || errorDetail.message || errorMessage;
                    } else {
                        errorMessage = `Server error (${response.status}): ${responseText.substring(0, 200)}`;
                    }
                } catch (parseError) {
                    errorMessage = `Server returned ${response.status} but response was not valid JSON`;
                }

                throw new Error(errorMessage);
            }

            return await response.json();
        } catch (error) {
            throw error;
        }
    },
};
