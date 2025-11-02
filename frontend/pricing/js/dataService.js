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

  // Generic CRUD operations
  async create(entityType, data) {
    return this.fetchWithErrorHandling(`${this.basePath}/${entityType}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  }

  async update(entityType, id, data) {
    return this.fetchWithErrorHandling(`${this.basePath}/${entityType}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  }

  async delete(entityType, id) {
    return this.fetchWithErrorHandling(`${this.basePath}/${entityType}/${id}`, {
      method: "DELETE",
    });
  }

  async get(entityType, id) {
    return this.fetchWithErrorHandling(`${this.basePath}/${entityType}/${id}`);
  }

  async load(entityType) {
    return this.fetchWithErrorHandling(`${this.basePath}/${entityType}`);
  }

  // Provider operations
  async loadProviders() {
    return this.load("providers");
  }

  async getProvider(providerId) {
    return this.get("providers", providerId);
  }

  async createProvider(providerData) {
    return this.create("providers", providerData);
  }

  async updateProvider(providerId, providerData) {
    return this.update("providers", providerId, providerData);
  }

  async deleteProvider(providerId) {
    return this.delete("providers", providerId);
  }

  // Item operations
  async getProvidersForItem(itemId) {
    return this.fetchWithErrorHandling(
      `${this.basePath}/items/${itemId}/providers`,
    );
  }

  async loadItems() {
    return this.load("items");
  }

  async getItem(itemId) {
    return this.get("items", itemId);
  }

  async createItem(itemData) {
    return this.create("items", itemData);
  }

  async updateItem(itemId, itemData) {
    return this.update("items", itemId, itemData);
  }

  async deleteItem(itemId) {
    return this.delete("items", itemId);
  }

  // Offer operations
  async loadOffers() {
    return this.load("offers");
  }

  async getOffer(offerId) {
    return this.get("offers", offerId);
  }

  async createOffer(offerData) {
    return this.create("offers", offerData);
  }

  async updateOffer(offerId, offerData) {
    return this.update("offers", offerId, offerData);
  }

  async deleteOffer(offerId) {
    return this.delete("offers", offerId);
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
    return this.load("processes");
  }

  async getProcess(processId) {
    return this.get("processes", processId);
  }

  async createProcess(processData) {
    return this.create("processes", processData);
  }

  async updateProcess(processId, processData) {
    return this.update("processes", processId, processData);
  }

  async deleteProcess(processId) {
    return this.delete("processes", processId);
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
    return this.load("forecasts");
  }

  async getForecastsForProduct(productId) {
    return this.fetchWithErrorHandling(
      `${this.basePath}/forecasts/product/${productId}`,
    );
  }

  async createForecast(forecastData) {
    return this.create("forecasts", forecastData);
  }

  async updateForecast(forecastId, forecastData) {
    return this.update("forecasts", forecastId, forecastData);
  }

  async deleteForecast(forecastId) {
    return this.delete("forecasts", forecastId);
  }

  // Actual operations
  async loadActuals() {
    return this.load("actuals");
  }

  async getActualsForProduct(productId) {
    return this.fetchWithErrorHandling(
      `${this.basePath}/actuals/product/${productId}`,
    );
  }

  async createActual(actualData) {
    return this.create("actuals", actualData);
  }

  async updateActual(actualId, actualData) {
    return this.update("actuals", actualId, actualData);
  }

  async deleteActual(actualId) {
    return this.delete("actuals", actualId);
  }

  // Contract operations
  async loadContracts() {
    return this.load("contracts");
  }

  async getContractsForProvider(providerId) {
    return this.fetchWithErrorHandling(
      `${this.basePath}/contracts/provider/${providerId}`,
    );
  }

  async createContract(contractData) {
    return this.create("contracts", contractData);
  }

  async updateContract(contractId, contractData) {
    return this.update("contracts", contractId, contractData);
  }

  async deleteContract(contractId) {
    return this.delete("contracts", contractId);
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
