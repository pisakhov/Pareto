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

      // Handle responses without a body
      const contentLength = response.headers.get("Content-Length");
      if (contentLength === "0" || response.status === 204) {
        return null;
      }

      // Read the response body once
      let data;
      try {
        data = await response.json();
      } catch (e) {
        data = await response.text();
      }

      if (!response.ok) {
        let errorDetail = `Request failed with status ${response.status}`;
        if (data && typeof data === 'object' && data.detail) {
          errorDetail = data.detail;
        } else if (data && typeof data === 'string') {
          errorDetail = data;
        }
        console.error(`API Error for ${url}:`, errorDetail);
        throw new Error(errorDetail);
      }

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

  // =====================================
  // NEW SCHEMA ENTITY OPERATIONS
  // =====================================

  // Process operations
  async loadProcesses() {
    return this.fetchWithErrorHandling(`${this.basePath}/processes`);
  }

  async getProcess(processId) {
    return this.fetchWithErrorHandling(`${this.basePath}/processes/${processId}`);
  }

  async createProcess(processData) {
    return this.fetchWithErrorHandling(`${this.basePath}/processes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(processData),
    });
  }

  async updateProcess(processId, processData) {
    return this.fetchWithErrorHandling(`${this.basePath}/processes/${processId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(processData),
    });
  }

  async deleteProcess(processId) {
    return this.fetchWithErrorHandling(`${this.basePath}/processes/${processId}`, {
      method: "DELETE",
    });
  }

  // Process Graph operations
  async loadProcessGraph() {
    const result = await this.fetchWithErrorHandling(`${this.basePath}/process-graph`);
    return result;
  }

  async addProcessEdge(fromProcessId, toProcessId) {
    return this.fetchWithErrorHandling(`${this.basePath}/process-graph?from_process_id=${fromProcessId}&to_process_id=${toProcessId}`, {
      method: "POST",
    });
  }

  async removeProcessEdge(fromProcessId, toProcessId) {
    return this.fetchWithErrorHandling(`${this.basePath}/process-graph?from_process_id=${fromProcessId}&to_process_id=${toProcessId}`, {
      method: "DELETE",
    });
  }

  // Forecast operations
  async loadForecasts() {
    return this.fetchWithErrorHandling(`${this.basePath}/forecasts`);
  }

  async getForecastsForProduct(productId) {
    return this.fetchWithErrorHandling(
      `${this.basePath}/forecasts/product/${productId}`,
    );
  }

  async createForecast(forecastData) {
    return this.fetchWithErrorHandling(`${this.basePath}/forecasts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(forecastData),
    });
  }

  async updateForecast(forecastId, forecastData) {
    return this.fetchWithErrorHandling(`${this.basePath}/forecasts/${forecastId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(forecastData),
    });
  }

  async deleteForecast(forecastId) {
    return this.fetchWithErrorHandling(`${this.basePath}/forecasts/${forecastId}`, {
      method: "DELETE",
    });
  }

  // Actual operations
  async loadActuals() {
    return this.fetchWithErrorHandling(`${this.basePath}/actuals`);
  }

  async getActualsForProduct(productId) {
    return this.fetchWithErrorHandling(
      `${this.basePath}/actuals/product/${productId}`,
    );
  }

  async createActual(actualData) {
    return this.fetchWithErrorHandling(`${this.basePath}/actuals`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(actualData),
    });
  }

  async updateActual(actualId, actualData) {
    return this.fetchWithErrorHandling(`${this.basePath}/actuals/${actualId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(actualData),
    });
  }

  async deleteActual(actualId) {
    return this.fetchWithErrorHandling(`${this.basePath}/actuals/${actualId}`, {
      method: "DELETE",
    });
  }

  // Contract operations
  async loadContracts() {
    return this.fetchWithErrorHandling(`${this.basePath}/contracts`);
  }

  async getContractsForProvider(providerId) {
    return this.fetchWithErrorHandling(
      `${this.basePath}/contracts/provider/${providerId}`,
    );
  }

  async createContract(contractData) {
    return this.fetchWithErrorHandling(`${this.basePath}/contracts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(contractData),
    });
  }

  async updateContract(contractId, contractData) {
    return this.fetchWithErrorHandling(`${this.basePath}/contracts/${contractId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(contractData),
    });
  }

  async deleteContract(contractId) {
    return this.fetchWithErrorHandling(`${this.basePath}/contracts/${contractId}`, {
      method: "DELETE",
    });
  }

  async addContractRule(contractId, ruleData) {
    return this.fetchWithErrorHandling(
      `${this.basePath}/contracts/${contractId}/rules`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(ruleData),
      },
    );
  }

  async getContractRules(contractId) {
    return this.fetchWithErrorHandling(
      `${this.basePath}/contracts/${contractId}/rules`,
    );
  }

  async deleteContractRule(contractId, ruleType) {
    return this.fetchWithErrorHandling(
      `${this.basePath}/contracts/${contractId}/rules/${ruleType}`,
      {
        method: "DELETE",
      },
    );
  }
}

// Create singleton instance
const dataService = new DataService();
