/**
 * Data Service - Handles all API operations for the pricing management system
 */
class DataService {
  constructor() {
    this.basePath = "/api";
  }

  async fetchWithErrorHandling(url, options = {}) {
    console.log('[FETCH] ========================================');
    console.log('[FETCH] Request URL:', url);
    console.log('[FETCH] Request Method:', options.method || 'GET');
    console.log('[FETCH] Request Headers:', options.headers);
    console.log('[FETCH] Request Body:', options.body);
    console.log('[FETCH] ========================================');

    try {
      const response = await fetch(url, options);
      console.log('[FETCH] Response received:');
      console.log('  - Status:', response.status, response.statusText);
      console.log('  - OK:', response.ok);
      console.log('  - Headers:', Object.fromEntries(response.headers.entries()));

      // Handle responses without a body
      const contentLength = response.headers.get("Content-Length");
      if (contentLength === "0" || response.status === 204) {
        console.log('[FETCH] Empty response (204 or Content-Length: 0)');
        return null;
      }

      // Check status first to avoid "body stream already read" errors
      if (!response.ok) {
        console.log('[FETCH] ❌ Response not OK, status:', response.status);
        // Try to read error details, but don't fail if we can't
        let errorDetail = `Request failed with status ${response.status}`;
        try {
          const data = await response.json();
          console.log('[FETCH] Error response JSON:', data);
          if (data && typeof data === 'object' && data.detail) {
            errorDetail = data.detail;
          }
        } catch (e) {
          console.log('[FETCH] Failed to parse error JSON:', e.message);
          // If JSON parsing fails, try to get text
          try {
            const text = await response.text();
            console.log('[FETCH] Error response text:', text);
            if (text) {
              errorDetail = text;
            }
          } catch (textError) {
            console.log('[FETCH] Failed to read error text:', textError.message);
            // If both fail, use the default errorDetail
          }
        }
        console.error(`[FETCH] ❌ API Error for ${url}:`, errorDetail);
        throw new Error(errorDetail);
      }

      // Read the response body once - only if response is OK
      let data;
      try {
        data = await response.json();
        console.log('[FETCH] ✓ Response JSON:', data);
      } catch (e) {
        console.log('[FETCH] Failed to parse JSON, trying text...');
        data = await response.text();
        console.log('[FETCH] ✓ Response text:', data);
      }

      console.log('[FETCH] ✓ Request successful, returning data');
      return data;
    } catch (error) {
      console.error('[FETCH] ❌ Network/Request Error:');
      console.error('  - Error name:', error.name);
      console.error('  - Error message:', error.message);
      console.error('  - Error stack:', error.stack);
      throw error;
    } finally {
      console.log('[FETCH] ========================================');
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
    console.log('[DATASERVICE] update called:', { entityType, id, data });
    const url = `${this.basePath}/${entityType}/${id}`;
    console.log('[DATASERVICE] Making PUT request to:', url);
    const result = await this.fetchWithErrorHandling(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    console.log('[DATASERVICE] Update result:', result);
    return result;
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

  async getAllOffers() {
    return this.loadOffers();
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
