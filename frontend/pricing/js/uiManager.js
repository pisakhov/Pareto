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

  // Animation
  addFadeInAnimation() {
    const mainContent = document.querySelector("main");
    if (mainContent) {
      mainContent.style.opacity = "0";
      mainContent.style.transition = "opacity 0.6s ease-in";

      setTimeout(() => {
        mainContent.style.opacity = "1";
      }, 100);
    }
  }

  // Notification system
  updateItemProvidersSelect(allProviders, selectedProviderIds = []) {
    const select = document.getElementById("itemProviders");
    if (!select) return;

    select.innerHTML = ""; // Clear existing options

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

  showNotification(message, type = "info") {
    // Remove any existing notifications
    this.removeExistingNotifications();

    // Create notification element
    const notification = document.createElement("div");
    notification.className = `fixed top-4 right-4 p-4 rounded-md shadow-lg z-50 transition-all duration-300 transform translate-x-full`;

    // Set color based on type
    const colors = {
      success: "bg-green-500 text-white",
      error: "bg-red-500 text-white",
      warning: "bg-yellow-500 text-white",
      info: "bg-blue-500 text-white",
    };

    notification.className += " " + colors[type];
    notification.textContent = message;

    document.body.appendChild(notification);

    // Show notification
    setTimeout(() => {
      notification.classList.remove("translate-x-full");
    }, 100);

    // Hide notification after 3 seconds
    setTimeout(() => {
      notification.classList.add("translate-x-full");
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }

  removeExistingNotifications() {
    const existingNotifications = document.querySelectorAll(
      ".fixed.top-4.right-4.p-4.rounded-md.shadow-lg.z-50",
    );
    existingNotifications.forEach((notification) => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    });
  }

  // Select dropdown management
  updateProviderSelect(providers, currentValue = null) {
    const select = document.getElementById("providerSelect");
    if (!select) return;

    // Save current value if not provided
    if (!currentValue) {
      currentValue = select.value;
    }
    // Clear existing options (except the "new" option)
    select.options.length = 2;

    // Add provider options
    providers.forEach((provider) => {
      const option = document.createElement("option");
      option.value = provider.provider_id;
      option.textContent = provider.company_name;
      if (provider.status !== "active") {
        option.textContent += " (inactive)";
      }
      select.appendChild(option);
    });

    // Restore previous value if it still exists
    if (currentValue && currentValue !== "new") {
      select.value = currentValue;
    }
  }

  updateItemSelect(items, currentValue = null) {
    const select = document.getElementById("itemSelect");
    if (!select) return;

    // Save current value if not provided
    if (!currentValue) {
      currentValue = select.value;
    }

    // Clear existing options (except the "new" option)
    select.options.length = 2;

    // Add item options
    items.forEach((item) => {
      const option = document.createElement("option");
      option.value = item.item_id;
      option.textContent = item.item_name;
      if (item.status !== "active") {
        option.textContent += " (inactive)";
      }
      select.appendChild(option);
    });

    // Restore previous value if it still exists
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

  // Modal utilities
  updateModalTitle(titleId, title) {
    const titleElement = document.getElementById(titleId);
    if (titleElement) {
      titleElement.textContent = title;
    }
  }

  // Data validation helpers
  validateRequiredFields(formData, requiredFields) {
    const missingFields = requiredFields.filter(
      (field) => !formData.get(field) || formData.get(field).trim() === "",
    );

    if (missingFields.length > 0) {
      this.showNotification(
        `Please fill in all required fields: ${missingFields.join(", ")}`,
        "error",
      );
      return false;
    }
    return true;
  }

  validateNumber(value, min = null, max = null, fieldName = "Value") {
    const num = parseFloat(value);

    if (isNaN(num)) {
      this.showNotification(`${fieldName} must be a valid number`, "error");
      return false;
    }

    if (min !== null && num < min) {
      this.showNotification(`${fieldName} must be at least ${min}`, "error");
      return false;
    }

    if (max !== null && num > max) {
      this.showNotification(
        `${fieldName} must be no more than ${max}`,
        "error",
      );
      return false;
    }

    return true;
  }

  validateInteger(value, min = null, max = null, fieldName = "Value") {
    const num = parseInt(value);

    if (isNaN(num)) {
      this.showNotification(`${fieldName} must be a valid integer`, "error");
      return false;
    }

    if (min !== null && num < min) {
      this.showNotification(`${fieldName} must be at least ${min}`, "error");
      return false;
    }

    if (max !== null && num > max) {
      this.showNotification(
        `${fieldName} must be no more than ${max}`,
        "error",
      );
      return false;
    }

    return true;
  }

  // Utility to confirm actions
  confirmAction(message) {
    return confirm(message);
  }

  // Utility to format currency
  formatCurrency(amount) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  }

  // Utility to format numbers
  formatNumber(number, decimals = 0) {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(number);
  }

  // Utility to debounce function calls
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Utility to throttle function calls
  throttle(func, limit) {
    let inThrottle;
    return function () {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  }
}

// Create singleton instance
const uiManager = new UIManager();
