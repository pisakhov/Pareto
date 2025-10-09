/**
 * Modal Manager - Handles all modal operations and state management
 */
class ModalManager {
  constructor() {
    this.modals = {
      provider: "providerModal",
      item: "itemModal",
      offer: "offerModal",
      relationship: "relationshipModal",
    };
    this.callbacks = {
      provider: null,
      item: null,
    };
    this.editingStates = {
      providerId: null,
      itemId: null,
      offerId: null,
    };
    this.init();
  }

  init() {
    this.setupGlobalModalHandlers();
  }

  setupGlobalModalHandlers() {
    // Close modals when clicking outside
    document.addEventListener("click", (event) => {
      if (event.target.id === this.modals.provider) {
        this.closeProviderModal();
      }
      if (event.target.id === this.modals.item) {
        this.closeItemModal();
      }
      if (event.target.id === this.modals.offer) {
        this.closeOfferModal();
      }
      if (event.target.id === this.modals.relationship) {
        this.closeRelationshipModal();
      }
    });

    // Close modals with Escape key
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        this.closeAllModals();
      }
    });
  }

  // Generic modal operations
  showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove("hidden");
      modal.classList.add("flex");
    }
  }

  hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add("hidden");
      modal.classList.remove("flex");
    }
  }

  closeAllModals() {
    Object.values(this.modals).forEach((modalId) => {
      this.hideModal(modalId);
    });
  }

  // Provider modal operations
  showProviderModal(callback = null) {
    this.resetProviderForm();
    this.editingStates.providerId = null;
    this.updateModalTitle("providerModalTitle", "Add Provider");
    this.showModal(this.modals.provider);

    // Focus on first input
    setTimeout(() => {
      document.getElementById("companyName")?.focus();
    }, 100);

    // Set callback for after modal closes
    if (callback) {
      this.callbacks.provider = callback;
    }
  }

  closeProviderModal() {
    this.hideModal(this.modals.provider);

    // Execute callback if exists
    if (this.callbacks.provider) {
      this.callbacks.provider();
      this.callbacks.provider = null;
    }
  }

  // Item modal operations
  showItemModal(callback = null) {
    this.resetItemForm();
    this.editingStates.itemId = null;
    this.updateModalTitle("itemModalTitle", "Add Item");

    // Populate provider select
    const allProviders = window.pricingApp.getProviders();
    window.uiManager.updateItemProvidersSelect(allProviders);

    this.showModal(this.modals.item);

    // Focus on first input
    setTimeout(() => {
      document.getElementById("itemName")?.focus();
    }, 100);

    // Set callback for after modal closes
    if (callback) {
      this.callbacks.item = callback;
    }
  }

  closeItemModal() {
    this.hideModal(this.modals.item);

    // Execute callback if exists
    if (this.callbacks.item) {
      this.callbacks.item();
      this.callbacks.item = null;
    }
  }

  // Offer modal operations
  showOfferModal() {
    this.resetOfferForm();
    this.editingStates.offerId = null;
    this.updateModalTitle("offerModalTitle", "Add Offer");
    document.getElementById("deleteOfferBtn").classList.add("hidden");
    this.showModal(this.modals.offer);

    // Focus on first input
    setTimeout(() => {
      document.getElementById("providerSelect")?.focus();
    }, 100);
  }

  closeOfferModal() {
    this.hideModal(this.modals.offer);
    document.getElementById("deleteOfferBtn").classList.add("hidden");
  }

  // Relationship modal operations
  showRelationshipModal() {
    this.showModal(this.modals.relationship);
  }

  closeRelationshipModal() {
    this.hideModal(this.modals.relationship);
  }

  // Edit mode operations
  editProvider(providerId) {
    this.editingStates.providerId = providerId;
    this.updateModalTitle("providerModalTitle", "Edit Provider");
    this.showModal(this.modals.provider);
  }

  editItem(itemId) {
    this.editingStates.itemId = itemId;
    this.updateModalTitle("itemModalTitle", "Edit Item");
    this.showModal(this.modals.item);
  }

  editOffer(offerId) {
    this.editingStates.offerId = offerId;
    this.updateModalTitle("offerModalTitle", "Edit Offer");
    this.showModal(this.modals.offer);
  }

  // Form reset operations
  resetProviderForm() {
    const form = document.getElementById("providerForm");
    if (form) form.reset();
  }

  resetItemForm() {
    const form = document.getElementById("itemForm");
    if (form) form.reset();
  }

  resetOfferForm() {
    const form = document.getElementById("offerForm");
    if (form) form.reset();
  }

  // Helper functions
  updateModalTitle(titleId, title) {
    const titleElement = document.getElementById(titleId);
    if (titleElement) {
      titleElement.textContent = title;
    }
  }

  // Getters for editing states
  getEditingProviderId() {
    return this.editingStates.providerId;
  }

  getEditingItemId() {
    return this.editingStates.itemId;
  }

  getEditingOfferId() {
    return this.editingStates.offerId;
  }

  // Setters for editing states
  setEditingProviderId(providerId) {
    this.editingStates.providerId = providerId;
  }

  setEditingItemId(itemId) {
    this.editingStates.itemId = itemId;
  }

  setEditingOfferId(offerId) {
    this.editingStates.offerId = offerId;
  }
}

// Create singleton instance
const modalManager = new ModalManager();
