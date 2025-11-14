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

    this.loadProcessesIntoDropdown();

    const allProviders = window.contractsApp.getProviders();
    if (window.offerManager) {
      window.offerManager.setProviders(allProviders);
      window.offerManager.reset();
    }

    // Add event listener for process selection change
    const processSelect = document.getElementById("itemProcess");
    if (processSelect && window.offerManager) {
      // Remove any existing listeners to avoid duplicates
      processSelect.removeEventListener('change', this.handleProcessChangeBound);
      // Bind and store the handler
      this.handleProcessChangeBound = (e) => {
        const processId = parseInt(e.target.value) || null;
        window.offerManager.setProcess(processId);
      };
      processSelect.addEventListener('change', this.handleProcessChangeBound);
    }

    this.showModal(this.modals.item);

    setTimeout(() => {
      document.getElementById("itemProcess")?.focus();
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

    // Get the process ID from offers before loading dropdown
    const offers = await window.dataService.loadOffers();
    const itemOffers = offers.filter(offer => offer.item_id === itemId);
    const processId = itemOffers.length > 0 ? itemOffers[0].process_id : null;

    console.log('[ModalManager] Editing item:', itemId, 'locking to process:', processId);

    // Load processes first
    await this.loadProcessesIntoDropdown();

    // NOW set the value after loading (when options exist)
    if (processId) {
      const processSelect = document.getElementById("itemProcess");
      if (processSelect) {
        console.log('[ModalManager] Setting value to:', processId, 'Available options:', Array.from(processSelect.options).map(opt => `${opt.value}:${opt.text}`));

        processSelect.value = processId;
        console.log('[ModalManager] After set - selectedIndex:', processSelect.selectedIndex, 'value:', processSelect.value);
        console.log('[ModalManager] Selected option text:', processSelect.options[processSelect.selectedIndex]?.text);

        // Double-check the value was set correctly
        setTimeout(() => {
          console.log('[ModalManager] Final check - value:', processSelect.value, 'selectedIndex:', processSelect.selectedIndex);
          console.log('[ModalManager] Final check - Display text:', processSelect.options[processSelect.selectedIndex]?.text);
        }, 10);
      }
    }

    const allProviders = window.contractsApp.getProviders();
    if (window.offerManager) {
      window.offerManager.setProviders(allProviders);
      // Set the process in offerManager before loading existing offers
      window.offerManager.setProcess(processId);
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

    // Re-enable the process field and restore its label
    const processSelect = document.getElementById("itemProcess");
    if (processSelect) {
      processSelect.disabled = false;
      processSelect.classList.remove("bg-gray-100", "cursor-not-allowed");

      // Restore the original label text
      const processLabel = processSelect.previousElementSibling;
      if (processLabel && processLabel.tagName === 'LABEL') {
        processLabel.innerHTML = 'Process *';
      }

      // Reset the process in offerManager
      if (window.offerManager) {
        window.offerManager.setProcess(null);
      }
    }
  }

  async loadProcessesIntoDropdown() {
    const processSelect = document.getElementById("itemProcess");
    console.log('[ModalManager] Before loading - current value:', processSelect.value);

    processSelect.innerHTML = '<option value="">Select a process</option>';

    const processes = await window.contractsApp.getProcesses();
    console.log('[ModalManager] Available processes:', processes.map(p => ({id: p.process_id, name: p.process_name})));

    processes.forEach(process => {
      const option = document.createElement("option");
      option.value = process.process_id;
      option.textContent = process.process_name;
      processSelect.appendChild(option);
    });

    console.log('[ModalManager] After loading - innerHTML:', processSelect.innerHTML);
    console.log('[ModalManager] After loading - selectedIndex:', processSelect.selectedIndex, 'value:', processSelect.value);
  }


  // Helper functions
  updateModalTitle(titleId, title) {
    const titleElement = document.getElementById(titleId);
    if (titleElement) {
      // Check if there's a span inside the title element for the text
      const textSpan = titleElement.querySelector('span[id$="TitleText"]');
      if (textSpan) {
        textSpan.textContent = title;
      } else {
        titleElement.textContent = title;
      }
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
