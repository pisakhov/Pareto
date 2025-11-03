/**
 * Data Service - Handles all API requests for products and items
 */
const dataService = {
    async loadProducts() {
        console.log('[DataService] Loading products from /api/products');

        try {
            const response = await fetch('/api/products');

            console.log('[DataService] Response status:', response.status);
            console.log('[DataService] Response ok:', response.ok);
            console.log('[DataService] Response headers:', response.headers);

            if (!response.ok) {
                let errorMessage = 'Failed to load products';
                let errorDetail = null;

                try {
                    const contentType = response.headers.get('content-type');
                    console.log('[DataService] Response content-type:', contentType);

                    const responseText = await response.text();
                    console.log('[DataService] Response body (raw):', responseText);

                    if (contentType && contentType.includes('application/json')) {
                        errorDetail = JSON.parse(responseText);
                        console.log('[DataService] Parsed error detail:', errorDetail);
                        errorMessage = errorDetail.detail || errorDetail.message || errorMessage;
                    } else {
                        console.log('[DataService] Non-JSON response received');
                        errorMessage = `Server error (${response.status}): ${responseText.substring(0, 200)}`;
                    }
                } catch (parseError) {
                    console.error('[DataService] Error parsing error response:', parseError);
                    errorMessage = `Server returned ${response.status} but response was not valid JSON`;
                }

                throw new Error(errorMessage);
            }

            const result = await response.json();
            console.log('[DataService] Products loaded successfully:', result);
            return result;
        } catch (error) {
            console.error('[DataService] Exception in loadProducts:', error);
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

        console.log('[DataService] Saving product:', {
            url,
            method,
            productData
        });

        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(productData),
        });

        console.log('[DataService] Response status:', response.status);
        console.log('[DataService] Response ok:', response.ok);

        if (!response.ok) {
            let errorMessage = 'Failed to save product';
            let errorDetail = null;

            try {
                const contentType = response.headers.get('content-type');
                console.log('[DataService] Response content-type:', contentType);

                const responseText = await response.text();
                console.log('[DataService] Response body (raw):', responseText);

                if (contentType && contentType.includes('application/json')) {
                    errorDetail = JSON.parse(responseText);
                    console.log('[DataService] Parsed error detail:', errorDetail);
                    errorMessage = errorDetail.detail || errorDetail.message || errorMessage;
                } else {
                    console.log('[DataService] Non-JSON response received');
                    errorMessage = `Server error (${response.status}): ${responseText.substring(0, 200)}`;
                }
            } catch (parseError) {
                console.error('[DataService] Error parsing error response:', parseError);
                errorMessage = `Server returned ${response.status} but response was not valid JSON`;
            }

            throw new Error(errorMessage);
        }

        const result = await response.json();
        console.log('[DataService] Success:', result);
        return result;
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
        console.log('[DataService] Loading product from /api/products/' + productId);

        try {
            const response = await fetch(`/api/products/${productId}`);

            console.log('[DataService] Get product response status:', response.status);
            console.log('[DataService] Get product response ok:', response.ok);

            if (!response.ok) {
                let errorMessage = 'Failed to load product';
                let errorDetail = null;

                try {
                    const contentType = response.headers.get('content-type');
                    console.log('[DataService] Get product response content-type:', contentType);

                    const responseText = await response.text();
                    console.log('[DataService] Get product response body (raw):', responseText);

                    if (contentType && contentType.includes('application/json')) {
                        errorDetail = JSON.parse(responseText);
                        console.log('[DataService] Parsed get product error detail:', errorDetail);
                        errorMessage = errorDetail.detail || errorDetail.message || errorMessage;
                    } else {
                        console.log('[DataService] Non-JSON get product response received');
                        errorMessage = `Server error (${response.status}): ${responseText.substring(0, 200)}`;
                    }
                } catch (parseError) {
                    console.error('[DataService] Error parsing get product error response:', parseError);
                    errorMessage = `Server returned ${response.status} but response was not valid JSON`;
                }

                throw new Error(errorMessage);
            }

            const result = await response.json();
            console.log('[DataService] Product loaded successfully:', result);
            return result;
        } catch (error) {
            console.error('[DataService] Exception in getProduct:', error);
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
        console.log('[DataService] Loading products pricing from /api/products/pricing-details');

        try {
            const response = await fetch('/api/products/pricing-details');

            console.log('[DataService] Pricing response status:', response.status);
            console.log('[DataService] Pricing response ok:', response.ok);

            if (!response.ok) {
                let errorMessage = 'Failed to load products pricing';
                let errorDetail = null;

                try {
                    const contentType = response.headers.get('content-type');
                    console.log('[DataService] Pricing response content-type:', contentType);

                    const responseText = await response.text();
                    console.log('[DataService] Pricing response body (raw):', responseText);

                    if (contentType && contentType.includes('application/json')) {
                        errorDetail = JSON.parse(responseText);
                        console.log('[DataService] Parsed pricing error detail:', errorDetail);
                        errorMessage = errorDetail.detail || errorDetail.message || errorMessage;
                    } else {
                        console.log('[DataService] Non-JSON pricing response received');
                        errorMessage = `Server error (${response.status}): ${responseText.substring(0, 200)}`;
                    }
                } catch (parseError) {
                    console.error('[DataService] Error parsing pricing error response:', parseError);
                    errorMessage = `Server returned ${response.status} but response was not valid JSON`;
                }

                throw new Error(errorMessage);
            }

            const result = await response.json();
            console.log('[DataService] Products pricing loaded successfully');
            return result;
        } catch (error) {
            console.error('[DataService] Exception in loadProductsPricing:', error);
            throw error;
        }
    },
};
