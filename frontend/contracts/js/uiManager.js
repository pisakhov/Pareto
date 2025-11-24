/**
 * UI Manager - Handles UI utilities, notifications, and state management
 */
class UIManager {
  constructor() {
    this.init();
  }

  init() {
    this.addFadeInAnimation();
  }

  addFadeInAnimation() {
    const mainContent = document.querySelector("main");
    mainContent.style.opacity = "0";
    mainContent.style.transition = "opacity 0.6s ease-in";

    setTimeout(() => {
      mainContent.style.opacity = "1";
    }, 100);
  }

  updateItemProvidersSelect(allProviders, selectedProviderIds = []) {
    const select = document.getElementById("itemProviders");
    select.innerHTML = "";

    allProviders.forEach((provider) => {
      const option = document.createElement("option");
      option.value = provider.provider_id;
      option.textContent = provider.company_name;
      if (selectedProviderIds.includes(provider.provider_id)) {
        option.selected = true;
      }
      select.appendChild(option);
    });
  }

  updateProviderSelect(providers, currentValue = null) {
    const select = document.getElementById("providerSelect");

    if (!currentValue) {
      currentValue = select.value;
    }
    select.options.length = 2;

    providers.forEach((provider) => {
      const option = document.createElement("option");
      option.value = provider.provider_id;
      option.textContent = provider.company_name;
      if (provider.status !== "active") {
        option.textContent += " (inactive)";
      }
      select.appendChild(option);
    });

    if (currentValue && currentValue !== "new") {
      select.value = currentValue;
    }
  }

  updateItemSelect(items, currentValue = null) {
    const select = document.getElementById("itemSelect");

    if (!currentValue) {
      currentValue = select.value;
    }

    select.options.length = 2;

    items.forEach((item) => {
      const option = document.createElement("option");
      option.value = item.item_id;
      option.textContent = item.item_name;
      if (item.status !== "active") {
        option.textContent += " (inactive)";
      }
      select.appendChild(option);
    });

    if (currentValue && currentValue !== "new") {
      select.value = currentValue;
    }
  }

  // Count displays
  updateCounts(providers, items) {
    const providerCount = document.getElementById("providerCount");
    const itemCount = document.getElementById("itemCount");

    if (providerCount) providerCount.textContent = providers.length;
    if (itemCount) itemCount.textContent = items.length;
  }

  // Loading states
  setButtonLoading(button, loadingText) {
    if (button) {
      button.textContent = loadingText;
      button.disabled = true;
    }
  }

  restoreButton(button, originalText) {
    if (button) {
      button.textContent = originalText;
      button.disabled = false;
    }
  }

  // Form utilities
  resetForm(formId) {
    const form = document.getElementById(formId);
    if (form) {
      form.reset();
    }
  }

  focusFirstInput(formId) {
    setTimeout(() => {
      const form = document.getElementById(formId);
      if (form) {
        const firstInput = form.querySelector("input, select, textarea");
        if (firstInput) {
          firstInput.focus();
        }
      }
    }, 100);
  }

  confirmAction(message) {
    return confirm(message);
  }

  formatCurrency(amount) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  }

  formatNumber(number, decimals = 0) {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(number);
  }
}

// Create singleton instance
const uiManager = new UIManager();
