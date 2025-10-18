/**
 * Modal Manager - Handles all modal operations and state management
 */
class ModalManager {
  constructor() {
    this.modals = {
      provider: "providerModal",
      item: "itemModal",
    };
    this.callbacks = {
      provider: null,
      item: null,
    };
    this.editingStates = {
      providerId: null,
      itemId: null,
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
    
    window.tierManager.clearTiers();
    window.tierManager.addTierRow(1, 0, 0);
    
    this.showModal(this.modals.provider);

    setTimeout(() => {
      document.getElementById("companyName")?.focus();
    }, 100);

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

    const allProviders = window.pricingApp.getProviders();
    if (window.offerManager) {
      window.offerManager.setProviders(allProviders);
      window.offerManager.reset();
    }

    this.showModal(this.modals.item);

    setTimeout(() => {
      document.getElementById("itemName")?.focus();
    }, 100);

    if (callback) {
      this.callbacks.item = callback;
    }
  }

  closeItemModal() {
    this.hideModal(this.modals.item);

    if (window.offerManager) {
      window.offerManager.reset();
    }

    if (this.callbacks.item) {
      this.callbacks.item();
      this.callbacks.item = null;
    }
  }

  // Edit mode operations
  editProvider(providerId) {
    this.editingStates.providerId = providerId;
    this.updateModalTitle("providerModalTitle", "Edit Provider");
    this.showModal(this.modals.provider);
  }

  async editItem(itemId) {
    this.editingStates.itemId = itemId;
    this.updateModalTitle("itemModalTitle", "Edit Item");
    
    const allProviders = window.pricingApp.getProviders();
    if (window.offerManager) {
      window.offerManager.setProviders(allProviders);
      await window.offerManager.populateExistingOffers(itemId);
    }
    
    this.showModal(this.modals.item);
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


  // Setters for editing states
  setEditingProviderId(providerId) {
    this.editingStates.providerId = providerId;
  }

  setEditingItemId(itemId) {
    this.editingStates.itemId = itemId;
  }

}

// Create singleton instance
const modalManager = new ModalManager();
