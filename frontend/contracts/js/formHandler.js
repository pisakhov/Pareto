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

      // Provider status toggle
      const statusToggle = document.getElementById("providerStatusToggle");
      if (statusToggle) {
        statusToggle.addEventListener("change", (e) => {
          const statusInput = document.getElementById("providerStatus");
          const statusLabel = document.getElementById("providerStatusLabel");

          if (e.target.checked) {
            statusInput.value = "active";
            statusLabel.textContent = "Active";
          } else {
            statusInput.value = "inactive";
            statusLabel.textContent = "Inactive";
          }
        });
      }
    }

    // Item form
    const itemForm = document.getElementById("itemForm");
    if (itemForm) {
      itemForm.addEventListener("submit", (e) => this.handleItemSubmit(e));

      // Item status toggle
      const statusToggle = document.getElementById("itemStatusToggle");
      if (statusToggle) {
        statusToggle.addEventListener("change", (e) => {
          const statusInput = document.getElementById("itemStatus");
          const statusLabel = document.getElementById("itemStatusLabel");

          if (e.target.checked) {
            statusInput.value = "active";
            statusLabel.textContent = "Active";
          } else {
            statusInput.value = "inactive";
            statusLabel.textContent = "Inactive";
          }
        });
      }
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

    const editingProviderId = this.modalManager.getEditingProviderId();

    if (editingProviderId) {
      await this.dataService.updateProvider(editingProviderId, providerData);
    } else {
      await this.dataService.createProvider(providerData);
    }

    this.modalManager.closeProviderModal();
    await this.loadAllData();
    Toast.show(
      editingProviderId
        ? "Provider updated successfully"
        : "Provider created successfully",
      "success",
    );
  }

  // Item form operations
  async handleItemSubmit(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const offers = window.offerManager.getOfferData();
    const providerIds = offers.map(o => o.provider_id).filter((v, i, a) => a.indexOf(v) === i);

    const processSelect = document.getElementById("itemProcess");
    let processId = null;

    if (processSelect) {
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

    const editingItemId = this.modalManager.getEditingItemId();

    let response;
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
    Toast.show(
      editingItemId ? "Item updated successfully" : "Item created successfully",
      "success",
    );
  }


  // Edit form population
  async populateProviderForm(providerId) {
    const provider = await this.dataService.getProvider(providerId);

    document.getElementById("providerId").value = provider["provider_id"];
    document.getElementById("companyName").value = provider["company_name"];
    document.getElementById("details").value = provider["details"] || "";

    const statusToggle = document.getElementById("providerStatusToggle");
    const statusInput = document.getElementById("providerStatus");
    const statusLabel = document.getElementById("providerStatusLabel");

    const isActive = provider["status"] === "active";
    statusToggle.checked = isActive;
    statusInput.value = provider["status"];
    statusLabel.textContent = isActive ? "Active" : "Inactive";

    this.modalManager.setEditingProviderId(providerId);
    this.modalManager.editProvider(providerId);
  }

  async populateItemForm(itemId) {
    const item = await this.dataService.getItem(itemId);
    const offers = await this.dataService.loadOffers();

    const itemOffers = offers.filter(offer => offer.item_id === itemId);
    const processId = itemOffers.length > 0 ? itemOffers[0].process_id : null;



    document.getElementById("itemId").value = item["item_id"];
    document.getElementById("itemName").value = item["item_name"];
    document.getElementById("itemDescription").value = item["description"] || "";

    // Update status toggle
    const statusToggle = document.getElementById("itemStatusToggle");
    const statusInput = document.getElementById("itemStatus");
    const statusLabel = document.getElementById("itemStatusLabel");

    if (statusToggle && statusInput && statusLabel) {
      const isActive = item["status"] === "active";
      statusToggle.checked = isActive;
      statusInput.value = item["status"];
      statusLabel.textContent = isActive ? "Active" : "Inactive";
    }
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


      }, 50);
    }
  }


  // Generic delete operation
  async deleteEntity(entityId, button, entityType, deleteFn, confirmMessage, successMessage) {
    if (!confirm(confirmMessage)) {
      return false;
    }

    this.setButtonLoading(button, "Deleting...");
    try {
      await deleteFn(entityId);
      Toast.show(successMessage, "success");
      await this.loadAllData();
    } finally {
      this.restoreButton(button, "Delete");
    }
    return true;
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

  async deleteItemFromModal() {
    const itemId = document.getElementById("itemId").value;
    if (!itemId) return;

    const deleteButton = document.getElementById("itemDeleteBtn");
    const result = await this.deleteItem(itemId, deleteButton);

    if (result) {
      // Close modal on successful delete
      this.modalManager.closeItemModal();
    }
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
