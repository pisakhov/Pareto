/**
 * Form Handler - Manages all form submissions and validation
 */
class FormHandler {
  constructor(dataService, modalManager, uiManager) {
    this.dataService = dataService;
    this.modalManager = modalManager;
    this.uiManager = uiManager;
    this.init();
  }

  init() {
    this.setupFormHandlers();
    this.setupSelectChangeHandlers();
  }

  setupFormHandlers() {
    // Provider form
    const providerForm = document.getElementById("providerForm");
    if (providerForm) {
      providerForm.addEventListener("submit", (e) =>
        this.handleProviderSubmit(e),
      );
    }

    // Item form
    const itemForm = document.getElementById("itemForm");
    if (itemForm) {
      itemForm.addEventListener("submit", (e) => this.handleItemSubmit(e));
    }

  }

  setupSelectChangeHandlers() {
    // No longer needed for offer modal
  }

  // Provider form operations
  async handleProviderSubmit(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const providerData = {
      company_name: formData.get("company_name"),
      details: formData.get("details") || "",
      status: formData.get("status"),
    };

    try {
      let response;
      const editingProviderId = this.modalManager.getEditingProviderId();

      if (editingProviderId) {
        response = await this.dataService.updateProvider(
          editingProviderId,
          providerData,
        );
      } else {
        response = await this.dataService.createProvider(providerData);
      }

      this.modalManager.closeProviderModal();
      await this.loadAllData();
      this.uiManager.showNotification(
        editingProviderId
          ? "Provider updated successfully"
          : "Provider created successfully",
        "success",
      );
    } catch (error) {
      console.error("Error saving provider:", error);
      this.uiManager.showNotification(error.message, "error");
    }
  }

  // Item form operations
  async handleItemSubmit(event) {
    event.preventDefault();

    if (!window.offerManager.validateAllTiers()) {
      return;
    }

    const formData = new FormData(event.target);
    const offers = window.offerManager.getOfferData();
    const providerIds = offers.map(o => o.provider_id).filter((v, i, a) => a.indexOf(v) === i);

    // Get process_id from the form element directly (not from FormData)
    // This is necessary because disabled fields don't get submitted via FormData
    const processSelect = document.getElementById("itemProcess");
    let processId = null;

    if (processSelect) {
      // If the field is disabled (locked in edit mode), get value from DOM
      // Otherwise, get from FormData
      if (processSelect.disabled) {
        processId = parseInt(processSelect.value);
      } else {
        processId = parseInt(formData.get("process_id"));
      }
    }

    const itemData = {
      item_name: formData.get("item_name"),
      description: formData.get("description") || "",
      status: formData.get("status"),
      process_id: processId,
      provider_ids: providerIds,
    };

    try {
      let response;
      const editingItemId = this.modalManager.getEditingItemId();

      if (editingItemId) {
        response = await this.dataService.updateItem(editingItemId, itemData);
        await this.dataService.deleteOffersForItem(editingItemId);
      } else {
        response = await this.dataService.createItem(itemData);
      }

      const itemId = editingItemId || response.item_id;

      for (const offer of offers) {
        await this.dataService.createOffer({
          item_id: itemId,
          process_id: itemData.process_id,
          ...offer
        });
      }

      this.modalManager.closeItemModal();
      await this.loadAllData();
      this.uiManager.showNotification(
        editingItemId ? "Item updated successfully" : "Item created successfully",
        "success",
      );
    } catch (error) {
      console.error("Error saving item:", error);
      this.uiManager.showNotification(error.message, "error");
    }
  }


  // Edit form population
  async populateProviderForm(providerId) {
    try {
      const provider = await this.dataService.getProvider(providerId);

      document.getElementById("providerId").value = provider["provider_id"];
      document.getElementById("companyName").value = provider["company_name"];
      document.getElementById("details").value = provider["details"] || "";
      document.getElementById("providerStatus").value = provider["status"];

      this.modalManager.setEditingProviderId(providerId);
      this.modalManager.editProvider(providerId);
    } catch (error) {
      console.error("Error loading provider:", error);
      this.uiManager.showNotification("Failed to load provider", "error");
    }
  }

  async populateItemForm(itemId) {
    const item = await this.dataService.getItem(itemId);
    const offers = await this.dataService.getAllOffers();

    const itemOffers = offers.filter(offer => offer.item_id === itemId);
    const processId = itemOffers.length > 0 ? itemOffers[0].process_id : null;

    console.log('[FormHandler] Editing item:', itemId, 'Process ID:', processId);
    console.log('[FormHandler] Item details:', item);

    document.getElementById("itemId").value = item["item_id"];
    document.getElementById("itemName").value = item["item_name"];
    document.getElementById("itemDescription").value = item["description"] || "";
    document.getElementById("itemStatus").value = item["status"];
    // DON'T set process here - editItem() will do it after loading options

    this.modalManager.setEditingItemId(itemId);
    await this.modalManager.editItem(itemId);

    // Disable the process field after editItem() has set its value
    const processSelect = document.getElementById("itemProcess");
    if (processSelect) {
      // Small delay to ensure dropdown is fully loaded and value is set
      setTimeout(() => {
        processSelect.disabled = true;
        processSelect.classList.add("bg-gray-100", "cursor-not-allowed");

        // Update label to show it's locked
        const processLabel = processSelect.previousElementSibling;
        if (processLabel && processLabel.tagName === 'LABEL') {
          processLabel.innerHTML = 'Process * <span class="text-xs text-amber-600 ml-1">(locked)</span>';
        }

        console.log('[FormHandler] Process field disabled - value:', processSelect.value);
      }, 50);
    }
  }


  // Generic delete operation
  async deleteEntity(entityId, button, entityType, deleteFn, confirmMessage, successMessage) {
    if (!confirm(confirmMessage)) {
      return;
    }

    this.setButtonLoading(button, "Deleting...");

    try {
      await deleteFn(entityId);
      this.uiManager.showNotification(successMessage, "success");
      await this.loadAllData();
    } catch (error) {
      console.error(`Error deleting ${entityType}:`, error);
      this.uiManager.showNotification(
        `Failed to delete ${entityType}: ${error.message}`,
        "error",
      );
    } finally {
      this.restoreButton(button, "Delete");
    }
  }

  // Delete operations
  async deleteProvider(providerId, button) {
    return this.deleteEntity(
      providerId,
      button,
      "provider",
      this.dataService.deleteProvider.bind(this.dataService),
      "Are you sure you want to delete this provider? This will also delete all associated offers.",
      "Provider deleted successfully"
    );
  }

  async deleteItem(itemId, button) {
    return this.deleteEntity(
      itemId,
      button,
      "item",
      this.dataService.deleteItem.bind(this.dataService),
      "Are you sure you want to delete this item? This will also delete all associated offers and relationships.",
      "Item deleted successfully"
    );
  }

  // Helper functions
  setButtonLoading(button, loadingText) {
    button.textContent = loadingText;
    button.disabled = true;
  }

  restoreButton(button, originalText) {
    button.textContent = originalText;
    button.disabled = false;
  }

  async loadAllData() {
    // This will be implemented by the main app
    if (window.contractsApp) {
      await window.contractsApp.loadData();
    }
  }
}

// The FormHandler will be instantiated in the main app
// const formHandler = new FormHandler(dataService, modalManager, uiManager);
