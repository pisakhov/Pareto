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
        let errorDetail = `Request failed with status ${response.status}`;
        try {
          const error = await response.json();
          errorDetail = error.detail || JSON.stringify(error);
        } catch (e) {
          const text = await response.text();
          errorDetail = text || errorDetail;
        }
        console.error(`API Error for ${url}:`, errorDetail);
        throw new Error(errorDetail);
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
      console.error("API Error details:", error.message, error);
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

  async deleteOffersForItem(itemId) {
    return this.fetchWithErrorHandling(`${this.basePath}/items/${itemId}/offers`, {
      method: "DELETE",
    });
  }

  // Provider-Item relationship operations
  async loadProviderItems() {
    return this.fetchWithErrorHandling(`${this.basePath}/provider-items`);
  }

  async fetchProviderItemAllocations() {
    const data = await this.fetchWithErrorHandling(`${this.basePath}/providers/allocations`);
    return data.provider_items;
  }
}

// Create singleton instance
const dataService = new DataService();
