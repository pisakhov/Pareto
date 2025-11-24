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

  showModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.remove("hidden");
    modal.classList.add("flex");
  }

  hideModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.add("hidden");
    modal.classList.remove("flex");
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
    window.tierManager.addTierRow(1, 0);

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
  async showItemModal(callback = null) {
    this.resetItemForm();
    this.editingStates.itemId = null;
    this.updateModalTitle("itemModalTitle", "Add Item");

    // Hide delete button when adding a new item
    const deleteBtn = document.getElementById("itemDeleteBtn");
    if (deleteBtn) {
      deleteBtn.classList.add("hidden");
    }

    await this.loadProcessesIntoDropdown();

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

      // Default select current process if available
      if (window.CURRENT_PROCESS_ID) {
        processSelect.value = window.CURRENT_PROCESS_ID;
        // Trigger change event to update offerManager
        processSelect.dispatchEvent(new Event('change'));

        // Disable the dropdown and show locked label
        processSelect.disabled = true;
        processSelect.classList.add("bg-gray-100", "cursor-not-allowed");

        const processLabel = processSelect.previousElementSibling;
        if (processLabel && processLabel.tagName === 'LABEL') {
          // Find the process name
          const processName = processSelect.options[processSelect.selectedIndex]?.text || 'Current Process';
          processLabel.innerHTML = `Process * <span class="text-xs text-emerald-600 ml-1 font-normal">Locked to ${processName}</span>`;
        }
      }
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

    // Hide delete button when closing modal
    const deleteBtn = document.getElementById("itemDeleteBtn");
    if (deleteBtn) {
      deleteBtn.classList.add("hidden");
    }

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

    // Show delete button when editing an existing item
    const deleteBtn = document.getElementById("itemDeleteBtn");
    if (deleteBtn) {
      deleteBtn.classList.remove("hidden");
    }

    // Get the process ID from offers before loading dropdown
    const offers = await window.dataService.loadOffers();
    const itemOffers = offers.filter(offer => offer.item_id === itemId);
    const processId = itemOffers.length > 0 ? itemOffers[0].process_id : null;



    // Load processes first
    await this.loadProcessesIntoDropdown();

    // NOW set the value after loading (when options exist)
    if (processId) {
      const processSelect = document.getElementById("itemProcess");
      if (processSelect) {
        processSelect.value = processId;

        setTimeout(() => {
          // Timeout for focus management
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

    // Reset toggle to default (Active)
    const statusToggle = document.getElementById("providerStatusToggle");
    const statusInput = document.getElementById("providerStatus");
    const statusLabel = document.getElementById("providerStatusLabel");

    if (statusToggle && statusInput && statusLabel) {
      statusToggle.checked = true;
      statusInput.value = "active";
      statusLabel.textContent = "Active";
    }
  }

  resetItemForm() {
    const form = document.getElementById("itemForm");
    if (form) form.reset();

    // Reset toggle to default (Active)
    const statusToggle = document.getElementById("itemStatusToggle");
    const statusInput = document.getElementById("itemStatus");
    const statusLabel = document.getElementById("itemStatusLabel");

    if (statusToggle && statusInput && statusLabel) {
      statusToggle.checked = true;
      statusInput.value = "active";
      statusLabel.textContent = "Active";
    }

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

  // Update modal title helper
  updateModalTitle(titleElementId, title) {
    const element = document.getElementById(titleElementId);
    if (element) {
      element.textContent = title;
    }
  }

  // Load processes into dropdown
  async loadProcessesIntoDropdown() {
    const select = document.getElementById("itemProcess");
    if (!select || !window.contractsApp) return;

    const processes = window.contractsApp.getProcesses();

    // Clear existing options except the first one
    while (select.children.length > 1) {
      select.removeChild(select.lastChild);
    }

    // Add processes
    processes.forEach(process => {
      const option = document.createElement("option");
      option.value = process.process_id;
      option.textContent = process.process_name;
      select.appendChild(option);
    });
  }

}

// Create singleton instance
const modalManager = new ModalManager();

// Expose global functions for backward compatibility
window.showProviderModal = (callback) => modalManager.showProviderModal(callback);
window.showItemModal = (callback) => modalManager.showItemModal(callback);
window.closeProviderModal = () => modalManager.closeProviderModal();
window.closeItemModal = () => modalManager.closeItemModal();
