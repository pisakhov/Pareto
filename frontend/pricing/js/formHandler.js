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

    // Offer form
    const offerForm = document.getElementById("offerForm");
    if (offerForm) {
      offerForm.addEventListener("submit", (e) => this.handleOfferSubmit(e));
    }
  }

  setupSelectChangeHandlers() {
    // Provider select change handler
    const providerSelect = document.getElementById("providerSelect");
    if (providerSelect) {
      providerSelect.addEventListener("change", (e) =>
        this.handleProviderSelectChange(e),
      );
    }

    // Item select change handler
    const itemSelect = document.getElementById("itemSelect");
    if (itemSelect) {
      itemSelect.addEventListener("change", (e) =>
        this.handleItemSelectChange(e),
      );
    }
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
        // Update existing provider
        response = await this.dataService.updateProvider(
          editingProviderId,
          providerData,
        );
      } else {
        // Create new provider
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

    const formData = new FormData(event.target);
    const providerIds = Array.from(
      document.getElementById("itemProviders").selectedOptions,
    ).map((opt) => parseInt(opt.value));

    const itemData = {
      item_name: formData.get("item_name"),
      description: formData.get("description") || "",
      status: formData.get("status"),
      provider_ids: providerIds,
    };

    try {
      let response;
      const editingItemId = this.modalManager.getEditingItemId();

      if (editingItemId) {
        // Update existing item
        response = await this.dataService.updateItem(editingItemId, itemData);
      } else {
        // Create new item
        response = await this.dataService.createItem(itemData);
      }

      this.modalManager.closeItemModal();
      await this.loadAllData();
      this.uiManager.showNotification(
        editingItemId
          ? "Item updated successfully"
          : "Item created successfully",
        "success",
      );
    } catch (error) {
      console.error("Error saving item:", error);
      this.uiManager.showNotification(error.message, "error");
    }
  }

  // Offer form operations
  async handleOfferSubmit(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const offerData = {
      item_id: parseInt(formData.get("item_id")),
      provider_id: parseInt(formData.get("provider_id")),
      unit_range: parseInt(formData.get("unit_range")),
      price_per_unit: parseFloat(formData.get("price_per_unit")),
      status: formData.get("status"),
    };

    try {
      let response;
      const editingOfferId = this.modalManager.getEditingOfferId();

      if (editingOfferId) {
        // Update existing offer
        response = await this.dataService.updateOffer(
          editingOfferId,
          offerData,
        );
      } else {
        // Create new offer
        response = await this.dataService.createOffer(offerData);
      }

      this.modalManager.closeOfferModal();
      await this.loadAllData();
      this.uiManager.showNotification(
        editingOfferId
          ? "Offer updated successfully"
          : "Offer created successfully",
        "success",
      );
    } catch (error) {
      console.error("Error saving offer:", error);
      this.uiManager.showNotification(error.message, "error");
    }
  }

  // Select change handlers
  handleProviderSelectChange(event) {
    const select = event.target;
    if (select.value === "new") {
      // Show provider modal for creating new provider
      this.modalManager.closeOfferModal();
      this.modalManager.showProviderModal(() => {
        // After creating provider, reopen offer modal
        setTimeout(() => {
          this.modalManager.showOfferModal();
        }, 100);
      });
    }
  }

  handleItemSelectChange(event) {
    const select = event.target;
    if (select.value === "new") {
      // Show item modal for creating new item
      this.modalManager.closeOfferModal();
      this.modalManager.showItemModal(() => {
        // After creating item, reopen offer modal
        setTimeout(() => {
          this.modalManager.showOfferModal();
        }, 100);
      });
    }
  }

  // Edit form population
  async populateProviderForm(providerId) {
    try {
      const provider = await this.dataService.getProvider(providerId);

      // Populate form
      document.getElementById("providerId").value = provider.provider_id;
      document.getElementById("companyName").value = provider.company_name;
      document.getElementById("details").value = provider.details || "";
      document.getElementById("providerStatus").value = provider.status;

      this.modalManager.setEditingProviderId(providerId);
      this.modalManager.editProvider(providerId);
    } catch (error) {
      console.error("Error loading provider:", error);
      this.uiManager.showNotification("Failed to load provider", "error");
    }
  }

  async populateItemForm(itemId) {
    try {
      const [item, associatedProviderIds] = await Promise.all([
        this.dataService.getItem(itemId),
        this.dataService.getProvidersForItem(itemId),
      ]);

      // Populate form
      document.getElementById("itemId").value = item.item_id;
      document.getElementById("itemName").value = item.item_name;
      document.getElementById("itemDescription").value = item.description || "";
      document.getElementById("itemStatus").value = item.status;

      // Populate provider select
      const allProviders = window.pricingApp.getProviders();
      this.uiManager.updateItemProvidersSelect(
        allProviders,
        associatedProviderIds,
      );

      this.modalManager.setEditingItemId(itemId);
      this.modalManager.editItem(itemId);
    } catch (error) {
      console.error("Error loading item:", error);
      this.uiManager.showNotification("Failed to load item", "error");
    }
  }

  async populateOfferForm(offerId) {
    try {
      const offer = await this.dataService.getOffer(offerId);

      // Populate form
      document.getElementById("offerId").value = offer.offer_id;
      document.getElementById("itemSelect").value = offer.item_id;
      document.getElementById("providerSelect").value = offer.provider_id;
      document.getElementById("unitRange").value = offer.unit_range;
      document.getElementById("pricePerUnit").value = offer.price_per_unit;
      document.getElementById("offerStatus").value = offer.status;

      // Show delete button and set its action
      const deleteBtn = document.getElementById("deleteOfferBtn");
      deleteBtn.classList.remove("hidden");
      deleteBtn.onclick = () => this.deleteOffer(offer.offer_id, deleteBtn);

      this.modalManager.setEditingOfferId(offerId);
      this.modalManager.editOffer(offerId);
    } catch (error) {
      console.error("Error loading offer:", error);
      this.uiManager.showNotification("Failed to load offer", "error");
    }
  }

  // Delete operations
  async deleteProvider(providerId, button) {
    if (
      !confirm(
        "Are you sure you want to delete this provider? This will also delete all associated offers.",
      )
    ) {
      return;
    }

    this.setButtonLoading(button, "Deleting...");

    try {
      await this.dataService.deleteProvider(providerId);
      this.uiManager.showNotification(
        "Provider deleted successfully",
        "success",
      );
      await this.loadAllData();
    } catch (error) {
      console.error("Error deleting provider:", error);
      this.uiManager.showNotification(
        "Failed to delete provider: " + error.message,
        "error",
      );
    } finally {
      this.restoreButton(button, "Delete");
    }
  }

  async deleteItem(itemId, button) {
    if (
      !confirm(
        "Are you sure you want to delete this item? This will also delete all associated offers and relationships.",
      )
    ) {
      return;
    }

    this.setButtonLoading(button, "Deleting...");

    try {
      await this.dataService.deleteItem(itemId);
      this.uiManager.showNotification("Item deleted successfully", "success");
      await this.loadAllData();
    } catch (error) {
      console.error("Error deleting item:", error);
      this.uiManager.showNotification(
        "Failed to delete item: " + error.message,
        "error",
      );
    } finally {
      this.restoreButton(button, "Delete");
    }
  }

  async deleteOffer(offerId, button) {
    if (!confirm("Are you sure you want to delete this offer?")) {
      return;
    }

    this.setButtonLoading(button, "Deleting...");

    try {
      await this.dataService.deleteOffer(offerId);
      this.uiManager.showNotification("Offer deleted successfully", "success");
      this.modalManager.closeOfferModal();
      await this.loadAllData();
    } catch (error) {
      console.error("Error deleting offer:", error);
      this.uiManager.showNotification(
        "Failed to delete offer: " + error.message,
        "error",
      );
    } finally {
      this.restoreButton(button, "Delete");
    }
  }

  async saveRelationships() {
    const checkboxes = document.querySelectorAll(".relationship-checkbox");
    const relationships = [];

    checkboxes.forEach((checkbox) => {
      const providerId = parseInt(checkbox.dataset.providerId);
      const itemId = parseInt(checkbox.dataset.itemId);

      if (checkbox.checked) {
        relationships.push({ provider_id: providerId, item_id: itemId });
      }
    });

    try {
      await this.dataService.saveRelationships(relationships);
      this.modalManager.closeRelationshipModal();
      await this.loadAllData();
      this.uiManager.showNotification(
        "Relationships saved successfully",
        "success",
      );
    } catch (error) {
      console.error("Error saving relationships:", error);
      this.uiManager.showNotification(error.message, "error");
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
    if (window.pricingApp) {
      await window.pricingApp.loadData();
    }
  }
}

// The FormHandler will be instantiated in the main app
// const formHandler = new FormHandler(dataService, modalManager, uiManager);
