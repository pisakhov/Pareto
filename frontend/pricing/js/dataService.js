/**
 * Data Service - Handles all API operations for the pricing management system
 */
class DataService {
  constructor() {
    this.basePath = "/api";
  }

  async fetchWithErrorHandling(url, options = {}) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          error.detail || `Request failed with status ${response.status}`,
        );
      }

      // Handle responses without a body
      const contentLength = response.headers.get("Content-Length");
      if (contentLength === "0" || response.status === 204) {
        return null;
      }

      const data = await response.json();
      console.log("API Response Data:", data);
      return data;
    } catch (error) {
      console.error("API Error:", error);
      throw error;
    }
  }

  // Provider operations
  async loadProviders() {
    return this.fetchWithErrorHandling(`${this.basePath}/providers`);
  }

  async getProvider(providerId) {
    return this.fetchWithErrorHandling(
      `${this.basePath}/providers/${providerId}`,
    );
  }

  async createProvider(providerData) {
    return this.fetchWithErrorHandling(`${this.basePath}/providers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(providerData),
    });
  }

  async updateProvider(providerId, providerData) {
    return this.fetchWithErrorHandling(
      `${this.basePath}/providers/${providerId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(providerData),
      },
    );
  }

  async deleteProvider(providerId) {
    return this.fetchWithErrorHandling(
      `${this.basePath}/providers/${providerId}`,
      {
        method: "DELETE",
      },
    );
  }

  // Item operations
  async getProvidersForItem(itemId) {
    return this.fetchWithErrorHandling(
      `${this.basePath}/items/${itemId}/providers`,
    );
  }

  async loadItems() {
    return this.fetchWithErrorHandling(`${this.basePath}/items`);
  }

  async getItem(itemId) {
    return this.fetchWithErrorHandling(`${this.basePath}/items/${itemId}`);
  }

  async createItem(itemData) {
    return this.fetchWithErrorHandling(`${this.basePath}/items`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(itemData),
    });
  }

  async updateItem(itemId, itemData) {
    return this.fetchWithErrorHandling(`${this.basePath}/items/${itemId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(itemData),
    });
  }

  async deleteItem(itemId) {
    return this.fetchWithErrorHandling(`${this.basePath}/items/${itemId}`, {
      method: "DELETE",
    });
  }

  // Offer operations
  async loadOffers() {
    return this.fetchWithErrorHandling(`${this.basePath}/offers`);
  }

  async getOffer(offerId) {
    return this.fetchWithErrorHandling(`${this.basePath}/offers/${offerId}`);
  }

  async createOffer(offerData) {
    return this.fetchWithErrorHandling(`${this.basePath}/offers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(offerData),
    });
  }

  async updateOffer(offerId, offerData) {
    return this.fetchWithErrorHandling(`${this.basePath}/offers/${offerId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(offerData),
    });
  }

  async deleteOffer(offerId) {
    return this.fetchWithErrorHandling(`${this.basePath}/offers/${offerId}`, {
      method: "DELETE",
    });
  }

  // Provider-Item relationship operations
  async loadProviderItems() {
    return this.fetchWithErrorHandling(`${this.basePath}/provider-items`);
  }

  async saveRelationships(relationships) {
    return this.fetchWithErrorHandling(`${this.basePath}/provider-items/bulk`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ relationships }),
    });
  }
}

// Create singleton instance
const dataService = new DataService();
