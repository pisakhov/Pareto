/**
 * API Data Service - Handles all API operations for optimization
 */
class ApiDataService {
  constructor() {
    this.basePath = "/api";
  }

  async fetchWithErrorHandling(url, options = {}) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: `Request failed with status ${response.status}` }));
        throw new Error(error.detail || `Request failed with status ${response.status}`);
      }
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error("API Error:", error);
      throw error;
    }
  }

  async getProducts() {
    return this.fetchWithErrorHandling(`${this.basePath}/products`);
  }

  async getProduct(productId) {
    return this.fetchWithErrorHandling(`${this.basePath}/products/${productId}`);
  }

  async getItemsByProduct(productId) {
    return this.fetchWithErrorHandling(`${this.basePath}/products/${productId}/items`);
  }

  async getItem(itemId) {
    return this.fetchWithErrorHandling(`${this.basePath}/items/${itemId}`);
  }

  async getProviders() {
    return this.fetchWithErrorHandling(`${this.basePath}/providers`);
  }

  async calculateOptimization(itemId, quantity) {
    return this.fetchWithErrorHandling(
      `${this.basePath}/optimization/calculate?item_id=${itemId}&quantity=${quantity}`
    );
  }
}

// Create singleton instance
const apiDataService = new ApiDataService();
